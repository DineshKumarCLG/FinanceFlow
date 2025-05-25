
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/PageTitle";
import { LedgerFilters } from "@/components/ledger/LedgerFilters";
import { LedgerTable, type LedgerTransaction } from "@/components/ledger/LedgerTable";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";

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
  account?: string, 
  dateRange?: DateRange, 
  searchTerm?: string
): Promise<{ accountName: string; transactions: LedgerTransaction[] }> {
  // Removed: await new Promise(resolve => setTimeout(resolve, 0)); 
  
  const selectedAccountKey = account || "Cash"; // Default to Cash
  const accountName = accountsOptions.find(acc => acc.value === selectedAccountKey)?.label || selectedAccountKey;
  
  let journalEntries = await getJournalEntries();

  // Filter journal entries relevant to the selected account
  let relevantEntries = journalEntries.filter(entry => 
    entry.debitAccount === selectedAccountKey || entry.creditAccount === selectedAccountKey
  );

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

  // Further filter by searchTerm in description
  if (searchTerm) {
    relevantEntries = relevantEntries.filter(entry => 
      entry.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Sort entries by date (important for balance calculation)
  relevantEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));

  // Transform relevant journal entries into ledger transactions and calculate running balance
  let runningBalance = 0;
  // Note: This simple balance calculation assumes all accounts behave like asset accounts (debits increase, credits decrease).
  // Real accounting requires knowledge of account types (Asset, Liability, Equity, Revenue, Expense) for correct balance calculation.
  // For 'Service Revenue', a credit balance is normal (so balance would typically be negative or tracked differently).
  // This is a simplification for the prototype.
  
  // For accounts like "Service Revenue", where credits increase the balance (credit balance accounts)
  // we might need to adjust logic if we want to show balance as positive.
  // For now, we'll use a consistent calculation: debit adds, credit subtracts.
  // This means revenue accounts will show negative balances, which is correct from a trial balance perspective.

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
      id: entry.id, // Use journal entry ID
      date: entry.date,
      description: entry.description,
      debit: debitAmount,
      credit: creditAmount,
      balance: runningBalance,
      tags: entry.tags,
    };
  });

  return { accountName, transactions: ledgerTransactions };
}


export default function LedgerPage() {
  const [ledgerData, setLedgerData] = useState<{ accountName: string; transactions: LedgerTransaction[] }>({ accountName: "Cash", transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<{ account?: string; dateRange?: DateRange, searchTerm?: string  }>({ account: "Cash" });

  const loadLedgerData = useCallback(async (filters: { account?: string; dateRange?: DateRange, searchTerm?: string }) => {
    setIsLoading(true);
    const data = await fetchLedgerTransactions(filters.account, filters.dateRange, filters.searchTerm);
    setLedgerData(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadLedgerData(currentFilters);
  }, [loadLedgerData, currentFilters]);

  const handleFilterChange = (newFilters: { account?: string; dateRange?: DateRange, searchTerm?: string }) => {
    setCurrentFilters(prev => ({...prev, ...newFilters})); // Merge new filters with existing ones
  };
  
  // Make sure LedgerFilters component receives the updated accountsOptions
  // and uses the correct default account if needed.

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

      <LedgerFilters onFilterChange={handleFilterChange} /> {/* Ensure LedgerFilters is passed accountsOptions if it needs them */}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading ledger data...</p>
        </div>
      ) : (
        <LedgerTable accountName={ledgerData.accountName} transactions={ledgerData.transactions} />
      )}
    </div>
  );
}
