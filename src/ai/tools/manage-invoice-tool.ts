
'use server';
/**
 * @fileOverview AI tool for managing invoices (creating and updating).
 * This tool allows the AI assistant to interact with the invoice data service.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateInvoiceDetails, type GenerateInvoiceDetailsOutput, type GenerateInvoiceDetailsInput } from '@/ai/flows/generate-invoice-details';
import { addInvoice, updateInvoice, type NewInvoiceData, type UpdateInvoiceData, type InvoiceLineItem as DataServiceLineItem, getInvoiceById } from '@/lib/data-service';
import { format, parseISO } from 'date-fns';

// Re-using the schema from generate-invoice-details for consistency, with some additions.
const InvoiceDetailsForToolSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  customerGstin: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional().describe("YYYY-MM-DD format. If not provided, use today."),
  dueDate: z.string().optional().describe("YYYY-MM-DD format."),
  paymentTerms: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().describe('Description of the item or service.'),
    quantity: z.coerce.number().min(0.01).optional().default(1),
    unitPrice: z.coerce.number().min(0).optional().default(0),
    amount: z.coerce.number().min(0).optional().describe('Taxable amount (quantity * unitPrice). If not provided, it will be calculated.'),
    hsnSacCode: z.string().optional(),
    gstRate: z.coerce.number().min(0).max(100).optional(),
  })).optional(),
  itemsSummary: z.string().optional().describe('A brief textual summary if structured line items are not available.'),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).optional().default('draft'),
});

const ManageInvoiceInputSchema = z.object({
  action: z.enum(['create', 'update']).describe("Whether to create a new invoice or update an existing one."),
  companyId: z.string().describe("The ID of the company for which the invoice is being managed."),
  creatorUserId: z.string().describe("The ID of the user performing the action."), // Added creatorUserId
  invoiceId: z.string().optional().describe("The ID of the invoice to update (required if action is 'update')."),
  textDescription: z.string().optional().describe("Full natural language description of the invoice provided by the user. The tool will parse this if direct details are not sufficient."),
  invoiceDetails: InvoiceDetailsForToolSchema.optional().describe("Pre-structured details for the invoice. If textDescription is also provided, this can be used as a base and textDescription can augment it."),
});
export type ManageInvoiceInput = z.infer<typeof ManageInvoiceInputSchema>;

const ManageInvoiceOutputSchema = z.object({
  success: z.boolean().describe("Whether the operation was successful."),
  message: z.string().describe("A summary message of the outcome."),
  invoiceId: z.string().optional().describe("The ID of the created or updated invoice."),
  invoiceNumber: z.string().optional().describe("The number of the created or updated invoice."),
});
export type ManageInvoiceOutput = z.infer<typeof ManageInvoiceOutputSchema>;


// Helper function to map GenerateInvoiceDetailsOutput to NewInvoiceData/UpdateInvoiceData
const mapAiOutputToInvoiceData = (
  aiOutput: GenerateInvoiceDetailsOutput,
  currentInvoiceNumber?: string // For updates, preserve existing invoice number if not changed by AI
): Omit<NewInvoiceData, 'companyId' | 'creatorUserId'> => {

  const lineItems: DataServiceLineItem[] = (aiOutput.lineItems || []).map(item => {
     const quantity = item.quantity || 1;
     const unitPrice = item.unitPrice || 0;
     return {
        description: item.description,
        quantity: quantity,
        unitPrice: unitPrice,
        amount: parseFloat((quantity * unitPrice).toFixed(2)), // Ensure this is calculated
        hsnSacCode: item.hsnSacCode,
        gstRate: item.gstRate,
     };
  });

  let subTotal = 0;
  let totalGstAmount = 0;
  lineItems.forEach(item => {
    subTotal += item.amount;
    if (item.gstRate && typeof item.gstRate === 'number') {
      totalGstAmount += item.amount * (item.gstRate / 100);
    }
  });

  subTotal = parseFloat(subTotal.toFixed(2));
  totalGstAmount = parseFloat(totalGstAmount.toFixed(2));
  const totalAmount = parseFloat((subTotal + totalGstAmount).toFixed(2));

  const today = new Date();
  let finalInvoiceDate = aiOutput.invoiceDate;
  if (!finalInvoiceDate || !/^\d{4}-\d{2}-\d{2}$/.test(finalInvoiceDate)) {
    finalInvoiceDate = format(today, "yyyy-MM-dd");
  } else {
     try {
        parseISO(finalInvoiceDate); // Validate date format
     } catch (e) {
        finalInvoiceDate = format(today, "yyyy-MM-dd");
     }
  }
  
  let finalDueDate = aiOutput.dueDate;
  if (finalDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(finalDueDate)) {
     try {
        parseISO(finalDueDate);
     } catch (e) {
        finalDueDate = undefined;
     }
  }


  return {
    invoiceNumber: aiOutput.invoiceNumber || currentInvoiceNumber || `INV-${Date.now()}`, // Generate a basic one if missing
    customerName: aiOutput.customerName || 'N/A',
    customerEmail: aiOutput.customerEmail,
    billingAddress: aiOutput.billingAddress,
    shippingAddress: aiOutput.shippingAddress,
    customerGstin: aiOutput.customerGstin,
    invoiceDate: finalInvoiceDate,
    dueDate: finalDueDate,
    paymentTerms: aiOutput.paymentTerms,
    lineItems: lineItems.length > 0 ? lineItems : undefined,
    itemsSummary: lineItems.length === 0 ? (aiOutput.itemsSummary || undefined) : undefined,
    subTotal,
    totalGstAmount,
    totalAmount,
    status: aiOutput.status || 'draft',
    notes: aiOutput.notes,
  };
};


export const manageInvoiceTool = ai.defineTool(
  {
    name: 'manageInvoiceTool',
    description: 'Creates or updates an invoice. If a textDescription is provided, it will be parsed to extract invoice details. Explicit invoiceDetails will override or supplement parsed details.',
    inputSchema: ManageInvoiceInputSchema,
    outputSchema: ManageInvoiceOutputSchema,
  },
  async (input: ManageInvoiceInput): Promise<ManageInvoiceOutput> => {
    let structuredDetails: GenerateInvoiceDetailsOutput;

    if (!input.companyId) {
      return { success: false, message: "Error: Company ID is required to manage an invoice." };
    }
    if (!input.creatorUserId) { // Check for creatorUserId
      return { success: false, message: "Error: User ID is required to manage an invoice." };
    }

    // 1. Determine structured details
    if (input.textDescription) {
      try {
        const genInput: GenerateInvoiceDetailsInput = { description: input.textDescription };
        structuredDetails = await generateInvoiceDetails(genInput);

        if (input.invoiceDetails) {
          structuredDetails = {
            ...structuredDetails, 
            ...input.invoiceDetails, 
            lineItems: input.invoiceDetails.lineItems && input.invoiceDetails.lineItems.length > 0
                       ? input.invoiceDetails.lineItems
                       : structuredDetails.lineItems,
          };
        }
      } catch (e: any) {
        console.error("Error parsing textDescription in manageInvoiceTool:", e);
        return { success: false, message: `Failed to parse invoice description: ${e.message}` };
      }
    } else if (input.invoiceDetails) {
      structuredDetails = input.invoiceDetails as GenerateInvoiceDetailsOutput;
       if (!structuredDetails.invoiceDate) {
          structuredDetails.invoiceDate = format(new Date(), "yyyy-MM-dd");
       }

    } else {
      return { success: false, message: "Either textDescription or structured invoiceDetails must be provided." };
    }

    if (!structuredDetails.customerName && !structuredDetails.itemsSummary && !(structuredDetails.lineItems && structuredDetails.lineItems.length > 0)) {
        return { success: false, message: "Insufficient details provided to create an invoice. Customer name and items are typically required."};
    }

    // 2. Perform action
    try {
      if (input.action === 'create') {
        const newInvoiceData = mapAiOutputToInvoiceData(structuredDetails);
        // Pass companyId and creatorUserId to addInvoice
        const savedInvoice = await addInvoice(input.companyId, input.creatorUserId, newInvoiceData);
        return {
          success: true,
          message: `Successfully created invoice #${savedInvoice.invoiceNumber}.`,
          invoiceId: savedInvoice.id,
          invoiceNumber: savedInvoice.invoiceNumber,
        };
      } else if (input.action === 'update') {
        if (!input.invoiceId) {
          return { success: false, message: "Invoice ID is required for updates." };
        }
        const existingInvoice = await getInvoiceById(input.companyId, input.invoiceId);
        let existingInvoiceNumber = existingInvoice?.invoiceNumber;

        const updatedInvoiceData = mapAiOutputToInvoiceData(structuredDetails, existingInvoiceNumber);
        // Pass companyId, invoiceId, creatorUserId (though updateInvoice might not use creatorUserId for auth, but for consistency)
        const savedInvoice = await updateInvoice(input.companyId, input.invoiceId, input.creatorUserId, updatedInvoiceData);
        return {
          success: true,
          message: `Successfully updated invoice #${savedInvoice.invoiceNumber}.`,
          invoiceId: savedInvoice.id,
          invoiceNumber: savedInvoice.invoiceNumber,
        };
      }
      return { success: false, message: "Invalid action specified." };
    } catch (e: any) {
      console.error(`Error during invoice ${input.action}:`, e);
      return { success: false, message: `Failed to ${input.action} invoice: ${e.message}` };
    }
  }
);
