
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { DollarSign, TrendingUp, TrendingDown, Activity, CalendarDays, Download, AlertCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { getJournalEntries, type StoredJournalEntry, getNotifications, type Notification } from "@/lib/data-service";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from 'next/navigation';
import { Alert, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert";
import { useQuery } from '@tanstack/react-query';
import { NetIncomeChart } from "@/components/dashboard/NetIncomeChart";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpensesPieChart } from "@/components/dashboard/ExpensesPieChart";
import { AnalyticsOverview, type AnalyticsKpiData, type ExpenseCategoryData } from "@/components/dashboard/AnalyticsOverview";
import { NotificationList } from "@/components/dashboard/NotificationList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";


export const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received', 'consulting income', 'project revenue', 'deposit', 'commission', 'dividend'];
export const expenseKeywords = ['expense', 'cost', 'supply', 'rent', 'salary', 'utility', 'utilities', 'purchase', 'advertising', 'maintenance', 'insurance', 'interest paid', 'fee', 'software', 'development', 'services', 'consulting', 'contractor', 'design', 'travel', 'subscription', 'depreciation', 'amortization', 'office supplies', 'postage', 'printing', 'repairs', 'cogs', 'cost of goods sold'];
export const cashAccountKeywords = ['cash', 'bank', 'company account'];


export default function DashboardPage() {
  const { user: currentUser, currentCompanyId } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(subMonths(today, 5)),
      to: endOfMonth(today),
    };
  });
  const { toast } = useToast();
  const pathname = usePathname();

  // Fetch journal entries
  const { data: journalEntriesData, isLoading: isLoadingJournalEntries, error: journalEntriesError } = useQuery<StoredJournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentUser && !!currentCompanyId,
    refetchInterval: 60000, // Refetch journal entries every 60 seconds to see updates
  });

  // Fetch notifications
  const { data: notificationsData, isLoading: isLoadingNotifications } = useQuery<Notification[], Error>({
    queryKey: ['notifications', currentCompanyId],
    queryFn: () => getNotifications(currentCompanyId!),
    enabled: !!currentUser && !!currentCompanyId,
    refetchInterval: 60000, // Refetch notifications every 60 seconds
  });

  useEffect(() => {
    if (journalEntriesError) {
      toast({ variant: "destructive", title: "Error Loading Entries", description: journalEntriesError.message || "Could not fetch journal entries." });
    }
  }, [journalEntriesError, toast]);

  const processedData = useMemo(() => {
    if (!journalEntriesData) {
      return {
        summaryData: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0, burnRate: 0 },
        netIncomeChartData: [],
        cashFlowChartData: [],
        expensesPieChartData: [],
        analyticsKpis: { avgTransactionValue: 0, profitMargin: 0, incomeTransactions: 0, expenseTransactions: 0 },
        analyticsExpenseCategories: [],
      };
    }

    const currentLocale = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';

    // --- Part 1: Calculations for Summary Cards (Exact Date Range) ---
    const summaryDateFrom = dateRange?.from || new Date(0);
    const summaryDateTo = dateRange?.to || new Date();
    
    const summaryEntries = journalEntriesData.filter(entry => {
        if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
        const [year, month, day] = entry.date.split('-').map(Number);
        const entryDate = new Date(Date.UTC(year, month - 1, day));
        return entryDate >= summaryDateFrom && entryDate <= summaryDateTo;
    });

    let summaryTotalRevenue = 0;    // P&L
    let summaryTotalExpenses = 0;   // P&L
    let summaryCashOut = 0;         // Cash Flow

    summaryEntries.forEach(entry => {
      // P&L Calculation
      if (incomeKeywords.some(k => entry.creditAccount?.toLowerCase().includes(k))) {
        summaryTotalRevenue += entry.amount;
      }
      if (expenseKeywords.some(k => entry.debitAccount?.toLowerCase().includes(k))) {
        summaryTotalExpenses += entry.amount;
      }
      // Cash Flow Calculation
      if (cashAccountKeywords.some(k => entry.creditAccount.toLowerCase().includes(k))) {
        summaryCashOut += entry.amount;
      }
    });

    const summaryData = {
        totalRevenue: summaryTotalRevenue,
        totalExpenses: summaryTotalExpenses, // This is P&L expenses for Net Profit calculation
        netProfit: summaryTotalRevenue - summaryTotalExpenses,
        transactionCount: summaryEntries.length,
        burnRate: summaryCashOut, // This is for the "Burn Rate" summary card
    };

    // --- Part 2: Calculations for Charts & Analytics (Full Month Range) ---
    const chartDateFrom = dateRange?.from ? startOfMonth(dateRange.from) : new Date(0);
    const chartDateTo = dateRange?.to ? endOfMonth(dateRange.to) : new Date();

    const chartEntries = journalEntriesData.filter(entry => {
        if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
        const [year, month, day] = entry.date.split('-').map(Number);
        const entryDate = new Date(Date.UTC(year, month - 1, day));
        return entryDate >= chartDateFrom && entryDate <= chartDateTo;
    });

    const monthsForCharts = eachMonthOfInterval({ start: chartDateFrom, end: chartDateTo });
    const expensesByCategory: Record<string, number> = {};
    const monthlyPnL: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
    const monthlyCash: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};

    // Initialize monthly aggregates
    monthsForCharts.forEach(d => {
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const label = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth())).toLocaleString(currentLocale, { month: 'short', year: '2-digit', timeZone: 'UTC' });
        if (!monthlyPnL[key]) monthlyPnL[key] = { income: 0, expense: 0, monthLabel: label, yearMonth: key };
        if (!monthlyCash[key]) monthlyCash[key] = { income: 0, expense: 0, monthLabel: label, yearMonth: key };
    });

    // Populate monthly aggregates
    chartEntries.forEach(entry => {
        const key = entry.date.substring(0, 7); // YYYY-MM

        // P&L Logic for Net Income & Expense Pie charts
        if (monthlyPnL[key]) {
            if (incomeKeywords.some(k => entry.creditAccount?.toLowerCase().includes(k))) {
                monthlyPnL[key].income += entry.amount;
            }
            if (expenseKeywords.some(k => entry.debitAccount?.toLowerCase().includes(k))) {
                monthlyPnL[key].expense += entry.amount;
                const category = entry.debitAccount || "Uncategorized";
                expensesByCategory[category] = (expensesByCategory[category] || 0) + entry.amount;
            }
        }

        // Cash Flow Logic for Cash Flow Chart
        if (monthlyCash[key]) {
            if (cashAccountKeywords.some(k => entry.debitAccount.toLowerCase().includes(k))) {
                monthlyCash[key].income += entry.amount; // Cash In
            }
            if (cashAccountKeywords.some(k => entry.creditAccount.toLowerCase().includes(k))) {
                monthlyCash[key].expense += entry.amount; // Cash Out
            }
        }
    });

    // P&L based analytics KPIs
    let chartPnlRevenue = Object.values(monthlyPnL).reduce((acc, cur) => acc + cur.income, 0);
    let chartPnlExpenses = Object.values(monthlyPnL).reduce((acc, cur) => acc + cur.expense, 0);
    let pnlIncomeTransactions = chartEntries.filter(e => incomeKeywords.some(k => e.creditAccount?.toLowerCase().includes(k))).length;
    let pnlExpenseTransactions = chartEntries.filter(e => expenseKeywords.some(k => e.debitAccount?.toLowerCase().includes(k))).length;

    const analyticsKpis = {
      avgTransactionValue: (pnlIncomeTransactions + pnlExpenseTransactions > 0) ? (chartPnlRevenue + chartPnlExpenses) / (pnlIncomeTransactions + pnlExpenseTransactions) : 0,
      profitMargin: chartPnlRevenue > 0 ? ((chartPnlRevenue - chartPnlExpenses) / chartPnlRevenue) * 100 : 0,
      incomeTransactions: pnlIncomeTransactions,
      expenseTransactions: pnlExpenseTransactions,
    };
    const analyticsExpenseCategories = Object.entries(expensesByCategory).map(([name, total]) => ({name, total})).sort((a,b) => b.total - a.total).slice(0, 7);

    // Build Net Income Chart data from P&L
    let cumulativeNetIncome = 0;
    const netIncomeForChart = Object.values(monthlyPnL).sort((a,b) => a.yearMonth.localeCompare(b.yearMonth)).map(agg => {
        cumulativeNetIncome += (agg.income - agg.expense);
        return { month: agg.monthLabel, netIncome: cumulativeNetIncome };
    });

    // Build Cash Flow Chart data from Cash Flow
    const cashFlowForChart = Object.values(monthlyCash).sort((a,b) => a.yearMonth.localeCompare(b.yearMonth)).map(agg => ({
        month: agg.monthLabel,
        income: agg.income,
        expense: agg.expense,
        net: agg.income - agg.expense,
    }));

    // Build Expenses Pie Chart from P&L expenses
    const expensesPieChartData = Object.entries(expensesByCategory).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);

    return {
        summaryData,
        netIncomeChartData: netIncomeForChart,
        cashFlowChartData: cashFlowForChart,
        expensesPieChartData,
        analyticsKpis,
        analyticsExpenseCategories
    };

  }, [journalEntriesData, dateRange]);


  const handleDownloadReport = () => {
    toast({ title: "Feature In Development", description: "CSV/PDF report downloads are coming soon!" });
  };

  const isLoading = isLoadingJournalEntries || isLoadingNotifications;

  if (!currentCompanyId && !isLoading && pathname === '/dashboard') {
    return (
      <div className="space-y-6 md:space-y-8 p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescriptionComponent>
            No Company ID selected. Please go to the login page to set a Company ID.
          </AlertDescriptionComponent>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageTitle title={`Dashboard ${currentCompanyId ? `(${currentCompanyId})` : ''}`} />
        <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-[260px] justify-start text-left font-normal bg-card hover:bg-accent hover:text-accent-foreground"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          <Button variant="default" onClick={handleDownloadReport} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </div>
      
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Revenue" value={processedData.summaryData.totalRevenue} icon={DollarSign} />
        <SummaryCard title="Burn Rate (Cash Out)" value={processedData.summaryData.burnRate} icon={TrendingDown} />
        <SummaryCard title="Net Profit (P&L)" value={processedData.summaryData.netProfit} icon={TrendingUp} />
        <SummaryCard title="Transactions" value={processedData.summaryData.transactionCount} icon={Activity} isCurrency={false} />
      </div>

       <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-96 rounded-lg" />
              <div className="grid gap-6 lg:grid-cols-2">
                <Skeleton className="h-80 rounded-lg" />
                <Skeleton className="h-80 rounded-lg" />
              </div>
              <Skeleton className="h-96 rounded-lg" />
            </div>
          ) : (
            <>
              <NetIncomeChart data={processedData.netIncomeChartData} isLoading={isLoadingJournalEntries} />
              <div className="grid gap-6 md:grid-cols-2">
                  <CashFlowChart data={processedData.cashFlowChartData} isLoading={isLoadingJournalEntries} />
                  <ExpensesPieChart data={processedData.expensesPieChartData} isLoading={isLoadingJournalEntries} />
              </div>
              <AnalyticsOverview kpis={processedData.analyticsKpis} expenseCategories={processedData.analyticsExpenseCategories} isLoading={isLoadingJournalEntries} />
            </>
          )}
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
            <NotificationList notifications={notificationsData || []} isLoading={isLoadingNotifications} />
        </TabsContent>
       </Tabs>
    </div>
  );
}
