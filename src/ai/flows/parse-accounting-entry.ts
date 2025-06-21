
'use server';
/**
 * @fileOverview Parses accounting entries from text or voice input and generates double-entry journal entries, including GST details.
 *
 * - parseAccountingEntry - A function that handles the parsing of accounting entries.
 * - ParseAccountingEntryInput - The input type for the parseAccountingEntry function.
 * - ParseAccountingEntryOutput - The return type for the parseAccountingEntry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  description: z.string().describe('A detailed description of the accounting entry.'),

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

export async function parseAccountingEntry(input: ParseAccountingEntryInput): Promise<ParseAccountingEntryOutput> {
  return parseAccountingEntryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseAccountingEntryPrompt',
  input: {schema: ParseAccountingEntryInputSchema},
  output: {schema: ParseAccountingEntryOutputSchema},
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
- Detailed description.

Tax Information (GST/VAT):
- If GST/VAT is mentioned, determine the taxable amount (amount before tax). If total amount is given and GST rate, calculate taxable amount. If only total amount is given and no GST details, assume total amount is taxable amount and no GST.
- Identify the GST/VAT type: 'igst', 'cgst-sgst' (for India), 'vat' (for other regions), or 'none'.
- Determine the overall GST/VAT rate (e.g., 5, 12, 18, 28).
- Calculate IGST, CGST, SGST, or VAT amounts. For 'cgst-sgst', CGST and SGST are typically half of the total GST amount.
- If it's Indian GST, determine if it's 'isInterState' (for IGST) or intra-state (for CGST/SGST).
- Extract HSN/SAC code if mentioned.
- Extract Party GSTIN (supplier/customer GST Identification Number) if mentioned.

**Date Handling Rules (Crucial):**
1. If the entry text explicitly mentions a specific date (e.g., "on July 15th", "last Tuesday", "2023-10-20"), use that exact date.
2. If the entry text does NOT mention a specific date, or uses vague terms like "recently" or "a while ago" without a clear date, you MUST use the *current calendar date* (the date this request is being processed).
3. **Format all dates as YYYY-MM-DD.**
4. **Do NOT default to a generic past date like "2024-01-01" or the literal string "YYYY-MM-DD" for the date field unless that specific date is explicitly mentioned in the input.**

Ensure that the output is a valid JSON object conforming to the ParseAccountingEntryOutputSchema.

Example of expected output format (replace values as appropriate):
Output: {
  "date": "YYYY-MM-DD", // Today's date if not specified in input
  "amount": 2360.00, // Total amount
  "type": "expense",
  "purpose": "office supplies",
  "debitAccount": "Office Supplies Expense",
  "creditAccount": "Cash",
  "description": "Paid for office supplies with 18% GST",
  "taxableAmount": 2000.00,
  "gstType": "cgst-sgst", // or "igst" or "vat" or "none"
  "gstRate": 18,
  "cgstAmount": 180.00, // if gstType is 'cgst-sgst'
  "sgstAmount": 180.00, // if gstType is 'cgst-sgst'
  // "igstAmount": 360.00, // if gstType is 'igst'
  // "vatAmount": 360.00, // if gstType is 'vat'
  "hsnSacCode": "998313", // optional
  "partyGstin": "29ABCDE1234F1Z5", // optional
  "isInterState": false // optional, relevant for India
}`,
});

const parseAccountingEntryFlow = ai.defineFlow(
  {
    name: 'parseAccountingEntryFlow',
    inputSchema: ParseAccountingEntryInputSchema,
    outputSchema: ParseAccountingEntryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    let processedDate = output.date;
    const today = new Date().toISOString().split('T')[0];

    const dateMentionRegex = new RegExp(
      '\\b(' + // Start main capturing group
        '(?:' + // Non-capturing group for all wordy date formats
          '(?:' + // Non-capturing group for day-first or month-first
            '(?:\\d{1,2}(?:st|nd|rd|th)?(?: of)? )?' + // Optional day with suffix and "of"
            '(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)' + // Month names
            '[a-z]*\\.?' + // Rest of month name e.g. . in Jan.
            '(?: \\d{1,2}(?:st|nd|rd|th)?)?' + // Optional day at the end
          ')' +
        ')' +
        '|\\d{4}-\\d{2}-\\d{2}' + // YYYY-MM-DD format
        '|\\d{1,2}/\\d{1,2}/\\d{2,4}' + // D/M/Y format
        '|yesterday|today|tomorrow|last week|next month' +
      ')\\b', // End main capturing group
      'i'
    );
    const noDateExplicitlyMentioned = !dateMentionRegex.test(input.entryText.toLowerCase());

    if (output.date === "YYYY-MM-DD" || (noDateExplicitlyMentioned && output.date === "2024-01-01")) {
      processedDate = today;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(output.date)) {
      console.warn(`AI returned date '${output.date}' which is not in YYYY-MM-DD format or is an unexpected value. Input was: "${input.entryText}". Defaulting to today: ${today}.`);
      processedDate = today;
    }
    
    // Post-process to calculate CGST/SGST if gstType is 'cgst-sgst' and individual amounts are missing but total GST can be inferred
    let finalOutput = { ...output, date: processedDate };

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
    
    // Ensure taxable amount is sensible
    if (!finalOutput.taxableAmount && finalOutput.amount && finalOutput.gstRate && finalOutput.gstType !== 'none') {
        finalOutput.taxableAmount = parseFloat((finalOutput.amount / (1 + finalOutput.gstRate / 100)).toFixed(2));
    } else if (!finalOutput.taxableAmount && finalOutput.amount) {
        finalOutput.taxableAmount = finalOutput.amount; // Assume amount is taxable if no tax info
    }
    if (finalOutput.gstType === 'none' || !finalOutput.gstRate) {
        finalOutput.taxableAmount = finalOutput.amount;
    }


    return finalOutput;
  }
);
