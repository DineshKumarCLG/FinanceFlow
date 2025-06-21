
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { DollarSign, TrendingUp, TrendingDown, Activity, CalendarDays, Download, AlertCircle, BarChart2, FileText, Bell, Percent, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname } from 'next/navigation';
import { Alert, AlertDescription as AlertDescriptionComponent, AlertTitle } from "@/components/ui/alert";
import { useQuery } from '@tanstack/react-query';
import { NetIncomeChart } from "@/components/dashboard/NetIncomeChart";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpensesPieChart } from "@/components/dashboard/ExpensesPieChart";
import { AnalyticsOverview, type AnalyticsKpiData, type ExpenseCategoryData } from "@/components/dashboard/AnalyticsOverview";


export const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received', 'consulting income', 'project revenue', 'deposit', 'commission', 'dividend'];
export const expenseKeywords = ['expense', 'cost', 'supply', 'rent', 'salary', 'utility', 'utilities', 'purchase', 'advertising', 'maintenance', 'insurance', 'interest paid', 'fee', 'software', 'development', 'services', 'consulting', 'contractor', 'design', 'travel', 'subscription', 'depreciation', 'amortization', 'office supplies', 'postage', 'printing', 'repairs'];


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

  // State for processed data for all components
  const [summaryData, setSummaryData] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });
  const [netIncomeChartData, setNetIncomeChartData] = useState<{ month: string; netIncome: number }[]>([]);
  const [cashFlowChartData, setCashFlowChartData] = useState<{ month: string; income: number; expense: number; net: number }[]>([]);
  const [expensesPieChartData, setExpensesPieChartData] = useState<{ name: string; total: number }[]>([]);
  const [analyticsKpis, setAnalyticsKpis] = useState<AnalyticsKpiData>({ avgTransactionValue: 0, profitMargin: 0, incomeTransactions: 0, expenseTransactions: 0 });
  const [analyticsExpenseCategories, setAnalyticsExpenseCategories] = useState<ExpenseCategoryData[]>([]);

  // Fetch journal entries
  const { data: journalEntriesData, isLoading: isLoadingJournalEntries, error: journalEntriesError } = useQuery<StoredJournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentUser && !!currentCompanyId,
  });

  useEffect(() => {
    if (journalEntriesError) {
      toast({ variant: "destructive", title: "Error Loading Entries", description: journalEntriesError.message || "Could not fetch journal entries." });
    }
  }, [journalEntriesError, toast]);

  // Data processing logic
  useEffect(() => {
    if (!journalEntriesData) return;

    const currentLocale = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';
    const dateRangeFrom = dateRange?.from || new Date(0);
    const dateRangeTo = dateRange?.to || new Date();

    // Filter entries based on the date range
    const entriesInDateRange = journalEntriesData.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= dateRangeFrom && entryDate <= dateRangeTo;
    });

    let calculatedTotalRevenue = 0;
    let calculatedTotalExpenses = 0;
    let incomeTransactionsCount = 0;
    let expenseTransactionsCount = 0;
    
    const expensesByCategory: Record<string, number> = {};
    
    const monthlyAggregates: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
    const monthsForCharts = eachMonthOfInterval({ start: dateRangeFrom, end: dateRangeTo });
    monthsForCharts.forEach(d => {
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleString(currentLocale, { month: 'short', year: '2-digit' });
        if (!monthlyAggregates[yearMonth]) {
            monthlyAggregates[yearMonth] = { income: 0, expense: 0, monthLabel, yearMonth };
        }
    });

    entriesInDateRange.forEach(entry => {
      let isIncomeEntry = incomeKeywords.some(keyword => entry.creditAccount?.toLowerCase().includes(keyword));
      let isExpenseEntry = expenseKeywords.some(keyword => entry.debitAccount?.toLowerCase().includes(keyword));
      
      const yearMonth = `${new Date(entry.date).getFullYear()}-${String(new Date(entry.date).getMonth() + 1).padStart(2, '0')}`;
      
      if (isIncomeEntry) {
          calculatedTotalRevenue += entry.amount;
          incomeTransactionsCount++;
          if (monthlyAggregates[yearMonth]) monthlyAggregates[yearMonth].income += entry.amount;
      }
      if (isExpenseEntry) {
          calculatedTotalExpenses += entry.amount;
          expenseTransactionsCount++;
          if (monthlyAggregates[yearMonth]) monthlyAggregates[yearMonth].expense += entry.amount;
          const category = entry.debitAccount || "Uncategorized";
          expensesByCategory[category] = (expensesByCategory[category] || 0) + entry.amount;
      }
    });

    // Set Summary KPIs for Overview Tab
    setSummaryData({
        totalRevenue: calculatedTotalRevenue,
        totalExpenses: calculatedTotalExpenses,
        netProfit: calculatedTotalRevenue - calculatedTotalExpenses,
        transactionCount: entriesInDateRange.length,
    });
    
    // Set Analytics KPIs
    const totalTransactions = incomeTransactionsCount + expenseTransactionsCount;
    setAnalyticsKpis({
      avgTransactionValue: totalTransactions > 0 ? (calculatedTotalRevenue + calculatedTotalExpenses) / totalTransactions : 0,
      profitMargin: calculatedTotalRevenue > 0 ? ( (calculatedTotalRevenue - calculatedTotalExpenses) / calculatedTotalRevenue ) * 100 : 0,
      incomeTransactions: incomeTransactionsCount,
      expenseTransactions: expenseTransactionsCount,
    });
    setAnalyticsExpenseCategories(Object.entries(expensesByCategory).map(([name, total]) => ({name, total})).sort((a,b) => b.total - a.total).slice(0, 7));

    // Prepare data for charts in Overview Tab
    let cumulativeNetIncome = 0;
    const netIncomeForChart: { month: string; netIncome: number }[] = [];
    const cashFlowForChart: { month: string; income: number; expense: number; net: number }[] = [];
    Object.values(monthlyAggregates).sort((a,b) => a.yearMonth.localeCompare(b.yearMonth)).forEach(agg => {
        const monthlyNet = agg.income - agg.expense;
        cumulativeNetIncome += monthlyNet;
        netIncomeForChart.push({ month: agg.monthLabel, netIncome: cumulativeNetIncome });
        cashFlowForChart.push({ month: agg.monthLabel, income: agg.income, expense: agg.expense, net: monthlyNet });
    });
    setNetIncomeChartData(netIncomeForChart);
    setCashFlowChartData(cashFlowForChart);
    setExpensesPieChartData(Object.entries(expensesByCategory).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total));

  }, [journalEntriesData, dateRange]);


  const handleDownloadReport = () => {
    toast({ title: "Feature In Development", description: "CSV/PDF report downloads are coming soon!" });
  };

  const isLoading = isLoadingJournalEntries;

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

      {isLoading ? (
        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
          <Skeleton className="h-96 rounded-lg" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Revenue" value={summaryData.totalRevenue} icon={DollarSign} />
            <SummaryCard title="Burn Rate" value={summaryData.totalExpenses} icon={TrendingDown} />
            <SummaryCard title="Net Profit" value={summaryData.netProfit} icon={TrendingUp} />
            <SummaryCard title="Transactions" value={summaryData.transactionCount} icon={Activity} isCurrency={false} />
          </div>

          <NetIncomeChart data={netIncomeChartData} isLoading={isLoading} />
          
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <CashFlowChart data={cashFlowChartData} isLoading={isLoading} />
            </div>
            <div className="lg:col-span-2">
              <ExpensesPieChart data={expensesPieChartData} isLoading={isLoading} />
            </div>
          </div>

          <AnalyticsOverview kpis={analyticsKpis} expenseCategories={analyticsExpenseCategories} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
