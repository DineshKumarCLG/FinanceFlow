// use server'

/**
 * @fileOverview Provides AI-suggested tags for ledger entries.
 *
 * - suggestLedgerTags - A function that suggests relevant tags for a given ledger entry description.
 * - SuggestLedgerTagsInput - The input type for the suggestLedgerTags function.
 * - SuggestLedgerTagsOutput - The return type for the suggestLedgerTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLedgerTagsInputSchema = z.object({
  entryDescription: z.string().describe('The description of the ledger entry.'),
});
export type SuggestLedgerTagsInput = z.infer<typeof SuggestLedgerTagsInputSchema>;

const SuggestLedgerTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of suggested tags for the ledger entry.'),
});
export type SuggestLedgerTagsOutput = z.infer<typeof SuggestLedgerTagsOutputSchema>;

export async function suggestLedgerTags(input: SuggestLedgerTagsInput): Promise<SuggestLedgerTagsOutput> {
  return suggestLedgerTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLedgerTagsPrompt',
  input: {schema: SuggestLedgerTagsInputSchema},
  output: {schema: SuggestLedgerTagsOutputSchema},
  prompt: `You are an expert accounting assistant. Given the following description of a ledger entry, suggest relevant tags that can be used to categorize and filter the transaction for better financial analysis. The tags should be short, descriptive, and relevant to the entry.

Description: {{{entryDescription}}}

Suggest 3-5 tags.`,
});

const suggestLedgerTagsFlow = ai.defineFlow(
  {
    name: 'suggestLedgerTagsFlow',
    inputSchema: SuggestLedgerTagsInputSchema,
    outputSchema: SuggestLedgerTagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
