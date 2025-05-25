
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/PageTitle";
import { LedgerFilters } from "@/components/ledger/LedgerFilters";
import { LedgerTable, type LedgerTransaction } from "@/components/ledger/LedgerTable";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Import Alert

const accountsOptions = [
  { value: "Cash", label: "Cash" },
  { value: "Accounts Receivable", label: "Accounts Receivable" },
  { value: "Office Expenses", label: "Office Expenses" },
  { value: "Service Revenue", label: "Service Revenue" },
  { value: "Bank Account", label: "Bank Account" },
];

async function fetchLedgerTransactions(
  companyId: string, // Require companyId
  account?: string,
  dateRange?: DateRange,
  searchTerm?: string
): Promise<{ accountName: string; transactions: LedgerTransaction[] }> {
  console.log(`Ledger: Starting fetchLedgerTransactions for company ${companyId}. Filters - Account: ${account}, DateRange: ${dateRange ? JSON.stringify({from: dateRange.from?.toISOString(), to: dateRange.to?.toISOString()}) : 'None'}, SearchTerm: '${searchTerm || 'None'}'`);

  if (!companyId) {
    console.warn("Ledger: fetchLedgerTransactions called without companyId.");
    return { accountName: account || "Cash", transactions: [] };
  }

  const selectedAccountKey = account || "Cash";
  const accountName = accountsOptions.find(acc => acc.value === selectedAccountKey)?.label || selectedAccountKey;
  console.log(`Ledger: Resolved selectedAccountKey to: '${selectedAccountKey}', display name: '${accountName}'`);

  let journalEntries: StoredJournalEntry[] = [];
  try {
    journalEntries = await getJournalEntries(companyId); // Pass companyId
  } catch (error) {
    console.error("Ledger: Failed to fetch journal entries from data service:", error);
    return { accountName, transactions: [] };
  }

  console.log(`Ledger: Fetched ${journalEntries.length} total journal entries from data service for company ${companyId}.`);
  if (journalEntries.length === 0) {
    console.log(`Ledger: No journal entries found in the system for company ${companyId}.`);
    return { accountName, transactions: [] };
  }

  let relevantEntries = journalEntries.filter(entry =>
    entry.debitAccount === selectedAccountKey || entry.creditAccount === selectedAccountKey
  );
  console.log(`Ledger: Found ${relevantEntries.length} entries potentially relevant to account '${selectedAccountKey}' (before date/search filters).`);

  if (dateRange?.from) {
    const fromDateStart = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate(), 0, 0, 0, 0);
    const toDateEnd = dateRange.to ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59, 999) : null;
    console.log(`Ledger: Applying date filter. From: ${fromDateStart.toISOString()}, To: ${toDateEnd ? toDateEnd.toISOString() : 'None'}`);
    const preDateFilterCount = relevantEntries.length;
    relevantEntries = relevantEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      if (toDateEnd) {
        return entryDate >= fromDateStart && entryDate <= toDateEnd;
      }
      return entryDate >= fromDateStart;
    });
    console.log(`Ledger: After date filter, ${relevantEntries.length} entries remain (was ${preDateFilterCount}).`);
  } else {
    console.log("Ledger: No date range filter applied.");
  }

  if (searchTerm && searchTerm.trim() !== "") {
    console.log(`Ledger: Applying search term filter: "${searchTerm}"`);
    const preSearchFilterCount = relevantEntries.length;
    relevantEntries = relevantEntries.filter(entry =>
      entry.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log(`Ledger: After search term filter, ${relevantEntries.length} entries remain (was ${preSearchFilterCount}).`);
  } else {
    console.log("Ledger: No search term filter applied.");
  }

  relevantEntries.sort((a, b) => {
    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComparison !== 0) return dateComparison;

    const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
    const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
    const timeComparison = timeA - timeB;
    if (timeComparison !== 0) return timeComparison;
    
    return (a.id || "").localeCompare(b.id || "");
  });
  console.log(`Ledger: Sorted ${relevantEntries.length} relevant entries.`);
  if(relevantEntries.length > 0) {
    console.log("Ledger: First few sorted relevant entries:", relevantEntries.slice(0,3));
  }

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

  console.log(`Ledger: Processed ${ledgerTransactions.length} transactions for display for account '${accountName}'. Final running balance (simplified): ${runningBalance}`);
  if(ledgerTransactions.length > 0) {
    console.log("Ledger: First few processed ledger transactions:", ledgerTransactions.slice(0,3));
  }
  return { accountName, transactions: ledgerTransactions };
}

