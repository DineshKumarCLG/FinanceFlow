
'use server';
/**
 * @fileOverview An AI assistant for financial management via conversational interface.
 *
 * - chatWithAiAssistant - A function that handles the conversation with the AI assistant.
 * - ChatWithAiAssistantInput - The input type for the chatWithAiAssistant function.
 * - ChatWithAiAssistantOutput - The return type for the chatWithAiAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatWithAiAssistantInputSchema = z.object({
  message: z.string().describe('The user message to the AI assistant.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The conversation history between the user and the AI assistant.'),
  uploadedFiles: z.array(z.string()).optional().describe('List of data URIs of uploaded files.'),
  companyId: z.string().optional().describe("The current user's active company ID."),
});
export type ChatWithAiAssistantInput = z.infer<typeof ChatWithAiAssistantInputSchema>;

const ChatWithAiAssistantOutputSchema = z.object({
  response: z.string().describe('The response from the AI assistant.'),
});
export type ChatWithAiAssistantOutput = z.infer<typeof ChatWithAiAssistantOutputSchema>;

export async function chatWithAiAssistant(input: ChatWithAiAssistantInput): Promise<ChatWithAiAssistantOutput> {
  return chatWithAiAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatWithAiAssistantPrompt',
  input: {schema: ChatWithAiAssistantInputSchema},
  output: {schema: ChatWithAiAssistantOutputSchema},
  prompt: `You are a helpful AI assistant specializing in accounting and financial management for small businesses.

Here's the conversation history:
{{#each conversationHistory}}
  {{#if (eq role "user")}}User: {{else}}Assistant: {{/if}}{{{content}}}
{{/each}}

{{#if uploadedFiles}}
User has uploaded files:
{{#each uploadedFiles}}
- A file with this content: {{media url=this}}
{{/each}}
Please analyze these files and provide a summary of your findings. For example, if it's a receipt, extract the key details into a structured format.
If you are asked to create an invoice from an uploaded file, extract the relevant information and confirm with the user before proceeding.
{{/if}}

User: {{{message}}}
Assistant:`,
});

const chatWithAiAssistantFlow = ai.defineFlow(
  {
    name: 'chatWithAiAssistantFlow',
    inputSchema: ChatWithAiAssistantInputSchema,
    outputSchema: ChatWithAiAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
