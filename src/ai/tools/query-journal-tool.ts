
'use server';
/**
 * @fileOverview AI tool for querying journal entries.
 * This tool allows the AI assistant to retrieve and summarize journal entries
 * based on various criteria.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from '@/lib/data-service';
import { parseISO, isWithinInterval, isValid, type Interval } from 'date-fns';

const QueriedJournalEntrySchema = z.object({
  date: z.string(),
  description: z.string(),
  debitAccount: z.string(),
  creditAccount: z.string(),
  amount: z.number(),
});

const QueryJournalInputSchema = z.object({
  companyId: z.string().describe("The ID of the company for which to query journal entries. This is provided by the system."),
  dateFrom: z.string().optional().describe("Start date for the query (YYYY-MM-DD)."),
  dateTo: z.string().optional().describe("End date for the query (YYYY-MM-DD)."),
  accountName: z.string().optional().describe("Filter by account name (matches debit or credit account)."),
  keywords: z.string().optional().describe("Keywords to search for in the entry description."),
  limit: z.number().optional().default(5).describe("Maximum number of example entries to describe in the output."),
});
export type QueryJournalInput = z.infer<typeof QueryJournalInputSchema>;

const QueryJournalOutputSchema = z.object({
  querySummary: z.string().describe("A concise textual summary of the query results. For example, 'Found 15 entries totaling 1234.56 matching your criteria.' or 'No entries found for the specified period.'"),
  matchCount: z.number().describe("The total number of entries matching the query criteria (before any display limits)."),
  displayedEntriesDescription: z.string().optional().describe("A brief description of up to 'limit' key entries, if any were found. E.g., 'Recent entries: 2024-07-15: Office Supplies (50.00); 2024-07-10: Client Payment (200.00).'"),
});
export type QueryJournalOutput = z.infer<typeof QueryJournalOutputSchema>;

export const queryJournalTool = ai.defineTool(
  {
    name: 'queryJournalTool',
    description: 'Queries historical journal entries based on criteria like date range, account name, or keywords. Returns a summary and examples of matching entries.',
    inputSchema: QueryJournalInputSchema,
    outputSchema: QueryJournalOutputSchema,
  },
  async (input: QueryJournalInput): Promise<QueryJournalOutput> => {
    // PYTHON_REPLACE_START
    // This is the core logic for the journal querying tool.
    // In a Python backend, this function would be called when the AI decides to use the "queryJournalTool".
    // It fetches data from the database, filters it, and returns a summary.

    // Step 1: Validate required system-provided inputs.
    if (!input.companyId) {
      return { querySummary: "Error: Company ID is required to query journal entries. This should be provided by the system.", matchCount: 0 };
    }

    try {
      // Step 2: Fetch all journal entries from the database.
      // A Python implementation would replace this call with its own database query logic.
      const allEntries = await getJournalEntries(input.companyId);
      if (allEntries.length === 0) {
        return { querySummary: "No journal entries found for this company.", matchCount: 0 };
      }

      let filteredEntries = allEntries;

      // Step 3: Apply filters based on the AI's request.
      // This is the core data processing logic of the tool.

      // Date filtering
      if (input.dateFrom || input.dateTo) {
        const startDate = input.dateFrom ? parseISO(input.dateFrom) : null;
        const endDate = input.dateTo ? parseISO(input.dateTo) : null;

        if ((startDate && !isValid(startDate)) || (endDate && !isValid(endDate))) {
          return { querySummary: "Error: Invalid date format provided. Please use YYYY-MM-DD.", matchCount: 0 };
        }
        
        const interval: Interval = {};
        if (startDate) interval.start = startDate;
        
        let intervalEnd = endDate;
        if (endDate) {
           const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
           intervalEnd = endOfDay;
        }
        if (intervalEnd) interval.end = intervalEnd;
        

        filteredEntries = filteredEntries.filter(entry => {
          const entryDate = parseISO(entry.date);
          if (!isValid(entryDate)) return false;
          
          if (startDate && interval.end) return isWithinInterval(entryDate, { start: startDate, end: interval.end });
          if (startDate) return entryDate >= startDate;
          if (interval.end) return entryDate <= interval.end;
          return false; 
        });
      }

      // Account name filtering
      if (input.accountName) {
        const lowerAccountName = input.accountName.toLowerCase();
        filteredEntries = filteredEntries.filter(entry =>
          entry.debitAccount.toLowerCase().includes(lowerAccountName) ||
          entry.creditAccount.toLowerCase().includes(lowerAccountName)
        );
      }

      // Keyword filtering
      if (input.keywords) {
        const lowerKeywords = input.keywords.toLowerCase();
        filteredEntries = filteredEntries.filter(entry =>
          entry.description.toLowerCase().includes(lowerKeywords)
        );
      }
      
      // Sort entries by date (most recent first).
      filteredEntries.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

      // Step 4: Summarize the results for the AI.
      // The goal is to provide a concise summary that the AI can then use to answer the user's question.
      const matchCount = filteredEntries.length;
      let totalAmount = 0;
      filteredEntries.forEach(entry => totalAmount += entry.amount);

      let displayedEntriesDescription: string | undefined = undefined;
      if (matchCount > 0) {
        const entriesToDisplay = filteredEntries.slice(0, input.limit);
        displayedEntriesDescription = "Examples: " + entriesToDisplay.map(e => 
          `${e.date}: ${e.description.substring(0,30)}... (${e.amount.toFixed(2)})`
        ).join('; ');
      }

      const querySummary = matchCount > 0
        ? `Found ${matchCount} journal entr${matchCount === 1 ? 'y' : 'ies'} totaling ${totalAmount.toFixed(2)} matching your criteria.`
        : "No journal entries found matching your criteria.";

      return {
        querySummary,
        matchCount,
        displayedEntriesDescription,
      };

    } catch (e: any) {
      // Handle potential errors, especially permission errors from the database.
      console.error("Error in queryJournalTool:", e);
      if (e.message && e.message.toLowerCase().includes("permission")) {
        return { 
          querySummary: "I couldn't access the journal entries due to a permission error. This often means the app's security rules do not allow reading all of a company's entries at once, which is necessary for cross-user reporting. Please check the Firestore security rules to ensure queries on the 'journalEntries' collection are allowed for all members of a company.",
          matchCount: 0 
        };
      }
      return { querySummary: `Error querying journal entries: ${e.message}`, matchCount: 0 };
    }
    // PYTHON_REPLACE_END
  }
);
