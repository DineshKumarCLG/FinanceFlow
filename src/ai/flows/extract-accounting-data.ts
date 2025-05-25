'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting accounting data from documents.
 *
 * - extractAccountingData - A function that handles the extraction of accounting data from uploaded documents.
 * - ExtractAccountingDataInput - The input type for the extractAccountingData function.
 * - ExtractAccountingDataOutput - The return type for the extractAccountingData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractAccountingDataInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      'A document (receipt, bill, invoice) as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type ExtractAccountingDataInput = z.infer<typeof ExtractAccountingDataInputSchema>;

const AccountingEntrySchema = z.object({
  date: z.string().describe('The date of the transaction (YYYY-MM-DD).'),
  description: z.string().describe('A description of the transaction.'),
  debitAccount: z.string().describe('The account to debit.'),
  creditAccount: z.string().describe('The account to credit.'),
  amount: z.number().describe('The amount of the transaction.'),
});

const ExtractAccountingDataOutputSchema = z.object({
  entries: z.array(AccountingEntrySchema).describe('The extracted accounting entries.'),
});
export type ExtractAccountingDataOutput = z.infer<typeof ExtractAccountingDataOutputSchema>;

export async function extractAccountingData(input: ExtractAccountingDataInput): Promise<ExtractAccountingDataOutput> {
  return extractAccountingDataFlow(input);
}

const extractAccountingDataPrompt = ai.definePrompt({
  name: 'extractAccountingDataPrompt',
  input: {schema: ExtractAccountingDataInputSchema},
  output: {schema: ExtractAccountingDataOutputSchema},
  prompt: `You are an expert accounting assistant. Your task is to extract accounting entries from a document.

  Analyze the document provided in the image to identify the relevant information, and create accounting entries.

  The document is provided as a data URI:
  {{media url=documentDataUri}}

  Return the extracted accounting entries in JSON format.
  Each entry should include the date, description, debit account, credit account, and amount.
  The date should be in YYYY-MM-DD format.
  The amount should be a number.
`,
});

const extractAccountingDataFlow = ai.defineFlow(
  {
    name: 'extractAccountingDataFlow',
    inputSchema: ExtractAccountingDataInputSchema,
    outputSchema: ExtractAccountingDataOutputSchema,
  },
  async input => {
    const {output} = await extractAccountingDataPrompt(input);
    return output!;
  }
);
