
'use server';
/**
 * @fileOverview Parses accounting entries from text or voice input and generates double-entry journal entries, including GST details.
 *
 * - parseAccountingEntry - A function that handles the parsing of accounting entries.
 * - ParseAccountingEntryInput - The input type for the parseAccountingEntry function.
 * - ParseAccountingEntryOutput - The return type for the parseAccountingEntry function.
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';

const ParseAccountingEntryInputSchema = z.object({
  entryText: z
    .string()
    .describe('The accounting entry text to parse, e.g., "Paid $200 for office supplies including 18% GST"'),
  // gstRegionContext: z.enum(['india', 'other']).optional().describe("The primary GST/VAT region context for parsing tax information. Defaults to 'india' if not provided."),
});

export type ParseAccountingEntryInput = z.infer<typeof ParseAccountingEntryInputSchema>;

const ParseAccountingEntryOutputSchema = z.object({
  date: z.string().describe('The date of the transaction in ISO format (YYYY-MM-DD).'),
  amount: z.number().describe('The total amount of the transaction, including any taxes.'),
  type: z.string().describe('The type of transaction (e.g., expense, income).'),
  purpose: z.string().describe('The purpose of the transaction (e.g., office supplies, rent).'),
  debitAccount: z.string().describe('The debit account for the journal entry.'),
  creditAccount: z.string().describe('The credit account for the journal entry.'),
  description: z.string().describe('A detailed description of the accounting entry. Crucially, this must include the other party\'s name and their GSTIN if it is mentioned in the entryText.'),

  // GST Fields
  taxableAmount: z.number().optional().describe('The amount before tax. If not provided, assume it is the same as `amount` if no tax is specified, or calculate if tax details are present.'),
  gstType: z.enum(['igst', 'cgst-sgst', 'vat', 'none']).optional().describe("Type of GST/VAT. 'none' if no tax is applicable or identified."),
  gstRate: z.number().optional().describe('Overall GST/VAT rate as a percentage (e.g., 18 for 18%).'),
  igstAmount: z.number().optional().describe('Integrated GST amount (for Indian inter-state transactions).'),
  cgstAmount: z.number().optional().describe('Central GST amount (for Indian intra-state transactions).'),
  sgstAmount: z.number().optional().describe('State GST amount (for Indian intra-state transactions).'),
  vatAmount: z.number().optional().describe('Value Added Tax amount (for non-Indian GST/VAT).'),
  hsnSacCode: z.string().optional().describe('HSN (Harmonized System of Nomenclature) or SAC (Services Accounting Code).'),
  partyGstin: z.string().optional().describe('GSTIN of the supplier or recipient, if mentioned.'),
  isInterState: z.boolean().optional().describe('True if the transaction is inter-state (India), false if intra-state. Relevant for IGST vs CGST/SGST.'),
});

export type ParseAccountingEntryOutput = z.infer<typeof ParseAccountingEntryOutputSchema>;

// PYTHON_REPLACE_START
// This is the main exported function that the frontend calls.
// In a Python backend, this would be an API endpoint that accepts a text string (e.g., from voice or text input).
// It processes the string and returns a structured journal entry.
export async function parseAccountingEntry(input: ParseAccountingEntryInput): Promise<ParseAccountingEntryOutput> {
  return parseAccountingEntryFlow(input);
}
// PYTHON_REPLACE_END


const prompt = ai.definePrompt({
  name: 'parseAccountingEntryPrompt',
  input: {schema: ParseAccountingEntryInputSchema},
  output: {schema: ParseAccountingEntryOutputSchema},
  // PYTHON_REPLACE_START
  // This is the core instruction given to the AI model.
  // It tells the AI how to analyze the user's text and extract specific accounting details.
  // The `output.schema` above ensures the AI returns the data in a structured JSON format.
  // A Python implementation would need to construct a similar prompt for the Gemini API.
  prompt: `You are an expert accounting assistant. Your task is to parse accounting entries from user input and generate the corresponding double-entry journal entries, including tax information (GST/VAT).
Assume Indian GST context (IGST for inter-state, CGST & SGST for intra-state) unless specified otherwise or if the currency/details clearly indicate a different region for VAT.

Given the following accounting entry:
{{{entryText}}}

Extract the following:
- Date of transaction.
- Total transaction amount.
- Type of transaction (e.g., expense, income).
- Purpose of the transaction.
- Debit and Credit accounts.
- Detailed description: The description should be comprehensive and include the party's name.

Tax Information (GST/VAT):
- If GST/VAT is mentioned, determine the taxable amount (amount before tax). If total amount is given and GST rate, calculate taxable amount. If only total amount is given and no GST details, assume total amount is taxable amount and no GST.
- Identify the GST/VAT type: 'igst', 'cgst-sgst' (for India), 'vat' (for other regions), or 'none'.
- Determine the overall GST/VAT rate (e.g., 5, 12, 18, 28).
- Calculate IGST, CGST, SGST, or VAT amounts. For 'cgst-sgst', CGST and SGST are typically half of the total GST amount.
- If it's Indian GST, determine if it's 'isInterState' (for IGST) or intra-state (for CGST/SGST).
- Extract HSN/SAC code if mentioned.

**Account Categorization Rules (Very Important):**
- Your primary goal is to categorize transactions into standard, professional accounting accounts. Do not simply use the literal item name from the user's text as the account name.
- **Analyze the item/service and map it to a logical, general accounting category.**
- **Examples:**
    - If the user says "Bought ESP32 sense", the Debit Account should be "Electronic Components" or "R&D Supplies", NOT "ESP32 sense".
    - If the user says "Paid for Figma subscription", the Debit Account should be "Software & Subscriptions", NOT "Figma subscription".
    - If the user says "Paid for office rent", the Debit Account should be "Rent Expense".
    - If the user says "Bought a new laptop", the Debit Account should be "Computer Equipment" (as it's an asset), NOT "New Laptop".
- Use your knowledge of accounting to select the most appropriate standard account. This is critical for generating clean and useful financial statements.

**Account Rules (Crucial):**
- For purchases or payments (e.g., 'paid', 'bought', 'spent'), if a payment source like 'bank', 'cash', or 'company account' is mentioned, it should be the **Credit Account**. The item/service received is the **Debit Account**.
- For sales or income (e.g., 'received', 'sold', 'earned'), the payment destination ('bank', 'cash') is the **Debit Account**, and the service/product sold is the **Credit Account** (e.g., 'Service Revenue').
- If no payment method is specified for a purchase, assume the credit account is 'Accounts Payable'. If no destination is specified for income, assume the debit account is 'Accounts Receivable'.

**CRITICAL INSTRUCTION: Party GSTIN**
- You MUST identify if a Goods and Services Tax Identification Number (GSTIN) is present in the input text.
- If a GSTIN is found (e.g., 'GSTIN: 29ABCDE1234F1Z5'), you MUST extract it and place it in the 'partyGstin' field of the JSON output.
- You MUST also ensure the party's name and their GSTIN are included in the 'description' field for user visibility.
- Example: For input 'Paid to ABC Corp (GSTIN:...)', the output 'description' should be 'Payment to ABC Corp (GSTIN:...)' AND the 'partyGstin' field must be '...'.

**Date Handling Rules (Crucial):**
1. If the entry text explicitly mentions a specific date (e.g., "on July 15th", "last Tuesday", "2023-10-20"), use that exact date.
2. **If a year is not specified in the entry text (e.g., "July 15th"), assume the current calendar year.**
3. If the entry text does NOT mention a specific date at all, or uses vague terms like "recently" without a clear date, you MUST use the *current calendar date* (the date this request is being processed).
4. **Format all dates as YYYY-MM-DD.**
5. **Do NOT default to a generic past date like "2024-01-01" or the literal string "YYYY-MM-DD" for the date field unless that specific date is explicitly mentioned in the input.**

Ensure that the output is a valid JSON object conforming to the ParseAccountingEntryOutputSchema.
`,
  // PYTHON_REPLACE_END
});

const parseAccountingEntryFlow = ai.defineFlow(
  {
    name: 'parseAccountingEntryFlow',
    inputSchema: ParseAccountingEntryInputSchema,
    outputSchema: ParseAccountingEntryOutputSchema,
  },
  async input => {
    // PYTHON_REPLACE_START
    // This is the core logic of the entry parsing flow.
    // In Python, this would be the function that handles the request to the parsing endpoint.

    // Step 1: Call the AI model with the defined prompt and the user's input (the entry text).
    const {output} = await prompt(input);
    let finalOutput = { ...output };
    
    // Step 2: Code-based post-processing "safety net" for account classification.
    // This block inspects the original text and overrides the AI's classification if necessary,
    // ensuring key rules are always followed for more reliable dashboard reporting.
    const lowerEntryText = input.entryText.toLowerCase();

    // Rule for purchases/payments (affects the credit account)
    const purchaseKeywords = ['paid', 'bought', 'spent', 'purchased', 'buy'];
    const isPurchase = purchaseKeywords.some(kw => lowerEntryText.includes(kw));
    if (isPurchase) {
      const bankKeywords = ['bank', 'company account', 'account'];
      const cashKeywords = ['cash'];
      
      if (bankKeywords.some(kw => lowerEntryText.includes(kw))) {
        finalOutput.creditAccount = 'Bank Account'; // Standardize
      } else if (cashKeywords.some(kw => lowerEntryText.includes(kw))) {
        finalOutput.creditAccount = 'Cash'; // Standardize
      } else if (!finalOutput.creditAccount || !finalOutput.creditAccount.toLowerCase().includes('payable')) {
        // If no payment method is mentioned, and the AI didn't already determine it's on credit,
        // check if it's a known payment type. If not, default to Accounts Payable.
        const creditLower = finalOutput.creditAccount.toLowerCase();
        if (!creditLower.includes('cash') && !creditLower.includes('bank')) {
           finalOutput.creditAccount = 'Accounts Payable';
        }
      }
    }
    
    // Rule for income (affects the debit account)
    const incomeKeywords = ['received', 'sold', 'earned', 'deposit'];
    const isIncome = incomeKeywords.some(kw => lowerEntryText.includes(kw));
    if (isIncome) {
      const bankKeywords = ['bank', 'company account', 'account'];
      const cashKeywords = ['cash'];

      if (bankKeywords.some(kw => lowerEntryText.includes(kw))) {
          finalOutput.debitAccount = 'Bank Account'; // Standardize
      } else if (cashKeywords.some(kw => lowerEntryText.includes(kw))) {
          finalOutput.debitAccount = 'Cash'; // Standardize
      } else if (!finalOutput.debitAccount || !finalOutput.debitAccount.toLowerCase().includes('receivable')) {
        // If no payment destination is mentioned and AI didn't identify it's on credit,
        // check if it's a known cash/bank type. If not, default to Accounts Receivable.
        const debitLower = finalOutput.debitAccount.toLowerCase();
        if (!debitLower.includes('cash') && !debitLower.includes('bank')) {
           finalOutput.debitAccount = 'Accounts Receivable';
        }
      }
    }


    // Step 3: Perform robust post-processing on the AI's output for dates and taxes.
    // This is a crucial "safety net" to improve data quality.
    // A Python implementation should replicate this business logic.

    // Part 1: Date correction.
    // This logic corrects cases where the AI might hallucinate a year (e.g., its training year)
    // when the user didn't specify one. It also handles invalid date formats.
    let processedDate = finalOutput.date;
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    const yearRegex = /\b(19|20)\d{2}\b/;
    const yearMentionedInInput = yearRegex.test(input.entryText);
    const aiYear = finalOutput.date ? parseInt(finalOutput.date.substring(0, 4), 10) : null;
    const currentYear = today.getFullYear();
    
    const isValidDateString = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());

    if (aiYear && aiYear !== currentYear && !yearMentionedInInput) {
        try {
            const dateWithCurrentYear = new Date(finalOutput.date);
            dateWithCurrentYear.setFullYear(currentYear);
            processedDate = dateWithCurrentYear.toISOString().split('T')[0];
        } catch(e) {
            processedDate = todayISO;
        }
    } else if (!processedDate || !isValidDateString(processedDate)) {
        processedDate = todayISO;
    }
    
    finalOutput.date = processedDate;

    // Part 2: GST and Taxable Amount calculations.
    if (finalOutput.gstType === 'cgst-sgst' && finalOutput.gstRate && finalOutput.taxableAmount) {
        const totalGstOnTaxable = finalOutput.taxableAmount * (finalOutput.gstRate / 100);
        if (!finalOutput.cgstAmount && !finalOutput.sgstAmount && (finalOutput.igstAmount === undefined || finalOutput.igstAmount === 0)) {
            finalOutput.cgstAmount = parseFloat((totalGstOnTaxable / 2).toFixed(2));
            finalOutput.sgstAmount = parseFloat((totalGstOnTaxable / 2).toFixed(2));
        }
    } else if (finalOutput.gstType === 'igst' && finalOutput.gstRate && finalOutput.taxableAmount) {
        if (!finalOutput.igstAmount && (finalOutput.cgstAmount === undefined || finalOutput.cgstAmount === 0) && (finalOutput.sgstAmount === undefined || finalOutput.sgstAmount === 0) ) {
            finalOutput.igstAmount = parseFloat((finalOutput.taxableAmount * (finalOutput.gstRate / 100)).toFixed(2));
        }
    } else if (finalOutput.gstType === 'vat' && finalOutput.gstRate && finalOutput.taxableAmount) {
         if (!finalOutput.vatAmount) {
            finalOutput.vatAmount = parseFloat((finalOutput.taxableAmount * (finalOutput.gstRate / 100)).toFixed(2));
        }
    }
    
    if (!finalOutput.taxableAmount && finalOutput.amount && finalOutput.gstRate && finalOutput.gstType !== 'none') {
        finalOutput.taxableAmount = parseFloat((finalOutput.amount / (1 + finalOutput.gstRate / 100)).toFixed(2));
    } else if (!finalOutput.taxableAmount && finalOutput.amount) {
        finalOutput.taxableAmount = finalOutput.amount;
    }
    if (finalOutput.gstType === 'none' || !finalOutput.gstRate) {
        finalOutput.taxableAmount = finalOutput.amount;
    }

    // Step 4: Return the cleaned-up, processed entry data.
    return finalOutput;
    // PYTHON_REPLACE_END
  }
);

    
