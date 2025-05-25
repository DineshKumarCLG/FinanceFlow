
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/PageTitle";
import { LedgerFilters } from "@/components/ledger/LedgerFilters";
import { LedgerTable, type LedgerTransaction } from "@/components/ledger/LedgerTable";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import type { Timestamp } from "firebase/firestore"; // Keep this import
import { useToast } from "@/hooks/use-toast";


// Accounts options can remain static for now, or be dynamically generated later
const accountsOptions = [
  { value: "Cash", label: "Cash" }, // Ensure value matches account names used in entries
  { value: "Accounts Receivable", label: "Accounts Receivable" },
  { value: "Office Expenses", label: "Office Expenses" },
  { value: "Service Revenue", label: "Service Revenue" },
  { value: "Bank Account", label: "Bank Account" },
  // Add more common accounts if needed
];


async function fetchLedgerTransactions(
  companyId: string, // Added companyId as the first parameter
  account?: string,
  dateRange?: DateRange,
  searchTerm?: string
): Promise<{ accountName: string; transactions: LedgerTransaction[] }> {
  const selectedAccountKey = account || "Cash"; // Default to Cash
  const accountName = accountsOptions.find(acc => acc.value === selectedAccountKey)?.label || selectedAccountKey;

  if (!companyId) {
    console.warn("fetchLedgerTransactions: No companyId provided. Returning empty ledger.");
    return { accountName, transactions: [] };
  }
  console.log(`fetchLedgerTransactions: Fetching for company '${companyId}', account '${selectedAccountKey}'`);

  let journalEntries: StoredJournalEntry[];
  try {
    journalEntries = await getJournalEntries(companyId); // Pass companyId here
  } catch (error) {
    console.error(`fetchLedgerTransactions: Error fetching journal entries for company ${companyId}:`, error);
    return { accountName, transactions: [] }; // Return empty on error
  }


  // Filter journal entries relevant to the selected account
  let relevantEntries = journalEntries.filter(entry =>
    entry.debitAccount === selectedAccountKey || entry.creditAccount === selectedAccountKey
  );
  console.log(`fetchLedgerTransactions: Found ${relevantEntries.length} entries potentially relevant to account '${selectedAccountKey}' out of ${journalEntries.length} total for company '${companyId}'.`);


  // Further filter by dateRange
  if (dateRange?.from) {
    relevantEntries = relevantEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      // Adjust date to avoid timezone issues with comparison
      const fromDate = new Date(dateRange.from!.getFullYear(), dateRange.from!.getMonth(), dateRange.from!.getDate());
      if (dateRange.to) {
        const toDate = new Date(dateRange.to!.getFullYear(), dateRange.to!.getMonth(), dateRange.to!.getDate(), 23, 59, 59);
        return entryDate >= fromDate && entryDate <= toDate;
      }
      return entryDate >= fromDate;
    });
  }
  console.log(`fetchLedgerTransactions: After date filter, ${relevantEntries.length} entries remain.`);

  // Further filter by searchTerm in description
  if (searchTerm) {
    relevantEntries = relevantEntries.filter(entry =>
      entry.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  console.log(`fetchLedgerTransactions: After search term filter, ${relevantEntries.length} entries remain.`);

  // Sort entries by date (important for balance calculation)
  relevantEntries.sort((a, b) => {
    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    // If createdAt is a Firestore Timestamp, convert to Date for comparison
    const timeA = a.createdAt instanceof Timestamp ? (a.createdAt as Timestamp).toMillis() : new Date(a.createdAt as any).getTime();
    const timeB = b.createdAt instanceof Timestamp ? (b.createdAt as Timestamp).toMillis() : new Date(b.createdAt as any).getTime();
    const timeComparison = timeA - timeB;
    if (timeComparison !== 0) return timeComparison;
    return a.id.localeCompare(b.id);
  });


  let runningBalance = 0;
  const ledgerTransactions: LedgerTransaction[] = relevantEntries.map(entry => {
    let debitAmount: number | null = null;
    let creditAmount: number | null = null;

    if (entry.debitAccount === selectedAccountKey) {
      debitAmount = entry.amount;
      runningBalance += entry.amount;
    }
    if (entry.creditAccount === selectedAccountKey) {
      creditAmount = entry.amount;
      runningBalance -= entry.amount;
    }

    return {
      id: entry.id,
      date: entry.date,
      description: entry.description,
      debit: debitAmount,
      credit: creditAmount,
      balance: runningBalance,
      tags: entry.tags,
    };
  });
  console.log(`fetchLedgerTransactions: Processed ${ledgerTransactions.length} transactions for ledger display.`);
  return { accountName, transactions: ledgerTransactions };
}


export default function LedgerPage() {
  const { user: currentUser, currentCompanyId, isLoading: authIsLoading } = useAuth();
  const [ledgerData, setLedgerData] = useState<{ accountName: string; transactions: LedgerTransaction[] }>({ accountName: "Cash", transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<{ account?: string; dateRange?: DateRange, searchTerm?: string  }>({ account: "Cash" });
  const { toast } = useToast();

  const loadLedgerData = useCallback(async (filters: { account?: string; dateRange?: DateRange, searchTerm?: string }) => {
    if (authIsLoading) { // Don't load if auth state is still resolving
        setIsLoading(true); // Keep showing loader
        return;
    }
    if (!currentUser || !currentCompanyId) {
      console.log("LedgerPage (loadLedgerData): No user or companyId, clearing ledger data.");
      setIsLoading(false);
      setLedgerData({ accountName: filters.account || "Cash", transactions: []});
      return;
    }
    console.log(`LedgerPage (loadLedgerData): Loading ledger data for company '${currentCompanyId}' with filters:`, filters);
    setIsLoading(true);
    try {
        // Pass currentCompanyId to fetchLedgerTransactions
        const data = await fetchLedgerTransactions(currentCompanyId, filters.account, filters.dateRange, filters.searchTerm);
        setLedgerData(data);
    } catch (error: any) {
        console.error("Failed to load ledger data:", error);
        toast({
          variant: "destructive",
          title: "Ledger Error",
          description: error.message || "Could not load ledger data.",
        });
        setLedgerData({ accountName: filters.account || "Cash", transactions: []}); // Reset on error
    } finally {
        setIsLoading(false);
    }
  }, [currentUser, currentCompanyId, authIsLoading, toast]); // Added currentCompanyId and authIsLoading

  useEffect(() => {
    loadLedgerData(currentFilters);
  }, [loadLedgerData, currentFilters]);

  const handleFilterChange = (newFilters: { account?: string; dateRange?: DateRange, searchTerm?: string }) => {
    setCurrentFilters(prev => ({...prev, ...newFilters}));
  };


  return (
    <div className="space-y-6">
      <PageTitle
        title="Ledger View"
        description="Explore detailed transaction history for specific accounts."
      >
        <Button>
          <Download className="mr-2 h-4 w-4" /> Export Ledger
        </Button>
      </PageTitle>

      <LedgerFilters onFilterChange={handleFilterChange} />

      {isLoading ? (
         <div className="space-y-2">
           <Skeleton className="h-12 w-full rounded-lg" />
           <Skeleton className="h-64 w-full rounded-lg" />
         </div>
      ) : (
        <LedgerTable accountName={ledgerData.accountName} transactions={ledgerData.transactions} />
      )}
    </div>
  );
}
