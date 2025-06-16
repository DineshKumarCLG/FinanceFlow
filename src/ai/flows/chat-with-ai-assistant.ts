
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
import { manageInvoiceTool } from '@/ai/tools/manage-invoice-tool'; // Import the new tool
import { type User } from 'firebase/auth'; // Assuming you might pass user/company info

const ChatWithAiAssistantInputSchema = z.object({
  message: z.string().describe('The user message to the AI assistant.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'tool']),
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
  // output: {schema: ChatWithAiAssistantOutputSchema}, // Removed: This conflicts with tool usage. Flow output schema is handled by defineFlow.
  tools: [manageInvoiceTool],
  prompt: `You are a helpful AI assistant specializing in accounting and financial management for small businesses.
  Your goal is to help users manage their finances through a conversational interface.
  You can answer questions about their finances, help them add entries, process uploaded documents, and manage invoices.
  Maintain context throughout the conversation.

  Available Tools:
  - manageInvoiceTool: Use this tool to create or update invoices.
    - When a user asks to create a new invoice, or update an existing one (e.g., "generate an invoice for client X for 10 hours of consulting at $50/hr", or "update invoice INV-001 to add a new line item"), use this tool.
    - Extract all necessary details from the user's request like customer name, line items (description, quantity, unit price, GST rate), dates, payment terms, etc.
    - If a document is uploaded and the user asks to create an invoice from it, first analyze the document text/image content and then use the extracted information with the 'manageInvoiceTool'.
    - For creating an invoice, set action to 'create'.
    - For updating an invoice, set action to 'update' and ensure you provide the invoiceId if the user mentions it or if it's in the conversation context.
    - You MUST provide the companyId to this tool. It is available as '{{companyId}}' if provided in the input. If not available, you should inform the user that a company context is needed.

  Here's the conversation history:
  {{#each conversationHistory}}
    {{#if isUser}}User: {{else if isAssistant}}Assistant: {{else if isTool}}Tool Response: {{/if}}{{{content}}}
  {{/each}}

  {{#if uploadedFiles}}
  User has uploaded files:
  {{#each uploadedFiles}}
  - A file named {{name}} (type: {{type}}). Content: {{media url=this}}
  {{/each}}
  Consider these files for context, especially if the user asks to create entries or invoices from them.
  {{/if}}

  User: {{{message}}}
  Assistant:`,
});

const chatWithAiAssistantFlow = ai.defineFlow(
  {
    name: 'chatWithAiAssistantFlow',
    inputSchema: ChatWithAiAssistantInputSchema,
    outputSchema: ChatWithAiAssistantOutputSchema, // Flow output schema remains
  },
  async (input: ChatWithAiAssistantInput) => {

    let currentHistory = (input.conversationHistory || []).map(msg => ({
      role: msg.role,
      content: msg.content,
      isUser: msg.role === 'user',
      isAssistant: msg.role === 'assistant',
      isTool: msg.role === 'tool',
    }));

    const promptData = {
      ...input,
      conversationHistory: currentHistory,
    };

    const llmResponse = await prompt(promptData);

    let finalContent = "";
    if (llmResponse.parts && Array.isArray(llmResponse.parts)) {
      for (const part of llmResponse.parts) {
        if (part.text) {
          finalContent += part.text;
        } else if (part.toolRequest) {
          console.log(`AI Assistant: Attempting to call tool: ${part.toolRequest.name}`);
          let toolOutput: any;
          try {
            if (part.toolRequest.name === 'manageInvoiceTool') {
              const toolInput = { ...part.toolRequest.input };
              if (input.companyId && !toolInput.companyId) {
                toolInput.companyId = input.companyId;
              }
              if (!toolInput.companyId) {
                console.warn("ManageInvoiceTool called without companyId from AI or user input.");
                toolOutput = { success: false, message: "Tool Error: Company ID was not provided for the invoice operation." };
              } else {
                toolOutput = await manageInvoiceTool(toolInput);
              }
            } else {
              throw new Error(`Unknown tool requested: ${part.toolRequest.name}`);
            }

            currentHistory.push({ role: 'tool', content: JSON.stringify(toolOutput), isUser: false, isAssistant: false, isTool: true });

            const followUpPromptData = {
              ...promptData,
              conversationHistory: currentHistory,
            };
            const followUpResponse = await prompt(followUpPromptData);
            
            if (followUpResponse.parts && Array.isArray(followUpResponse.parts)) {
              for (const followUpPart of followUpResponse.parts) {
                if (followUpPart.text) {
                  finalContent += followUpPart.text;
                }
              }
            } else if (followUpResponse.text) { // Fallback if parts isn't there on follow-up but direct text is
                finalContent += followUpResponse.text;
            }

          } catch (toolError: any) {
            console.error("Error executing tool:", toolError);
            finalContent += `\nAn error occurred while trying to use a tool: ${toolError.message}`;
          }
        }
      }
    } else if (llmResponse.text) { // Fallback if parts isn't there at all but direct text is
        finalContent = llmResponse.text;
    }


    if (!finalContent) {
      const lastHistoryItem = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1] : null;
      if (lastHistoryItem && lastHistoryItem.isTool) {
        finalContent = "I've used my tools to process your request. Is there anything else I can help with?";
      } else {
        finalContent = "I received that, but I don't have a specific textual response. How else can I assist?";
      }
    }
    
    return { response: finalContent };
  }
);

