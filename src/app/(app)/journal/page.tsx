"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { JournalTable, type JournalEntry } from "@/components/journal/JournalTable";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { useState, useEffect } from "react";

// Placeholder data fetch function (replace with actual API call)
async function fetchJournalEntries(): Promise<JournalEntry[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real app, this would fetch from Supabase or your backend
  return [
    { id: "1", date: "2024-07-15", description: "Office Supplies Purchase", debitAccount: "Office Expenses", creditAccount: "Cash", amount: 150.75, tags: ["office", "expense"] },
    { id: "2", date: "2024-07-14", description: "Client Payment Received", debitAccount: "Cash", creditAccount: "Service Revenue", amount: 1200.00, tags: ["income", "client A"] },
    { id: "3", date: "2024-07-13", description: "Software Subscription Renewal", debitAccount: "Software Expenses", creditAccount: "Credit Card", amount: 49.99, tags: ["software", "recurring"] },
    { id: "4", date: "2024-07-12", description: "Rent Payment", debitAccount: "Rent Expense", creditAccount: "Bank Account", amount: 850.00, tags: ["rent", "fixed cost"] },
    { id: "5", date: "2024-07-11", description: "Consulting Fee for Project X", debitAccount: "Consulting Expenses", creditAccount: "Cash", amount: 500.00, tags: ["consulting", "project X"] },
    { id: "6", date: "2024-07-10", description: "Utility Bill - Electricity", debitAccount: "Utilities Expense", creditAccount: "Bank Account", amount: 75.20, tags: ["utilities", "electricity"] },
    { id: "7", date: "2024-07-09", description: "Marketing Campaign Ads", debitAccount: "Marketing Expenses", creditAccount: "Credit Card", amount: 220.00, tags: ["marketing", "ads"] },
  ];
}


export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEntries() {
      setIsLoading(true);
      const data = await fetchJournalEntries();
      setEntries(data);
      setIsLoading(false);
    }
    loadEntries();
  }, []);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Journal Entries"
        description="A chronological record of all your financial transactions."
      >
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </PageTitle>
      
      {isLoading ? (
         <div className="flex justify-center items-center h-64">
           <p className="text-muted-foreground">Loading journal entries...</p>
         </div>
      ) : (
        <JournalTable entries={entries} />
      )}
    </div>
  );
}
