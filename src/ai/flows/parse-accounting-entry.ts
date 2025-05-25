// 'use server'
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
  {{entryText}}

  Extract the date, amount, type, and purpose of the transaction. Then, determine the appropriate debit and credit accounts for the journal entry. Provide a detailed description of the entry.

  Ensure that the output is a valid JSON object conforming to the ParseAccountingEntryOutputSchema. The date must be YYYY-MM-DD.

  Output: {
    "date": "YYYY-MM-DD",
    "amount": amount,
    "type": "expense|income",
    "purpose": "the purpose",
    "debitAccount": "the debit account",
    "creditAccount": "the credit account",
    "description": "the description"
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
    return output!;
  }
);
