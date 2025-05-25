
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react"; // Removed Users icon
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";

// Define a type for dashboard transactions if it differs from StoredJournalEntry
interface DashboardTransaction {
  id: string;
  date: string;
  description: string;
  amount: number; // This will be signed (+ for income, - for expense)
  debitAccount: string;
  creditAccount: string;
  // category?: string; // Keeping it simple, not transforming to category for now
}

export default function DashboardPage() {
  const [clientLocale, setClientLocale] = useState('en-US');
  const [recentTransactions, setRecentTransactions] = useState<DashboardTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Placeholder summary data - will be calculated later if needed
  const [summaryData, setSummaryData] = useState({
    totalIncome: 12450, // Example static values
    totalExpenses: 3890,
    netProfit: 8560,
    transactionCount: 0, // Will be updated from fetched data
  });

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }

    async function loadRecentTransactions() {
      setIsLoadingTransactions(true);
      try {
        const allEntries = await getJournalEntries();
        const sortedEntries = allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestEntries = sortedEntries.slice(0, 5);

        const transformedTransactions: DashboardTransaction[] = latestEntries.map(entry => {
          // Basic logic for amount sign (can be refined)
          // For simplicity, we'll just use the entry.amount and let table display it.
          // Or, if we want signed amounts:
          // let signedAmount = entry.amount;
          // if (entry.creditAccount.toLowerCase().includes('cash') || entry.creditAccount.toLowerCase().includes('bank')) {
          //   signedAmount = -entry.amount; // Outflow
          // } else if (entry.debitAccount.toLowerCase().includes('cash') || entry.debitAccount.toLowerCase().includes('bank')) {
          //   signedAmount = entry.amount; // Inflow
          // }
          // For now, let's keep amount unsigned and rely on debit/credit for context
          return {
            id: entry.id,
            date: entry.date,
            description: entry.description,
            amount: entry.amount,
            debitAccount: entry.debitAccount,
            creditAccount: entry.creditAccount,
          };
        });
        setRecentTransactions(transformedTransactions);
        setSummaryData(prev => ({ ...prev, transactionCount: allEntries.length }));
      } catch (error) {
        console.error("Failed to load recent transactions for dashboard:", error);
      } finally {
        setIsLoadingTransactions(false);
      }
    }
    loadRecentTransactions();
  }, []);


  return (
    <div className="space-y-6 md:space-y-8">
      <PageTitle title="Dashboard" description="Welcome back! Here's a summary of your finances." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Income" value={summaryData.totalIncome.toLocaleString(clientLocale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={TrendingUp} change="+15.2% from last month" changeType="positive" />
        <SummaryCard title="Total Expenses" value={summaryData.totalExpenses.toLocaleString(clientLocale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={TrendingDown} change="+5.1% from last month" changeType="negative"/>
        <SummaryCard title="Net Profit" value={summaryData.netProfit.toLocaleString(clientLocale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={DollarSign} />
        <SummaryCard title="Transactions" value={String(summaryData.transactionCount)} icon={FileText} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
           <IncomeExpenseChart />
        </div>
        <div className="md:col-span-1">
            <QuickActions />
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activities.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : recentTransactions.length === 0 ? (
             <div className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">No recent transactions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{transaction.debitAccount}</TableCell>
                    <TableCell>{transaction.creditAccount}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {transaction.amount.toLocaleString(clientLocale, { style: 'currency', currency: 'USD' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
