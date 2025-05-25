"use client";

import { useState, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/PageTitle";
import { LedgerFilters } from "@/components/ledger/LedgerFilters";
import { LedgerTable, type LedgerTransaction } from "@/components/ledger/LedgerTable";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { DateRange } from "react-day-picker";

// Placeholder data generation (replace with actual API call)
const allAccountsData: Record<string, LedgerTransaction[]> = {
  "cash": [
    { id: "c1", date: "2024-07-01", description: "Opening Balance", debit: 1000.00, credit: null, balance: 1000.00, tags: ["initial"] },
    { id: "c2", date: "2024-07-05", description: "Received from Client A", debit: 500.00, credit: null, balance: 1500.00, tags: ["income", "client A"] },
    { id: "c3", date: "2024-07-08", description: "Paid for Office Supplies", debit: null, credit: 75.50, balance: 1424.50, tags: ["expense", "office"] },
  ],
  "accounts_receivable": [
    { id: "ar1", date: "2024-07-02", description: "Invoice #101 to Client A", debit: 500.00, credit: null, balance: 500.00, tags: ["invoice", "client A"] },
    { id: "ar2", date: "2024-07-05", description: "Payment for Invoice #101", debit: null, credit: 500.00, balance: 0.00, tags: ["payment", "client A"] },
  ],
  "office_expenses": [
    { id: "oe1", date: "2024-07-08", description: "Stationery Purchase", debit: 75.50, credit: null, balance: 75.50, tags: ["supplies"] },
    { id: "oe2", date: "2024-07-15", description: "Printer Ink", debit: 45.00, credit: null, balance: 120.50, tags: ["supplies"] },
  ],
  "service_revenue": [
     { id: "sr1", date: "2024-07-05", description: "Consulting for Client A", debit: null, credit: 500.00, balance: -500.00, tags: ["consulting", "client A"] },
     { id: "sr2", date: "2024-07-18", description: "Project Fee Client B", debit: null, credit: 1200.00, balance: -1700.00, tags: ["project", "client B"] },
  ],
   "bank_account": [
    { id: "bk1", date: "2024-07-01", description: "Initial Deposit", debit: 5000.00, credit: null, balance: 5000.00 },
    { id: "bk2", date: "2024-07-12", description: "Rent Payment", debit: null, credit: 850.00, balance: 4150.00, tags: ["rent"] },
  ]
};

async function fetchLedgerTransactions(
  account?: string, 
  dateRange?: DateRange, 
  searchTerm?: string
): Promise<{ accountName: string; transactions: LedgerTransaction[] }> {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  
  const selectedAccountKey = account || "cash"; // Default to cash if no account selected
  const accountName = accountsOptions.find(acc => acc.value === selectedAccountKey)?.label || "Cash";
  
  let transactions = allAccountsData[selectedAccountKey] || [];

  if (dateRange?.from) {
    transactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (dateRange.to) {
        return txDate >= dateRange.from! && txDate <= dateRange.to!;
      }
      return txDate >= dateRange.from!;
    });
  }

  if (searchTerm) {
    transactions = transactions.filter(tx => 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Recalculate balance for filtered transactions
  let runningBalance = 0;
  const processedTransactions = transactions.map(tx => {
    if(tx.debit) runningBalance += tx.debit;
    if(tx.credit) runningBalance -= tx.credit;
    // For revenue/expense accounts, balance might be tracked differently.
    // This example assumes asset/liability style balance tracking.
    // For a real ledger, this logic needs to be robust based on account type.
    // If the base data already has correct running balances for the full set,
    // and we are just filtering, we might not need to recalculate IF the first item is an opening balance.
    // For simplicity, let's assume the sample data's balance is sequential for this example.
    // A more robust solution might involve fetching opening balance for the period.
    return { ...tx, balance: runningBalance }; 
  });


  return { accountName, transactions: processedTransactions };
}

const accountsOptions = [
  { value: "cash", label: "Cash" },
  { value: "accounts_receivable", label: "Accounts Receivable" },
  { value: "office_expenses", label: "Office Expenses" },
  { value: "service_revenue", label: "Service Revenue" },
  { value: "bank_account", label: "Bank Account" },
];

export default function LedgerPage() {
  const [ledgerData, setLedgerData] = useState<{ accountName: string; transactions: LedgerTransaction[] }>({ accountName: "Cash", transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<{ account?: string; dateRange?: DateRange, searchTerm?: string  }>({ account: "cash" });

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
    setCurrentFilters(newFilters);
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
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading ledger data...</p>
        </div>
      ) : (
        <LedgerTable accountName={ledgerData.accountName} transactions={ledgerData.transactions} />
      )}
    </div>
  );
}
