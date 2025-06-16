
'use server';
/**
 * @fileOverview Parses accounting entries from text or voice input and generates double-entry journal entries.
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
    .describe('The accounting entry text to parse, e.g., \"Paid $200 for office supplies\"'),
});

export type ParseAccountingEntryInput = z.infer<typeof ParseAccountingEntryInputSchema>;

const ParseAccountingEntryOutputSchema = z.object({
  date: z.string().describe('The date of the transaction in ISO format (YYYY-MM-DD).'),
  amount: z.number().describe('The amount of the transaction.'),
  type: z.string().describe('The type of transaction (e.g., expense, income).'),
  purpose: z.string().describe('The purpose of the transaction (e.g., office supplies, rent).'),
  debitAccount: z.string().describe('The debit account for the journal entry.'),
  creditAccount: z.string().describe('The credit account for the journal entry.'),
  description: z.string().describe('A detailed description of the accounting entry.'),
});

export type ParseAccountingEntryOutput = z.infer<typeof ParseAccountingEntryOutputSchema>;

export async function parseAccountingEntry(input: ParseAccountingEntryInput): Promise<ParseAccountingEntryOutput> {
  return parseAccountingEntryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseAccountingEntryPrompt',
  input: {schema: ParseAccountingEntryInputSchema},
  output: {schema: ParseAccountingEntryOutputSchema},
  prompt: `You are an expert accounting assistant. Your task is to parse accounting entries from user input and generate the corresponding double-entry journal entries.

  Given the following accounting entry:
  {{{entryText}}}

  Extract the date, amount, type, and purpose of the transaction. Then, determine the appropriate debit and credit accounts for the journal entry. Provide a detailed description of the entry.

  **Date Handling Rules (Crucial):**
  1. If the entry text explicitly mentions a specific date (e.g., "on July 15th", "last Tuesday", "2023-10-20"), use that exact date.
  2. If the entry text does NOT mention a specific date, or uses vague terms like "recently" or "a while ago" without a clear date, you MUST use the *current calendar date* (the date this request is being processed).
  3. **Format all dates as YYYY-MM-DD.**
  4. **Do NOT default to a generic past date like "2024-01-01" or the literal string "YYYY-MM-DD" for the date field unless that specific date is explicitly mentioned in the input.**

  Ensure that the output is a valid JSON object conforming to the ParseAccountingEntryOutputSchema.

  Example of expected output format (replace values as appropriate):
  Output: {
    "date": "YYYY-MM-DD",
    "amount": 123.45,
    "type": "expense",
    "purpose": "office supplies",
    "debitAccount": "Office Supplies Expense",
    "creditAccount": "Cash",
    "description": "Paid for office supplies"
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

    // Regular expression to check if any form of date is mentioned in the input.
    // This is a basic check and might need refinement for more complex date expressions.
    const dateMentionRegex = new RegExp(
      '\\b(\\d{1,2}(?:st|nd|rd|th)?(?: of)? (?:january|february|march|april|may|june|july|august|september|october|november|december)|' + // e.g., 1st of January, july 4th
      'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.? (?:\\d{1,2}(?:st|nd|rd|th)?)?|' + // e.g., jan 15, Dec. 25th
      '\\d{4}-\\d{2}-\\d{2}|' + // YYYY-MM-DD
      '\\d{1,2}/\\d{1,2}/\\d{2,4}|' + // MM/DD/YYYY or DD/MM/YYYY
      'yesterday|today|tomorrow|last week|next month' + // relative terms
      ')\\b', 'i'
    );
    const noDateExplicitlyMentioned = !dateMentionRegex.test(input.entryText.toLowerCase());

    // If the AI returns the literal placeholder "YYYY-MM-DD" from the prompt example,
    // or if no date was mentioned in the input text AND the AI returned a known bad default (like "2024-01-01"),
    // then override with today's actual date.
    if (output.date === "YYYY-MM-DD" || (noDateExplicitlyMentioned && output.date === "2024-01-01")) {
      processedDate = today;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(output.date)) {
      // If the date is not in YYYY-MM-DD format and wasn't caught above,
      // it indicates an AI error in formatting or date determination. Default to today.
      console.warn(`AI returned date '${output.date}' which is not in YYYY-MM-DD format or is an unexpected value. Input was: "${input.entryText}". Defaulting to today: ${today}.`);
      processedDate = today;
    }
    
    return {...output!, date: processedDate};
  }
);

