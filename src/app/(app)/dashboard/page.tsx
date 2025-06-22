
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

  // Data processing logic moved to useMemo for efficiency and to fix crash
  const processedData = useMemo(() => {
     if (!journalEntriesData) {
        return {
            summaryData: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 },
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

    let summaryTotalRevenue = 0;
    let summaryTotalExpenses = 0;
    
    summaryEntries.forEach(entry => {
      const isIncome = incomeKeywords.some(keyword => entry.creditAccount?.toLowerCase().includes(keyword));
      const isExpense = expenseKeywords.some(keyword => entry.debitAccount?.toLowerCase().includes(keyword));
      if (isIncome) summaryTotalRevenue += entry.amount;
      if (isExpense) summaryTotalExpenses += entry.amount;
    });

    const summaryData = {
        totalRevenue: summaryTotalRevenue,
        totalExpenses: summaryTotalExpenses,
        netProfit: summaryTotalRevenue - summaryTotalExpenses,
        transactionCount: summaryEntries.length,
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
    
    let chartTotalRevenue = 0;
    let chartTotalExpenses = 0;
    let incomeTransactionsCount = 0;
    let expenseTransactionsCount = 0;
    const expensesByCategory: Record<string, number> = {};
    
    const monthlyAggregates: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
    const monthsForCharts = eachMonthOfInterval({ start: chartDateFrom, end: chartDateTo });

    monthsForCharts.forEach(d => {
        const yearMonthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const monthLabel = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth())).toLocaleString(currentLocale, { month: 'short', year: '2-digit', timeZone: 'UTC' });
        if (!monthlyAggregates[yearMonthKey]) {
            monthlyAggregates[yearMonthKey] = { income: 0, expense: 0, monthLabel, yearMonth: yearMonthKey };
        }
    });

    chartEntries.forEach(entry => {
      const isIncome = incomeKeywords.some(keyword => entry.creditAccount?.toLowerCase().includes(keyword));
      const isExpense = expenseKeywords.some(keyword => entry.debitAccount?.toLowerCase().includes(keyword));
      
      const [entryYear, entryMonth, ] = entry.date.split('-').map(Number);
      const yearMonthKey = `${entryYear}-${String(entryMonth).padStart(2, '0')}`;
      
      if (isIncome) {
          chartTotalRevenue += entry.amount;
          incomeTransactionsCount++;
          if (monthlyAggregates[yearMonthKey]) monthlyAggregates[yearMonthKey].income += entry.amount;
      }
      
      if (isExpense) {
          chartTotalExpenses += entry.amount;
          expenseTransactionsCount++;
          if (monthlyAggregates[yearMonthKey]) monthlyAggregates[yearMonthKey].expense += entry.amount;
          const category = entry.debitAccount || "Uncategorized";
          expensesByCategory[category] = (expensesByCategory[category] || 0) + entry.amount;
      }
    });
    
    const totalTransactions = incomeTransactionsCount + expenseTransactionsCount;
    const analyticsKpis = {
      avgTransactionValue: totalTransactions > 0 ? (chartTotalRevenue + chartTotalExpenses) / totalTransactions : 0,
      profitMargin: chartTotalRevenue > 0 ? ( (chartTotalRevenue - chartTotalExpenses) / chartTotalRevenue ) * 100 : 0,
      incomeTransactions: incomeTransactionsCount,
      expenseTransactions: expenseTransactionsCount,
    };
    const analyticsExpenseCategories = Object.entries(expensesByCategory).map(([name, total]) => ({name, total})).sort((a,b) => b.total - a.total).slice(0, 7);

    let cumulativeNetIncome = 0;
    const netIncomeForChart: { month: string; netIncome: number }[] = [];
    const cashFlowForChart: { month: string; income: number; expense: number; net: number }[] = [];
    Object.values(monthlyAggregates).sort((a,b) => a.yearMonth.localeCompare(b.yearMonth)).forEach(agg => {
        const monthlyNet = agg.income - agg.expense;
        cumulativeNetIncome += monthlyNet;
        netIncomeForChart.push({ month: agg.monthLabel, netIncome: cumulativeNetIncome });
        cashFlowForChart.push({ month: agg.monthLabel, income: agg.income, expense: agg.expense, net: monthlyNet });
    });
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
        <SummaryCard title="Burn Rate" value={processedData.summaryData.totalExpenses} icon={TrendingDown} />
        <SummaryCard title="Net Profit" value={processedData.summaryData.netProfit} icon={TrendingUp} />
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
