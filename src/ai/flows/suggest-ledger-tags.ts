
'use server';

/**
 * @fileOverview Provides AI-suggested tags for ledger entries.
 *
 * - suggestLedgerTags - A function that suggests relevant tags for a given ledger entry description.
 * - SuggestLedgerTagsInput - The input type for the suggestLedgerTags function.
 * - SuggestLedgerTagsOutput - The return type for the suggestLedgerTags function.
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';

const SuggestLedgerTagsInputSchema = z.object({
  entryDescription: z.string().describe('The description of the ledger entry.'),
});
export type SuggestLedgerTagsInput = z.infer<typeof SuggestLedgerTagsInputSchema>;

const SuggestLedgerTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of suggested tags for the ledger entry.'),
});
export type SuggestLedgerTagsOutput = z.infer<typeof SuggestLedgerTagsOutputSchema>;

// PYTHON_REPLACE_START
// This is the main exported function that the frontend calls.
// In a Python backend, this would be an API endpoint that accepts a text description
// and returns a list of suggested string tags.
export async function suggestLedgerTags(input: SuggestLedgerTagsInput): Promise<SuggestLedgerTagsOutput> {
  return suggestLedgerTagsFlow(input);
}
// PYTHON_REPLACE_END


const prompt = ai.definePrompt({
  name: 'suggestLedgerTagsPrompt',
  input: {schema: SuggestLedgerTagsInputSchema},
  output: {schema: SuggestLedgerTagsOutputSchema},
  // PYTHON_REPLACE_START
  // This is the core instruction given to the AI model.
  // It's a simple prompt that asks the AI to suggest 3-5 relevant tags for a given transaction description.
  // A Python implementation would construct a similar prompt for the Gemini API.
  prompt: `You are an expert accounting assistant. Given the following description of a ledger entry, suggest relevant tags that can be used to categorize and filter the transaction for better financial analysis. The tags should be short, descriptive, and relevant to the entry.

Description: {{{entryDescription}}}

Suggest 3-5 tags.`,
  // PYTHON_REPLACE_END
});

const suggestLedgerTagsFlow = ai.defineFlow(
  {
    name: 'suggestLedgerTagsFlow',
    inputSchema: SuggestLedgerTagsInputSchema,
    outputSchema: SuggestLedgerTagsOutputSchema,
  },
  async input => {
    // PYTHON_REPLACE_START
    // This is the core logic of the tag suggestion flow.
    // It's very simple: just call the AI model with the prompt and return the output.
    // In Python, this would be the function handling the request to the suggestion endpoint.
    const {output} = await prompt(input);
    return output!;
    // PYTHON_REPLACE_END
  }
);
