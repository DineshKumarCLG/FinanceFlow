
'use server';
/**
 * @fileOverview AI tool for managing invoices (creating and updating).
 * This tool allows the AI assistant to interact with the invoice data service.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generateInvoiceDetails, type GenerateInvoiceDetailsOutput, type GenerateInvoiceDetailsInput } from '@/ai/flows/generate-invoice-details';
import { addInvoice, updateInvoice, type NewInvoiceData, type UpdateInvoiceData, type InvoiceLineItem as DataServiceLineItem, getInvoiceById } from '@/lib/data-service';
import { format, parseISO } from 'date-fns';

// Re-using the schema from generate-invoice-details for consistency, with some additions.
const InvoiceDetailsForToolSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
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
  companyId: z.string().describe("The ID of the company for which the invoice is being managed. This is provided by the system."),
  creatorUserId: z.string().describe("The ID of the user performing the action. This is provided by the system."),
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


// PYTHON_REPLACE_START
// This is a helper function that translates the data structure received from the AI
// into the data structure required by the database service (`data-service.ts`).
// A Python implementation would need a similar mapping function to prepare data for the database.
const mapAiOutputToInvoiceData = (
  aiOutput: GenerateInvoiceDetailsOutput,
  currentInvoiceNumber?: string // For updates, preserve existing invoice number if not changed by AI
): Omit<NewInvoiceData, 'companyId' | 'creatorUserId'> => {

  const lineItems: DataServiceLineItem[] = (aiOutput.lineItems || []).map(item => {
     const quantity = item.quantity || 1;
     const unitPrice = item.unitPrice || 0;
     
     const lineItemForDb: DataServiceLineItem = {
        description: item.description,
        quantity: quantity,
        unitPrice: unitPrice,
        amount: parseFloat((quantity * unitPrice).toFixed(2)), // Ensure this is calculated
     };

     if (item.hsnSacCode !== undefined && item.hsnSacCode !== null && item.hsnSacCode.trim() !== "") {
        lineItemForDb.hsnSacCode = item.hsnSacCode;
     }
     if (item.gstRate !== undefined && item.gstRate !== null) {
        lineItemForDb.gstRate = Number(item.gstRate);
     }
     return lineItemForDb;
  });

  // Calculate totals based on the line items.
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

  // Validate and format dates.
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
        finalDueDate = undefined; // Set to undefined if invalid
     }
  } else if (finalDueDate === null || finalDueDate === "") {
     finalDueDate = undefined; // Ensure null or empty string from AI becomes undefined
  }


  // Return the final, cleaned data object ready for the database.
  return {
    invoiceNumber: aiOutput.invoiceNumber || currentInvoiceNumber || `INV-${Date.now()}`, 
    customerName: aiOutput.customerName || 'N/A',
    customerEmail: aiOutput.customerEmail || undefined,
    billingAddress: aiOutput.billingAddress || undefined,
    shippingAddress: aiOutput.shippingAddress || undefined,
    customerGstin: aiOutput.customerGstin || undefined,
    invoiceDate: finalInvoiceDate,
    dueDate: finalDueDate, // Will be undefined if invalid or not provided
    paymentTerms: aiOutput.paymentTerms || undefined,
    lineItems: lineItems.length > 0 ? lineItems : undefined,
    itemsSummary: lineItems.length === 0 ? (aiOutput.itemsSummary || undefined) : undefined,
    subTotal,
    totalGstAmount,
    totalAmount,
    status: aiOutput.status || 'draft',
    notes: aiOutput.notes || undefined,
  };
};
// PYTHON_REPLACE_END


export const manageInvoiceTool = ai.defineTool(
  {
    name: 'manageInvoiceTool',
    description: 'Creates or updates an invoice. If a textDescription is provided, it will be parsed to extract invoice details. Explicit invoiceDetails will override or supplement parsed details.',
    inputSchema: ManageInvoiceInputSchema,
    outputSchema: ManageInvoiceOutputSchema,
  },
  async (input: ManageInvoiceInput): Promise<ManageInvoiceOutput> => {
    // PYTHON_REPLACE_START
    // This is the core logic for the invoice management tool.
    // In a Python backend, this function would be called when the AI decides to use the "manageInvoiceTool".
    // It would orchestrate parsing the user's text, preparing the data, and calling the database service.
    
    // Step 1: Validate required system-provided inputs.
    if (!input.companyId) {
      return { success: false, message: "Error: Company ID is required to manage an invoice. This should be provided by the system." };
    }
    if (!input.creatorUserId) {
      return { success: false, message: "Error: User ID is required to manage an invoice. This should be provided by the system." };
    }

    let structuredDetails: GenerateInvoiceDetailsOutput;

    // Step 2: Determine the invoice details.
    // If the user provided a text description, parse it using the `generateInvoiceDetails` flow.
    if (input.textDescription) {
      try {
        const genInput: GenerateInvoiceDetailsInput = { description: input.textDescription };
        // This is a key interaction: this tool calls another AI flow to do the parsing.
        structuredDetails = await generateInvoiceDetails(genInput);

        // If the user also provided some structured details, merge them.
        // Explicit details from the user take precedence over AI-parsed details.
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
      // If no text description was provided, use the structured details directly.
      structuredDetails = input.invoiceDetails as GenerateInvoiceDetailsOutput;
       if (!structuredDetails.invoiceDate) {
          structuredDetails.invoiceDate = format(new Date(), "yyyy-MM-dd");
       }
    } else {
      return { success: false, message: "Either textDescription or structured invoiceDetails must be provided." };
    }

    // Add a safety check to ensure the AI extracted something meaningful.
    if (!structuredDetails.customerName && !structuredDetails.itemsSummary && !(structuredDetails.lineItems && structuredDetails.lineItems.length > 0)) {
        return { success: false, message: "Insufficient details provided to create an invoice. Customer name and items are typically required."};
    }


    // Step 3: Perform the requested action (create or update).
    // This is where the application interacts with the database.
    // A Python implementation would replace these calls with its own database logic (e.g., calling a Python-based data service).
    try {
      if (input.action === 'create') {
        // Map the AI output to the database schema.
        const newInvoiceData = mapAiOutputToInvoiceData(structuredDetails);
        // Call the data service to add the new invoice.
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
        // For updates, get the existing invoice to preserve fields like the invoice number.
        const existingInvoice = await getInvoiceById(input.companyId, input.invoiceId);
        let existingInvoiceNumber = existingInvoice?.invoiceNumber;

        // Map the AI output to the database schema.
        const updatedInvoiceData = mapAiOutputToInvoiceData(structuredDetails, existingInvoiceNumber);
        // Call the data service to update the invoice.
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
      // Handle potential errors from the database service, like permission errors.
      console.error(`Error during invoice ${input.action}:`, e);
      if (e.message && e.message.toLowerCase().includes("permission")) {
        return { success: false, message: `Failed to ${input.action} invoice due to a permissions error. This may indicate a problem with Firestore security rules or the server's authentication context.` };
      }
      if (e.message && e.message.toLowerCase().includes("unsupported field value") && e.message.toLowerCase().includes("undefined")) {
        return { success: false, message: `Failed to ${input.action} invoice: One or more fields had an invalid (undefined) value. This can happen if the AI couldn't extract all necessary details or if some optional fields were not correctly handled. Please check the invoice details or try rephrasing your request.` };
      }
      return { success: false, message: `Failed to ${input.action} invoice: ${e.message}` };
    }
    // PYTHON_REPLACE_END
  }
);
