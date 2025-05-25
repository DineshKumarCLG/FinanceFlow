
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
import { Timestamp } from "firebase/firestore"; // Correct import
import { useToast } from "@/hooks/use-toast";


const accountsOptions = [
  { value: "Cash", label: "Cash" },
  { value: "Accounts Receivable", label: "Accounts Receivable" },
  { value: "Office Expenses", label: "Office Expenses" },
  { value: "Service Revenue", label: "Service Revenue" },
  { value: "Bank Account", label: "Bank Account" },
  { value: "Web Development Expense", label: "Web Development Expense" },
  { value: "Consulting Income", label: "Consulting Income" },
  { value: "Rent Expense", label: "Rent Expense" },
  { value: "Salaries Expense", label: "Salaries Expense" },
  { value: "Supplies Expense", label: "Supplies Expense" },
  { value: "Utilities Expense", label: "Utilities Expense" },
];


async function fetchLedgerTransactions(
  companyId: string,
  account?: string,
  dateRange?: DateRange,
  searchTerm?: string
): Promise<{ accountName: string; transactions: LedgerTransaction[] }> {
  const selectedAccountKey = account || "Cash";
  const accountName = accountsOptions.find(acc => acc.value === selectedAccountKey)?.label || selectedAccountKey;

  if (!companyId) {
    console.warn("fetchLedgerTransactions: No companyId provided. Returning empty ledger.");
    return { accountName, transactions: [] };
  }
  console.log(`DataService (fetchLedgerTransactions): Fetching for company '${companyId}', account '${selectedAccountKey}'...`);

  let journalEntries: StoredJournalEntry[];
  try {
    journalEntries = await getJournalEntries(companyId);
    console.log(`DataService (fetchLedgerTransactions): Fetched ${journalEntries.length} total journal entries for company '${companyId}'.`);
  } catch (error) {
    console.error(`DataService (fetchLedgerTransactions): Error fetching journal entries for company ${companyId}:`, error);
    return { accountName, transactions: [] };
  }

  let relevantEntries = journalEntries.filter(entry =>
    entry.debitAccount === selectedAccountKey || entry.creditAccount === selectedAccountKey
  );
  console.log(`DataService (fetchLedgerTransactions): Found ${relevantEntries.length} entries potentially relevant to account '${selectedAccountKey}'.`);

  if (dateRange?.from) {
    relevantEntries = relevantEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const fromDate = new Date(dateRange.from!.getFullYear(), dateRange.from!.getMonth(), dateRange.from!.getDate());
      if (dateRange.to) {
        const toDate = new Date(dateRange.to!.getFullYear(), dateRange.to!.getMonth(), dateRange.to!.getDate(), 23, 59, 59);
        return entryDate >= fromDate && entryDate <= toDate;
      }
      return entryDate >= fromDate;
    });
  }
  console.log(`DataService (fetchLedgerTransactions): After date filter, ${relevantEntries.length} entries remain.`);

  if (searchTerm) {
    relevantEntries = relevantEntries.filter(entry =>
      entry.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  console.log(`DataService (fetchLedgerTransactions): After search term filter, ${relevantEntries.length} entries remain.`);

  relevantEntries.sort((a, b) => {
    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
    const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
    const timeComparison = timeA - timeB;
    if (timeComparison !== 0) return timeComparison;
    return (a.id || "").localeCompare(b.id || "");
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
  console.log(`DataService (fetchLedgerTransactions): Processed ${ledgerTransactions.length} transactions for ledger display for account '${selectedAccountKey}'.`);
  return { accountName, transactions: ledgerTransactions };
}


export default function LedgerPage() {
  const { user: currentUser, currentCompanyId, isLoading: authIsLoading } = useAuth();
  const [ledgerData, setLedgerData] = useState<{ accountName: string; transactions: LedgerTransaction[] }>({ accountName: "Cash", transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<{ account?: string; dateRange?: DateRange, searchTerm?: string  }>({ account: "Cash" });
  const { toast } = useToast();

  const loadLedgerData = useCallback(async (filters: { account?: string; dateRange?: DateRange, searchTerm?: string }) => {
    if (authIsLoading) {
        setIsLoading(true);
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
        const data = await fetchLedgerTransactions(currentCompanyId, filters.account, filters.dateRange, filters.searchTerm);
        setLedgerData(data);
    } catch (error: any) {
        console.error("Failed to load ledger data:", error);
        toast({
          variant: "destructive",
          title: "Ledger Error",
          description: error.message || "Could not load ledger data.",
        });
        setLedgerData({ accountName: filters.account || "Cash", transactions: []});
    } finally {
        setIsLoading(false);
    }
  }, [currentUser, currentCompanyId, authIsLoading, toast]);

  useEffect(() => {
    loadLedgerData(currentFilters);
  }, [loadLedgerData, currentFilters]);

  const handleFilterChange = (newFilters: { account?: string; dateRange?: DateRange, searchTerm?: string }) => {
    setCurrentFilters(prev => ({...prev, ...newFilters}));
  };


  return (
    <div className="flex flex-col h-full space-y-6">
      <PageTitle
        title="Ledger View"
        description="Explore detailed transaction history for specific accounts."
      >
        <Button>
          <Download className="mr-2 h-4 w-4" /> Export Ledger
        </Button>
      </PageTitle>

      <LedgerFilters onFilterChange={handleFilterChange} accountsOptions={accountsOptions} />

      {isLoading && ledgerData.transactions.length === 0 ? ( // Show skeleton only on initial load
         <div className="space-y-2 flex-1">
           <Skeleton className="h-12 w-full rounded-lg" />
           <Skeleton className="flex-1 w-full rounded-lg" /> {/* Skeleton for table area */}
         </div>
      ) : (
        <LedgerTable accountName={ledgerData.accountName} transactions={ledgerData.transactions} />
      )}
    </div>
  );
}
