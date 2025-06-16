
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
    role: z.enum(['user', 'assistant', 'tool']), // Added 'tool' role for tool responses
    content: z.string(),
  })).optional().describe('The conversation history between the user and the AI assistant.'),
  uploadedFiles: z.array(z.string()).optional().describe('List of data URIs of uploaded files.'),
  // Pass companyId to the flow, so it can be passed to tools
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
  tools: [manageInvoiceTool], // Register the tool with the prompt
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
    {{#if (eq role "user")}}User: {{else if (eq role "assistant")}}Assistant: {{else if (eq role "tool")}}Tool Response ({{tool_name}}): {{/if}}{{{content}}}
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
    outputSchema: ChatWithAiAssistantOutputSchema,
  },
  async (input: ChatWithAiAssistantInput) => {

    const currentHistory = (input.conversationHistory || []).map(msg => ({
      role: msg.role,
      content: msg.content,
      // Add a helper for Handlebars conditional, though direct `eq` helper is better
      // role_is_user: msg.role === 'user', 
      // role_is_assistant: msg.role === 'assistant',
      // role_is_tool: msg.role === 'tool',
    }));

    // Prepare data for the prompt, including companyId
    const promptData = {
      ...input,
      conversationHistory: currentHistory,
      // companyId will be available in the Handlebars template via {{companyId}}
    };

    const llmResponse = await prompt(promptData); // llmResponse is the Genkit `GenerateResponse` object

    // Handle potential tool calls
    let finalContent = "";
    for (const part of llmResponse.parts) {
      if (part.text) {
        finalContent += part.text;
      } else if (part.toolRequest) {
        // If it's a tool call, execute the tool
        console.log(`AI Assistant: Attempting to call tool: ${part.toolRequest.name}`);
        let toolOutput: any;
        try {
          if (part.toolRequest.name === 'manageInvoiceTool') {
            // Inject companyId into tool input if the tool requires it and it's not already there
            const toolInput = { ...part.toolRequest.input };
            if (input.companyId && !toolInput.companyId) {
              toolInput.companyId = input.companyId;
            }
            if (!toolInput.companyId) {
                // Handle missing companyId - either by asking user or erroring
                // For now, let the tool handle it or error if companyId is strictly required by tool schema
                console.warn("ManageInvoiceTool called without companyId from AI or user input.");
                 toolOutput = { success: false, message: "Tool Error: Company ID was not provided for the invoice operation." };
            } else {
               toolOutput = await manageInvoiceTool(toolInput);
            }
          } else {
            // Handle other tools if any, or error
            throw new Error(`Unknown tool requested: ${part.toolRequest.name}`);
          }

          // Add tool response back to history and re-prompt (or construct response)
          currentHistory.push({ role: 'tool', content: JSON.stringify(toolOutput) });

          // Re-prompt the LLM with the tool's output
          const followUpPromptData = {
            ...promptData,
            conversationHistory: currentHistory,
          };
          const followUpResponse = await prompt(followUpPromptData);
          // Assuming the follow-up response is text, not another tool call for simplicity here.
          // A more robust implementation would loop until a text response is received.
          for (const followUpPart of followUpResponse.parts) {
            if (followUpPart.text) {
              finalContent += followUpPart.text;
            }
          }

        } catch (toolError: any) {
          console.error("Error executing tool:", toolError);
          finalContent += `\nAn error occurred while trying to use a tool: ${toolError.message}`;
          // Optionally, add this error to history and re-prompt for a graceful recovery by the LLM.
        }
      }
    }

    if (!finalContent && llmResponse.output?.response) {
      // Fallback if parts processing didn't yield content but direct output exists
      finalContent = llmResponse.output.response;
    } else if (!finalContent) {
      // If still no content, means it was likely only a tool call expected by the LLM
      // and the tool response should be used to generate the next LLM turn.
      // For now, if the loop above didn't produce text from a follow-up, return a generic message.
      finalContent = "The assistant processed your request using a tool. What would you like to do next?";
    }
    
    return { response: finalContent };
  }
);
