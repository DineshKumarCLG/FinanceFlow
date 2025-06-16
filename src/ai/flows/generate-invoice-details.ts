
'use server';
/**
 * @fileOverview Generates structured invoice details from a textual description.
 *
 * - generateInvoiceDetails - A function that handles parsing invoice descriptions.
 * - GenerateInvoiceDetailsInput - The input type for the function.
 * - GenerateInvoiceDetailsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInvoiceDetailsInputSchema = z.object({
  description: z.string().describe('A textual description of the invoice, e.g., "Invoice Client Corp for 10 hours of consulting at $50/hour, due in 30 days, project XYZ."'),
});
export type GenerateInvoiceDetailsInput = z.infer<typeof GenerateInvoiceDetailsInputSchema>;

const GenerateInvoiceDetailsOutputSchema = z.object({
  customerName: z.string().optional().describe('The name of the customer or client.'),
  totalAmount: z.number().optional().describe('The total amount of the invoice. If a rate and quantity are given, calculate this.'),
  invoiceDate: z.string().optional().describe("The date of the invoice (YYYY-MM-DD). If not specified, use today's date."),
  dueDate: z.string().optional().describe("The due date for the invoice (YYYY-MM-DD). Calculate if terms like 'Net 30' or 'due in 30 days' are mentioned relative to the invoice date."),
  itemsSummary: z.string().optional().describe('A brief textual summary of the items or services being invoiced.'),
  // Future enhancements: customerGstin, lineItems array, etc.
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
- Total Amount: The final amount due on the invoice. If a quantity and rate are provided (e.g., "10 hours at $50/hour"), calculate the total amount.
- Invoice Date: The date the invoice is issued. If no date is mentioned, use today's date. Format as YYYY-MM-DD.
- Due Date: The date the payment is due. If terms like "Net 30", "due in 15 days", or "payment by end of month" are mentioned, calculate this relative to the invoice date. Format as YYYY-MM-DD. If no due date or terms are mentioned, you can leave this blank or suggest a common term like "Net 30".
- Items Summary: A concise text summary of what is being invoiced (e.g., "Consulting services for Project XYZ", "Sale of 5 widgets"). Do not attempt to create structured line items yet.

**Date Handling Rules (Crucial):**
1. For Invoice Date: If the description explicitly mentions a specific date for the invoice itself (e.g., "invoice dated July 20th"), use that exact date. If no specific invoice date is mentioned, you MUST use the *current calendar date* (the date this request is being processed) as the invoiceDate.
2. For Due Date: Calculate based on terms from the invoice date. If "Net 30" or "due in 30 days", add 30 days to invoiceDate. If "due end of month", set to the last day of the invoiceDate's month. If no terms, suggest a 30-day due date or leave blank if uncertain.
3. **Format all dates as YYYY-MM-DD.**
4. **Do NOT default to a generic past date like "2024-01-01" for dates unless that specific date is explicitly mentioned in the input.**

Ensure the output is a valid JSON object conforming to the GenerateInvoiceDetailsOutputSchema.
If a field cannot be determined, omit it from the output or set to null where appropriate based on the schema.
`,
});

const generateInvoiceDetailsFlow = ai.defineFlow(
  {
    name: 'generateInvoiceDetailsFlow',
    inputSchema: GenerateInvoiceDetailsInputSchema,
    outputSchema: GenerateInvoiceDetailsOutputSchema,
  },
  async (input: GenerateInvoiceDetailsInput) => {
    const {output} = await prompt(input);
    
    let processedInvoiceDate = output.invoiceDate;
    const today = new Date().toISOString().split('T')[0];

    // This regex is used to check if any date-like pattern is mentioned in the input.
    // If not, and the AI returns a placeholder or unusual date, we default to today.
    const dateMentionRegex = new RegExp(
      '\\b(?:invoice dated |dated |on )?(\\d{1,2}(?:st|nd|rd|th)?(?: of)? (?:january|february|march|april|may|june|july|august|september|october|november|december)|' +
      'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.? (?:\\d{1,2}(?:st|nd|rd|th)?)?|' +
      '\\d{4}-\\d{2}-\\d{2}|' +
      '\\d{1,2}/\\d{1,2}/\\d{2,4}' + // Corrected: Removed the erroneous closing parenthesis from the end of this line
      '\\b', // The word boundary should be the end of the pattern string here.
      'i'
    );
    const noInvoiceDateExplicitlyMentioned = !dateMentionRegex.test(input.description.toLowerCase());

    if (output.invoiceDate === "YYYY-MM-DD" || (noInvoiceDateExplicitlyMentioned && output.invoiceDate && !/^\d{4}-\d{2}-\d{2}$/.test(output.invoiceDate) && output.invoiceDate !== today) ) {
      processedInvoiceDate = today;
    } else if (output.invoiceDate && !/^\d{4}-\d{2}-\d{2}$/.test(output.invoiceDate)) {
      // If AI returns a non-standard date, try to parse it or default to today
      try {
        processedInvoiceDate = new Date(output.invoiceDate).toISOString().split('T')[0];
         if (processedInvoiceDate === "1970-01-01" && output.invoiceDate !== "1970-01-01") { // Date constructor failed
            processedInvoiceDate = today;
         }
      } catch (e) {
        console.warn(`AI returned invoiceDate '${output.invoiceDate}' which is not in YYYY-MM-DD format. Input was: "${input.description}". Defaulting to today: ${today}.`);
        processedInvoiceDate = today;
      }
    }
    
    let finalOutput = { ...output, invoiceDate: processedInvoiceDate };

    // Basic due date calculation if invoice date is now set
    if (finalOutput.invoiceDate && !finalOutput.dueDate) {
        // Example: if description contains "Net 30" or "due in 30 days"
        if (input.description.match(/\b(Net ?30|due in 30 days)\b/i)) {
            const invDate = new Date(finalOutput.invoiceDate);
            invDate.setDate(invDate.getDate() + 30);
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

