
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
import { manageInvoiceTool } from '../tools/manage-invoice-tool';
import { queryJournalTool } from '../tools/query-journal-tool';
import { generate, part } from 'genkit/experimental/ai';

const ChatWithAiAssistantInputSchema = z.object({
  message: z.string().describe('The user message to the AI assistant.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'tool']),
    content: z.any(),
  })).optional().describe('The conversation history between the user and the AI assistant.'),
  uploadedFiles: z.array(z.string()).optional().describe('List of data URIs of uploaded files.'),
  companyId: z.string().optional().describe("The current user's active company ID. This should be passed to any tools that require it."),
  creatorUserId: z.string().optional().describe("The current user's ID. This should be passed to any tools that require it."),
});
export type ChatWithAiAssistantInput = z.infer<typeof ChatWithAiAssistantInputSchema>;

const ChatWithAiAssistantOutputSchema = z.object({
  response: z.string().describe('The response from the AI assistant.'),
});
export type ChatWithAiAssistantOutput = z.infer<typeof ChatWithAiAssistantOutputSchema>;

export async function chatWithAiAssistant(input: ChatWithAiAssistantInput): Promise<ChatWithAiAssistantOutput> {
  return chatWithAiAssistantFlow(input);
}

const chatWithAiAssistantFlow = ai.defineFlow(
  {
    name: 'chatWithAiAssistantFlow',
    inputSchema: ChatWithAiAssistantInputSchema,
    outputSchema: ChatWithAiAssistantOutputSchema,
  },
  async (input) => {
    // Convert conversation history to a format suitable for the AI model
    const history = (input.conversationHistory || []).map(msg => {
      if (msg.role === 'tool') {
        return part.toolResponse(msg.content);
      }
      return {
        role: msg.role as 'user' | 'assistant',
        content: [part.text(msg.content)],
      };
    });

    const userMessageParts = [part.text(input.message)];
    if (input.uploadedFiles) {
      input.uploadedFiles.forEach(dataUri => {
        userMessageParts.push(part.media(dataUri));
      });
    }

    const { output } = await generate({
      model: ai.model('googleai/gemini-2.0-flash'),
      tools: [manageInvoiceTool, queryJournalTool],
      history: history,
      prompt: {
        role: 'user',
        content: userMessageParts,
      },
      system: `You are a helpful AI assistant specializing in accounting and financial management for small businesses.
When asked to perform an action like creating, updating, or querying data, use the provided tools.
You MUST use the 'companyId' and 'creatorUserId' from the user's session when calling tools. Do NOT ask the user for this information.
If a user asks to create or update an invoice, use the manageInvoiceTool.
If a user asks a question about their financial data (e.g., "how much did I spend on office supplies last month?"), use the queryJournalTool.
Analyze user-uploaded files to assist with their requests. For example, if a user uploads a receipt, extract key details. If asked to create an invoice from a file, use the information to populate the invoice details for the manageInvoiceTool.
Always confirm actions with the user before finalizing, for example, after using a tool and getting a result, present it to the user.`,
      config: {
        // You can add safety settings or other configurations here if needed.
      },
      // Augment tool inputs with system-provided data
      toolRequest: (toolRequests) => {
        return toolRequests.map(toolRequest => {
          if (toolRequest.toolName === 'manageInvoiceTool' || toolRequest.toolName === 'queryJournalTool') {
            toolRequest.input.companyId = input.companyId;
          }
          if (toolRequest.toolName === 'manageInvoiceTool') {
             toolRequest.input.creatorUserId = input.creatorUserId;
          }
          return toolRequest;
        });
      },
    });

    return { response: output.text! };
  }
);
