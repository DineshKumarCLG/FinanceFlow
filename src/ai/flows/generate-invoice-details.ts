
'use server';
/**
 * @fileOverview Generates structured invoice details from a textual description, including line items.
 *
 * - generateInvoiceDetails - A function that handles parsing invoice descriptions.
 * - GenerateInvoiceDetailsInput - The input type for the function.
 * - GenerateInvoiceDetailsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInvoiceDetailsInputSchema = z.object({
  description: z.string().describe('A textual description of the invoice, e.g., "Invoice Client Corp for 10 hours of consulting at $50/hour and 2 licenses for Product X at $100 each, due in 30 days, project XYZ."'),
});
export type GenerateInvoiceDetailsInput = z.infer<typeof GenerateInvoiceDetailsInputSchema>;

const LineItemSchema = z.object({
  description: z.string().describe('Description of the item or service.'),
  quantity: z.number().optional().describe('Quantity of the item/service. Default to 1 if not specified.'),
  unitPrice: z.number().optional().describe('Price per unit of the item/service.'),
  amount: z.number().describe('Total amount for this line item (quantity * unitPrice). If not derivable, AI may estimate based on context or overall total.'),
  hsnSacCode: z.string().optional().describe('HSN or SAC code for the item/service, if discernible.'),
  gstRate: z.number().optional().describe('Applicable GST rate for this item as a percentage (e.g., 18 for 18%).'),
});

const GenerateInvoiceDetailsOutputSchema = z.object({
  customerName: z.string().optional().describe('The name of the customer or client.'),
  totalAmount: z.number().optional().describe('The total amount of the invoice. If line items are present, this should be their sum. If only a rate and quantity are given, calculate this.'),
  invoiceDate: z.string().optional().describe("The date of the invoice (YYYY-MM-DD). If not specified, use today's date."),
  dueDate: z.string().optional().describe("The due date for the invoice (YYYY-MM-DD). Calculate if terms like 'Net 30' or 'due in 30 days' are mentioned relative to the invoice date."),
  itemsSummary: z.string().optional().describe('A brief textual summary of the items or services being invoiced. Provide this if structured line items cannot be reliably extracted.'),
  lineItems: z.array(LineItemSchema).optional().describe('An array of structured line items for the invoice. Populate this if the description allows for clear itemization.'),
  // Future enhancements: customerGstin, etc.
});
export type GenerateInvoiceDetailsOutput = z.infer<typeof GenerateInvoiceDetailsOutputSchema>;

export async function generateInvoiceDetails(input: GenerateInvoiceDetailsInput): Promise<GenerateInvoiceDetailsOutput> {
  return generateInvoiceDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInvoiceDetailsPrompt',
  input: {schema: GenerateInvoiceDetailsInputSchema},
  output: {schema: GenerateInvoiceDetailsOutputSchema},
  prompt: `You are an expert assistant that helps create invoices from textual descriptions.
Given the following invoice description:
"{{{description}}}"

Extract the following information:
- Customer Name: The name of the client or company being invoiced.
- Invoice Date: The date the invoice is issued. If no date is mentioned, use today's date. Format as YYYY-MM-DD.
- Due Date: The date the payment is due. If terms like "Net 30", "due in 15 days", or "payment by end of month" are mentioned, calculate this relative to the invoice date. Format as YYYY-MM-DD. If no due date or terms are mentioned, you can leave this blank or suggest a common term like "Net 30".
- Line Items: If the description contains clear itemization (e.g., "10 hours of consulting at $50/hour", "2 widgets at $20 each"), extract each as a structured line item with description, quantity, unitPrice, and calculated amount. Attempt to identify HSN/SAC codes or GST rates if mentioned per item.
- Items Summary: If structured line items cannot be reliably extracted, provide a concise text summary of what is being invoiced (e.g., "Consulting services for Project XYZ", "Sale of 5 widgets").
- Total Amount: The final amount due on the invoice. If line items are extracted, this should be the sum of their amounts. If only a single rate and quantity are provided (e.g., "10 hours at $50/hour"), calculate the total amount.

**Date Handling Rules (Crucial):**
1. For Invoice Date: If the description explicitly mentions a specific date for the invoice itself (e.g., "invoice dated July 20th"), use that exact date. If no specific invoice date is mentioned, you MUST use the *current calendar date* (the date this request is being processed) as the invoiceDate.
2. For Due Date: Calculate based on terms from the invoice date. If "Net 30" or "due in 30 days", add 30 days to invoiceDate. If "due end of month", set to the last day of the invoiceDate's month. If no terms, suggest a 30-day due date or leave blank if uncertain.
3. **Format all dates as YYYY-MM-DD.**
4. **Do NOT default to a generic past date like "2024-01-01" for dates unless that specific date is explicitly mentioned in the input.**

**Line Item Rules:**
- If quantity or unitPrice is not explicitly mentioned for an item but can be inferred, use reasonable defaults (e.g., quantity 1).
- Calculate the 'amount' for each line item (quantity * unitPrice).
- If the description only provides a total amount and a list of items without individual prices, you can try to create one line item with the total amount and list the items in its description, or provide an itemsSummary. Prioritize structured line items if possible.

Ensure the output is a valid JSON object conforming to the GenerateInvoiceDetailsOutputSchema.
If a field cannot be determined, omit it from the output or set to null/empty array where appropriate based on the schema.
Prioritize extracting structured 'lineItems' over 'itemsSummary'. If 'lineItems' are successfully extracted, 'itemsSummary' can be omitted or be a very brief overall title.
If lineItems are present, the top-level totalAmount should be the sum of amounts from lineItems.
`,
});

const generateInvoiceDetailsFlow = ai.defineFlow(
  {
    name: 'generateInvoiceDetailsFlow',
    inputSchema: GenerateInvoiceDetailsInputSchema,
    outputSchema: GenerateInvoiceDetailsOutputSchema,
  },
  async (input: GenerateInvoiceDetailsInput) => {
    let {output} = await prompt(input);
    
    let processedInvoiceDate = output.invoiceDate;
    const today = new Date().toISOString().split('T')[0];

    const dateMentionRegex = new RegExp(
      '\\b(?:invoice dated |dated |on )?(\\d{1,2}(?:st|nd|rd|th)?(?: of)? (?:january|february|march|april|may|june|july|august|september|october|november|december)|' +
      'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.? (?:\\d{1,2}(?:st|nd|rd|th)?)?|' +
      '\\d{4}-\\d{2}-\\d{2}|' +
      '\\d{1,2}/\\d{1,2}/\\d{2,4}' + 
      '\\b',
      'i'
    );
    const noInvoiceDateExplicitlyMentioned = !dateMentionRegex.test(input.description.toLowerCase());

    if (output.invoiceDate === "YYYY-MM-DD" || (noInvoiceDateExplicitlyMentioned && output.invoiceDate && !/^\d{4}-\d{2}-\d{2}$/.test(output.invoiceDate) && output.invoiceDate !== today) ) {
      processedInvoiceDate = today;
    } else if (output.invoiceDate && !/^\d{4}-\d{2}-\d{2}$/.test(output.invoiceDate)) {
      try {
        processedInvoiceDate = new Date(output.invoiceDate).toISOString().split('T')[0];
         if (processedInvoiceDate === "1970-01-01" && output.invoiceDate !== "1970-01-01") { 
            processedInvoiceDate = today;
         }
      } catch (e) {
        console.warn(`AI returned invoiceDate '${output.invoiceDate}' which is not in YYYY-MM-DD format. Input was: "${input.description}". Defaulting to today: ${today}.`);
        processedInvoiceDate = today;
      }
    }
    
    let finalOutput = { ...output, invoiceDate: processedInvoiceDate };

    if (finalOutput.lineItems && finalOutput.lineItems.length > 0) {
      finalOutput.lineItems = finalOutput.lineItems.map(item => ({
        description: item.description || "N/A",
        quantity: item.quantity === undefined || item.quantity === null || item.quantity <= 0 ? 1 : item.quantity,
        unitPrice: item.unitPrice === undefined || item.unitPrice === null ? item.amount || 0 : item.unitPrice, // if unitPrice is missing but amount is there, use amount for unitPrice (assuming qty 1)
        amount: item.amount || 0,
        hsnSacCode: item.hsnSacCode,
        gstRate: item.gstRate,
      }));
      // Recalculate totalAmount from line items if present
      finalOutput.totalAmount = finalOutput.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      // If line items are present, itemsSummary might be redundant or could be a high-level title.
      // For now, if lineItems exist, we can clear itemsSummary or the AI might have already done so.
      // finalOutput.itemsSummary = undefined; // Or let AI decide
    } else if (finalOutput.itemsSummary && !finalOutput.totalAmount) {
      // If only summary and no total, it's hard to guess. AI should provide total.
    }


    // Basic due date calculation if invoice date is now set
    if (finalOutput.invoiceDate && !finalOutput.dueDate) {
        if (input.description.match(/\b(Net ?30|due in 30 days)\b/i)) {
            const invDate = new Date(finalOutput.invoiceDate);
            invDate.setDate(invDate.getDate() + 30);
            finalOutput.dueDate = invDate.toISOString().split('T')[0];
        } else if (input.description.match(/\b(Net ?15|due in 15 days)\b/i)) {
            const invDate = new Date(finalOutput.invoiceDate);
            invDate.setDate(invDate.getDate() + 15);
            finalOutput.dueDate = invDate.toISOString().split('T')[0];
        }
    }
    // Ensure due date is also YYYY-MM-DD if present
    if (finalOutput.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(finalOutput.dueDate)) {
        try {
             const parsedDueDate = new Date(finalOutput.dueDate).toISOString().split('T')[0];
             if (parsedDueDate !== "1970-01-01" || finalOutput.dueDate === "1970-01-01") {
                finalOutput.dueDate = parsedDueDate;
             } else {
                delete finalOutput.dueDate; // Remove invalid due date
             }
        } catch (e) {
            console.warn(`AI returned dueDate '${finalOutput.dueDate}' which is not in YYYY-MM-DD format. Removing.`);
            delete finalOutput.dueDate;
        }
    }

    return finalOutput;
  }
);