export default function LedgerPage() {
  const { user: currentUser, currentCompanyId } = useAuth(); // Get currentCompanyId
  const [ledgerData, setLedgerData] = useState<{ accountName: string; transactions: LedgerTransaction[] }>({ accountName: "Cash", transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<{ account?: string; dateRange?: DateRange, searchTerm?: string  }>({ account: "Cash" });

  const loadLedgerData = useCallback(async (filters: { account?: string; dateRange?: DateRange, searchTerm?: string }) => {
    if (!currentUser || !currentCompanyId) { // Check for companyId
      setIsLoading(false);
      setLedgerData({ accountName: filters.account || "Cash", transactions: []});
      console.log("Ledger: No current user or companyId, skipping data load.");
      return;
    }
    setIsLoading(true);
    console.log("Ledger: Calling loadLedgerData with filters:", filters);
    try {
        const data = await fetchLedgerTransactions(currentCompanyId, filters.account, filters.dateRange, filters.searchTerm); // Pass companyId
        setLedgerData(data);
    } catch (error: any) {
        console.error("Ledger: Failed to load ledger data in loadLedgerData function:", error);
        setLedgerData({ accountName: filters.account || "Cash", transactions: []});
    } finally {
        setIsLoading(false);
        console.log("Ledger: Finished loadLedgerData.");
    }
  }, [currentUser, currentCompanyId]); // Added currentCompanyId

  useEffect(() => {
    if (currentUser && currentCompanyId) { // Check for companyId
      console.log("Ledger: currentUser and currentCompanyId available, (re)loading ledger data with currentFilters:", currentFilters);
      loadLedgerData(currentFilters);
    } else {
      console.log("Ledger: No currentUser or currentCompanyId, clearing ledger data and setting isLoading to false.");
      setIsLoading(false);
      setLedgerData({ accountName: currentFilters.account || "Cash", transactions: []});
    }
  }, [loadLedgerData, currentFilters, currentUser, currentCompanyId]); // Added currentCompanyId

  const handleFilterChange = (newFilters: { account?: string; dateRange?: DateRange, searchTerm?: string }) => {
    console.log("Ledger: Filters changed in LedgerFilters component:", newFilters);
    setCurrentFilters(prev => ({...prev, ...newFilters}));
  };

  if (!currentCompanyId && !isLoading) {
    return (
      <div className="space-y-6 p-4">
         <PageTitle
            title="Ledger View"
            description="Explore detailed transaction history for specific accounts."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No Company ID selected. Please go to the login page to set a Company ID to view ledger.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title={`Ledger View ${currentCompanyId ? `(${currentCompanyId})` : ''}`}
        description="Explore detailed transaction history for specific accounts."
      >
        <Button disabled={!currentCompanyId || isLoading}>
          <Download className="mr-2 h-4 w-4" /> Export Ledger
        </Button>
      </PageTitle>

      <LedgerFilters onFilterChange={handleFilterChange} />

      {isLoading ? (
         <div className="space-y-2">
           <Skeleton className="h-12 w-full" />
           <Skeleton className="h-64 w-full" />
         </div>
      ) : (
        <LedgerTable accountName={ledgerData.accountName} transactions={ledgerData.transactions} companyId={currentCompanyId!} />
      )}
    </div>
  );
}
