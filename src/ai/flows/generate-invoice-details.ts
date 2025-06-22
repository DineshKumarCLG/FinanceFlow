
'use server';
/**
 * @fileOverview Generates structured invoice details from a textual description.
 * This flow is designed to be robust, using a powerful model and a clear prompt with examples,
 * combined with comprehensive post-processing to ensure accuracy and completeness.
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';
import { addDays, lastDayOfMonth } from 'date-fns';
import { format } from 'date-fns';


const GenerateInvoiceDetailsInputSchema = z.object({
  description: z.string().describe('A textual description of the invoice, e.g., "Invoice Client Corp for 10 hours of consulting at $50/hour and 2 licenses for Product X at $100 each, due in 30 days, project XYZ. Send to client@example.com, billing address: 123 Main St, Anytown. Shipping to 456 Oak Ave."'),
});
export type GenerateInvoiceDetailsInput = z.infer<typeof GenerateInvoiceDetailsInputSchema>;

const LineItemSchema = z.object({
  description: z.string().describe('Description of the item or service.'),
  quantity: z.coerce.number().min(0.01).optional().default(1),
  unitPrice: z.coerce.number().min(0).optional().default(0),
  amount: z.coerce.number().min(0).optional(),
  hsnSacCode: z.string().optional(),
  gstRate: z.coerce.number().min(0).max(100).optional(),
});

const GenerateInvoiceDetailsOutputSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  customerGstin: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional().describe("YYYY-MM-DD"),
  dueDate: z.string().optional().describe("YYYY-MM-DD"),
  paymentTerms: z.string().optional(),
  lineItems: z.array(LineItemSchema).optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).optional().default('draft'),
  itemsSummary: z.string().optional(),
});
export type GenerateInvoiceDetailsOutput = z.infer<typeof GenerateInvoiceDetailsOutputSchema>;

// PYTHON_REPLACE_START
// This is the main exported function. In a Python backend, this would likely be an API endpoint
// that accepts a text description and returns a structured JSON invoice.
export async function generateInvoiceDetails(input: GenerateInvoiceDetailsInput): Promise<GenerateInvoiceDetailsOutput> {
  return generateInvoiceDetailsFlow(input);
}
// PYTHON_REPLACE_END

const prompt = ai.definePrompt({
  name: 'generateInvoiceDetailsPrompt_v3', // Changed to avoid caching issues
  model: 'googleai/gemini-1.5-flash-latest', // Using a more powerful model for this complex task.
  input: {schema: GenerateInvoiceDetailsInputSchema},
  output: {
    // A slightly simplified schema for the AI to focus on core extraction
    schema: GenerateInvoiceDetailsOutputSchema.omit({ status: true, itemsSummary: true }),
  },
  // PYTHON_REPLACE_START
  // This is the core instruction given to the AI model. It's a "rulebook" style prompt
  // designed for high accuracy in data extraction. A Python implementation would need to
  // construct a similar, detailed prompt to send to the Gemini API.
  prompt: `You are an expert data extraction assistant. Your job is to parse the user's text and extract structured invoice information. Be thorough.

**User's Text:**
"{{{description}}}"

---

**Instructions:**
1.  **Extract All Details:** Go through the text carefully and pull out every piece of information that matches a field in the requested JSON format.
2.  **Line Items:** Identify each distinct service or product. For each one, extract the description, quantity, and unit price. If a global tax rate is mentioned (e.g., "GST @18%"), apply that rate to the \`gstRate\` field for every item.
3.  **Addresses:** Find both billing and shipping addresses.
4.  **Dates:** Extract the invoice date and calculate the due date if terms like "due in 15 days" are present. Format as YYYY-MM-DD.
5.  **Notes Field:** Use the \`notes\` field to capture all other important details like bank account numbers, IFSC codes, UPI IDs, project names, or secondary contact information.
6.  **Numbers:** You MUST strip currency symbols like '₹' or '$' from all numbers.

**Example:**
If the text is "Invoice Client Corp for 10 hours of consulting at $50/hour, due in 30 days. Send to client@example.com. Bank: XYZ, A/C: 123.", the JSON should look like:
{
  "customerName": "Client Corp",
  "customerEmail": "client@example.com",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "paymentTerms": "due in 30 days",
  "lineItems": [
    { "description": "consulting", "quantity": 10, "unitPrice": 50 }
  ],
  "notes": "Bank: XYZ, A/C: 123."
}

Now, process the user's text and generate the complete JSON object.
`,
  // PYTHON_REPLACE_END
});


const generateInvoiceDetailsFlow = ai.defineFlow(
  {
    name: 'generateInvoiceDetailsFlow_v3',
    inputSchema: GenerateInvoiceDetailsInputSchema,
    outputSchema: GenerateInvoiceDetailsOutputSchema,
  },
  async (input: GenerateInvoiceDetailsInput): Promise<GenerateInvoiceDetailsOutput> => {
    // PYTHON_REPLACE_START
    // This is the core logic of the invoice generation flow.
    // In Python, this would be the function that handles the request to the generation endpoint.

    // Step 1: Call the AI model with the defined prompt and the user's input (the text description).
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to return any output. Please try rephrasing your description.");
    }
    
    // Initialize the final output object with a default status.
    let finalOutput = { ...output, status: 'draft' as const, itemsSummary: undefined as (string | undefined) };
    
    // Step 2: Perform robust post-processing on the AI's output.
    // This is a "safety net" to improve the reliability of the extracted data.
    // It handles date calculations, number formatting, and default values.
    // A Python implementation should replicate this business logic to ensure data quality.

    // Part 1: Date processing and validation.
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    
    if (!finalOutput.invoiceDate || !/^\d{4}-\d{2}-\d{2}$/.test(finalOutput.invoiceDate)) {
        // Try to find a date in the text if the AI missed it.
        const dateMatch = input.description.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}/i);
        if (dateMatch) {
            try {
                finalOutput.invoiceDate = format(new Date(dateMatch[0]), 'yyyy-MM-dd');
            } catch(e) {
                finalOutput.invoiceDate = todayISO;
            }
        } else {
            finalOutput.invoiceDate = todayISO;
        }
    }

    // Part 2: Due Date calculation based on keywords like "due in X days".
    if (!finalOutput.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(finalOutput.dueDate)) {
        const invDate = new Date(finalOutput.invoiceDate + 'T00:00:00Z');
        let daysToAdd: number | null = null;
        const daysMatch = input.description.match(/(?:due in|net)\s+(\d+)\s+days/i);
        if (daysMatch) {
            daysToAdd = parseInt(daysMatch[1], 10);
        }
        
        if (daysToAdd !== null) {
            const dueDate = addDays(invDate, daysToAdd);
            finalOutput.dueDate = format(dueDate, 'yyyy-MM-dd');
        } else if (input.description.match(/due end of month|due by EOM/i)) {
            const lastDay = lastDayOfMonth(invDate);
            finalOutput.dueDate = format(lastDay, 'yyyy-MM-dd');
        } else {
           finalOutput.dueDate = undefined;
        }
    }
    
    // Part 3: Line Item processing. Calculate the 'amount' for each line item and apply global GST if found.
    if (finalOutput.lineItems && finalOutput.lineItems.length > 0) {
      finalOutput.lineItems = finalOutput.lineItems.map(item => {
        const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
        const unitPrice = item.unitPrice || 0;
        const amount = parseFloat((quantity * unitPrice).toFixed(2));
        
        // If a line item doesn't have a GST rate, check for a global GST rate in the description.
        if (item.gstRate === undefined || item.gstRate === null) {
            const gstMatch = input.description.match(/GST\s?@\s?(\d{1,2}(?:\.\d{1,2})?)%/i);
            if (gstMatch) {
                item.gstRate = parseFloat(gstMatch[1]);
            }
        }
        
        return { ...item, quantity, unitPrice, amount };
      });
    }
    
    // Part 4: Fallback for notes. If the AI missed bank details, try to find them in the original text.
    if (!finalOutput.notes && input.description.toLowerCase().includes('bank details')) {
      const bankDetailsMatch = input.description.match(/bank details:[\s\S]*/i);
      if(bankDetailsMatch) {
        finalOutput.notes = bankDetailsMatch[0].trim();
      }
    }

    // Step 3: Return the cleaned-up, processed invoice data.
    return finalOutput;
    // PYTHON_REPLACE_END
  }
);
