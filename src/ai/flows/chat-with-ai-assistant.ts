
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
import { manageInvoiceTool } from '@/ai/tools/manage-invoice-tool';
import { queryJournalTool } from '@/ai/tools/query-journal-tool'; // Import the new tool

const ChatWithAiAssistantInputSchema = z.object({
  message: z.string().describe('The user message to the AI assistant.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'tool']),
    content: z.string(),
  })).optional().describe('The conversation history between the user and the AI assistant.'),
  uploadedFiles: z.array(z.string()).optional().describe('List of data URIs of uploaded files.'),
  companyId: z.string().optional().describe("The current user's active company ID."),
  creatorUserId: z.string().optional().describe("The ID of the user initiating the chat action."),
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
  tools: [manageInvoiceTool, queryJournalTool],
  prompt: `You are a helpful AI assistant specializing in accounting and financial management for small businesses.
Your primary goal is to assist the user. Use tools when necessary to gather information or perform actions.
When a tool is used, analyze its output. If the tool succeeded, summarize the result for the user.
If the tool indicated an error (e.g., missing information like a Company ID), inform the user about the error and what is needed.
Do not repeatedly call a tool if the required inputs are missing from the user's context or if the tool reported an error due to missing inputs; instead, ask the user for the missing information.
After any tool use, your next step is to provide a clear, textual response to the user summarizing the action or findings. Only ask clarifying questions if essential information is missing.

Available Context Variables (available if provided by the user's session):
- Company ID: {{#if companyId}}{{companyId}}{{else}}Not Set{{/if}}
- User ID: {{#if creatorUserId}}{{creatorUserId}}{{else}}Not Set{{/if}}

Available Tools:
- manageInvoiceTool: Use this tool to create or update invoices.
  - When a user asks to create a new invoice, or update an existing one (e.g., "generate an invoice for client X for 10 hours of consulting at $50/hr", or "update invoice INV-001 to add a new line item"), use this tool.
  - Extract all necessary details from the user's request like customer name, line items (description, quantity, unit price, GST rate), dates, payment terms, etc.
  - If a document is uploaded and the user asks to create an invoice from it, first analyze the document text/image content and then use the extracted information with the 'manageInvoiceTool'.
  - For creating an invoice, set action to 'create'.
  - For updating an invoice, set action to 'update' and ensure you provide the invoiceId if the user mentions it or if it's in the conversation context.
  - MANDATORY INPUTS FOR TOOL:
    - 'companyId': You MUST extract this from the '{{companyId}}' context variable. If '{{companyId}}' is 'Not Set' or empty, DO NOT call the tool. Instead, inform the user that a Company ID is required.
    - 'creatorUserId': You MUST extract this from the '{{creatorUserId}}' context variable. If '{{creatorUserId}}' is 'Not Set' or empty, DO NOT call the tool. Instead, inform the user that they need to be identified.

- queryJournalTool: Use this tool to answer questions about past financial transactions, search for specific entries, or get summaries.
  - When a user asks "What were my expenses last month?", "Find transactions related to 'office supplies'", "Show me income entries from January", "How much did I spend on rent in Q1?", or any question requiring access to historical journal data, use this tool.
  - Extract relevant query parameters from the user's request like dateFrom, dateTo, accountName, keywords, and a reasonable limit.
  - MANDATORY INPUTS FOR TOOL:
    - 'companyId': You MUST extract this from the '{{companyId}}' context variable. If '{{companyId}}' is 'Not Set' or empty, DO NOT call the tool. Instead, inform the user that a Company ID is required.
  - After getting the result from the tool, formulate a natural language response for the user based on the tool's output (querySummary, matchCount, displayedEntriesDescription).

Here's the conversation history:
{{#each conversationHistory}}
  {{#if isUser}}User: {{else if isAssistant}}Assistant: {{else if isTool}}Tool Response ({{tool_name}}): {{/if}}{{{content}}}
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

    let currentHistory = (input.conversationHistory || []).map(msg => ({
      role: msg.role,
      content: msg.content,
      isUser: msg.role === 'user',
      isAssistant: msg.role === 'assistant',
      isTool: msg.role === 'tool',
      tool_name: msg.role === 'tool' ? (JSON.parse(msg.content)?.toolName || 'UnknownTool') : undefined, // Attempt to get tool name for history
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
          const toolNameForHistory = part.toolRequest.name;
          try {
            const toolInput = { ...part.toolRequest.input };

            // Safeguard: Ensure AI includes companyId and creatorUserId, or handle error if tool expects them but AI didn't provide
            if (part.toolRequest.name === 'manageInvoiceTool') {
              if (!toolInput.companyId && input.companyId) { // AI should extract this via {{companyId}}
                console.warn("ManageInvoiceTool: AI did not pass companyId, attempting to use from flow input.");
                toolInput.companyId = input.companyId;
              }
              if (!toolInput.creatorUserId && input.creatorUserId) { // AI should extract this via {{creatorUserId}}
                console.warn("ManageInvoiceTool: AI did not pass creatorUserId, attempting to use from flow input.");
                toolInput.creatorUserId = input.creatorUserId;
              }

              if (!toolInput.companyId) {
                toolOutput = { success: false, message: "Tool Error: Company ID was not provided for the invoice operation. The AI should request this." };
              } else if (!toolInput.creatorUserId) {
                toolOutput = { success: false, message: "Tool Error: User ID was not provided for the invoice operation. The AI should request this." };
              } else {
                toolOutput = await manageInvoiceTool(toolInput);
              }
            } else if (part.toolRequest.name === 'queryJournalTool') {
               if (!toolInput.companyId && input.companyId) { // AI should extract this via {{companyId}}
                  console.warn("QueryJournalTool: AI did not pass companyId, attempting to use from flow input.");
                  toolInput.companyId = input.companyId;
               }
               if (!toolInput.companyId) {
                toolOutput = { querySummary: "Tool Error: Company ID was not provided to query journal entries. The AI should request this.", matchCount: 0 };
              } else {
                toolOutput = await queryJournalTool(toolInput);
              }
            }
             else {
              throw new Error(`Unknown tool requested: ${part.toolRequest.name}`);
            }

            currentHistory.push({ role: 'tool', content: JSON.stringify(toolOutput), isUser: false, isAssistant: false, isTool: true, tool_name: toolNameForHistory });

            const followUpPromptData = {
              ...promptData, // This includes original input (message, companyId, etc.)
              conversationHistory: currentHistory, // This has the tool response
            };
            const followUpResponse = await prompt(followUpPromptData); // Ask LLM to respond based on tool output
            
            if (followUpResponse.parts && Array.isArray(followUpResponse.parts)) {
              for (const followUpPart of followUpResponse.parts) {
                if (followUpPart.text) {
                  finalContent += followUpPart.text;
                }
                // We explicitly do NOT handle followUpPart.toolRequest here to prevent loops beyond one tool call.
              }
            } else if (followUpResponse.text) { 
                finalContent += followUpResponse.text;
            }

          } catch (toolError: any) {
            console.error("Error executing tool or in follow-up prompt:", toolError);
            finalContent += `\nAn error occurred while trying to use a tool: ${toolError.message}`;
          }
        }
      }
    } else if (llmResponse.text) { 
        finalContent = llmResponse.text;
    }

    if (!finalContent.trim()) {
      const lastHistoryItem = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1] : null;
      if (lastHistoryItem && lastHistoryItem.isTool) {
        finalContent = "I've used my tools to process your request. Is there anything else I can help with, or would you like a summary?";
      } else if (llmResponse.finishReason === 'blocked' || llmResponse.finishReason === 'error') {
        finalContent = "I encountered an issue generating a full response. This might be due to safety settings or an internal error. Please try rephrasing your request.";
      } else {
        finalContent = "I received that, but I don't have a specific textual response. How else can I assist?";
      }
    }
    
    return { response: finalContent };
  }
);

