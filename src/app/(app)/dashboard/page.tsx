
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";

interface DashboardTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  debitAccount: string;
  creditAccount: string;
}

interface ChartPoint {
  month: string;
  income: number;
  expense: number;
}

export default function DashboardPage() {
  const [clientLocale, setClientLocale] = useState('en-US');
  const [recentTransactions, setRecentTransactions] = useState<DashboardTransaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allEntries, setAllEntries] = useState<StoredJournalEntry[]>([]);

  const [summaryData, setSummaryData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactionCount: 0,
  });
  const [chartDisplayData, setChartDisplayData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }

    async function loadDashboardData() {
      setIsLoadingData(true);
      try {
        const fetchedEntries = await getJournalEntries();
        setAllEntries(fetchedEntries); // Store all entries for processing

        // Process for Recent Transactions (first 5, sorted by date)
        const sortedEntries = [...fetchedEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestEntries = sortedEntries.slice(0, 5);
        const transformedTransactions: DashboardTransaction[] = latestEntries.map(entry => ({
          id: entry.id,
          date: entry.date,
          description: entry.description,
          amount: entry.amount,
          debitAccount: entry.debitAccount,
          creditAccount: entry.creditAccount,
        }));
        setRecentTransactions(transformedTransactions);

        // Process for Summary Cards and Chart
        let calculatedTotalIncome = 0;
        let calculatedTotalExpenses = 0;
        const incomeKeywords = ['revenue', 'income', 'sales', 'service fee', 'interest received'];
        const expenseKeywords = ['expense', 'cost', 'payroll', 'rent', 'utilities', 'supplies', 'advertising', 'interest paid'];

        const monthlyAggregates: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
        const now = new Date();

        // Initialize last 6 months for the chart
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = d.toLocaleString('default', { month: 'short' });
          if (!monthlyAggregates[yearMonth]) {
            monthlyAggregates[yearMonth] = { income: 0, expense: 0, monthLabel, yearMonth };
          }
        }
        
        fetchedEntries.forEach(entry => {
          let isClassifiedIncome = false;
          let isClassifiedExpense = false;

          // Classify for total summary
          if (incomeKeywords.some(keyword => entry.creditAccount.toLowerCase().includes(keyword))) {
            calculatedTotalIncome += entry.amount;
            isClassifiedIncome = true;
          }
          if (expenseKeywords.some(keyword => entry.debitAccount.toLowerCase().includes(keyword))) {
            calculatedTotalExpenses += entry.amount;
            isClassifiedExpense = true;
          }

          // Process for chart data (only entries within the last 6 months)
          const entryDate = new Date(entry.date);
          const entryYearMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

          if (monthlyAggregates[entryYearMonth]) { // Check if the entry's month is one of the 6 we are tracking
            if (isClassifiedIncome) {
              monthlyAggregates[entryYearMonth].income += entry.amount;
            } else if (isClassifiedExpense) {
              monthlyAggregates[entryYearMonth].expense += entry.amount;
            } else { 
              // Fallback for chart: if not classified by keywords, check cash/bank accounts for flow direction
              if (entry.debitAccount.toLowerCase().includes('cash') || entry.debitAccount.toLowerCase().includes('bank')) {
                monthlyAggregates[entryYearMonth].income += entry.amount; // Inflow to cash/bank
              } else if (entry.creditAccount.toLowerCase().includes('cash') || entry.creditAccount.toLowerCase().includes('bank')) {
                monthlyAggregates[entryYearMonth].expense += entry.amount; // Outflow from cash/bank
              }
            }
          }
        });

        setSummaryData({
          totalIncome: calculatedTotalIncome,
          totalExpenses: calculatedTotalExpenses,
          netProfit: calculatedTotalIncome - calculatedTotalExpenses,
          transactionCount: fetchedEntries.length,
        });

        const newChartData = Object.values(monthlyAggregates)
          .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)) // Sort chronologically
          .map(agg => ({ month: agg.monthLabel, income: agg.income, expense: agg.expense }));
        setChartDisplayData(newChartData);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
         setSummaryData({ totalIncome: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });
         setChartDisplayData( // Provide default empty structure for chart
            Array.from({ length: 6 }).map((_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                return { month: d.toLocaleString('default', { month: 'short' }), income: 0, expense: 0 };
            })
         );
      } finally {
        setIsLoadingData(false);
      }
    }
    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Re-fetch if needed, e.g., on a refresh button or when entries might change (requires more complex state management)


  return (
    <div className="space-y-6 md:space-y-8">
      <PageTitle title="Dashboard" description="Welcome back! Here's a summary of your finances." />

      {isLoadingData ? (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => ( <Card key={i} className="shadow-md h-32 animate-pulse bg-muted/50"/> ))}
         </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Income" value={summaryData.totalIncome.toLocaleString(clientLocale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={TrendingUp} />
          <SummaryCard title="Total Expenses" value={summaryData.totalExpenses.toLocaleString(clientLocale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={TrendingDown} />
          <SummaryCard title="Net Profit" value={summaryData.netProfit.toLocaleString(clientLocale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })} icon={DollarSign} />
          <SummaryCard title="Transactions" value={String(summaryData.transactionCount)} icon={FileText} />
        </div>
      )}


      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
           <IncomeExpenseChart chartData={chartDisplayData} isLoading={isLoadingData} />
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
          {isLoadingData ? (
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
