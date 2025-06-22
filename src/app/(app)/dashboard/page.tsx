
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


// Cash Account Keywords are now the primary driver for dashboard analytics
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
    refetchInterval: 60000, 
  });

  // Fetch notifications
  const { data: notificationsData, isLoading: isLoadingNotifications } = useQuery<Notification[], Error>({
    queryKey: ['notifications', currentCompanyId],
    queryFn: () => getNotifications(currentCompanyId!),
    enabled: !!currentUser && !!currentCompanyId,
    refetchInterval: 60000, 
  });

  useEffect(() => {
    if (journalEntriesError) {
      toast({ variant: "destructive", title: "Error Loading Entries", description: journalEntriesError.message || "Could not fetch journal entries." });
    }
  }, [journalEntriesError, toast]);

  const processedData = useMemo(() => {
    if (!journalEntriesData) {
      // Return default structure if no data
      return {
        summaryData: { totalCashIn: 0, totalCashOut: 0, netCashFlow: 0, transactionCount: 0 },
        cumulativeCashFlowData: [],
        cashFlowChartData: [],
        spendingBreakdownData: [],
        analyticsKpis: { avgTransactionValue: 0, netCashFlow: 0, cashInTransactions: 0, cashOutTransactions: 0 },
        analyticsExpenseCategories: [],
      };
    }

    const currentLocale = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';
    
    // --- Part 1: Filter entries based on the date range picker ---
    const dateRangeFrom = dateRange?.from || new Date(0);
    const dateRangeTo = dateRange?.to || new Date();
    
    const entriesInDateRange = journalEntriesData.filter(entry => {
        if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
        const [year, month, day] = entry.date.split('-').map(Number);
        const entryDate = new Date(Date.UTC(year, month - 1, day));
        return entryDate >= dateRangeFrom && entryDate <= dateRangeTo;
    });

    // --- Part 2: Calculate summary data based on cash movements ---
    let summaryTotalCashIn = 0;
    let summaryTotalCashOut = 0;

    entriesInDateRange.forEach(entry => {
      if (cashAccountKeywords.some(k => entry.debitAccount.toLowerCase().includes(k))) {
        summaryTotalCashIn += entry.amount;
      }
      if (cashAccountKeywords.some(k => entry.creditAccount.toLowerCase().includes(k))) {
        summaryTotalCashOut += entry.amount;
      }
    });

    const summaryData = {
        totalCashIn: summaryTotalCashIn,
        totalCashOut: summaryTotalCashOut,
        netCashFlow: summaryTotalCashIn - summaryTotalCashOut,
        transactionCount: entriesInDateRange.length,
    };

    // --- Part 3: Calculate data for charts (spanning full months of selection) ---
    const chartDateFrom = dateRange?.from ? startOfMonth(dateRange.from) : new Date(0);
    const chartDateTo = dateRange?.to ? endOfMonth(dateRange.to) : new Date();

    const chartEntries = journalEntriesData.filter(entry => {
        if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
        const [year, month, day] = entry.date.split('-').map(Number);
        const entryDate = new Date(Date.UTC(year, month - 1, day));
        return entryDate >= chartDateFrom && entryDate <= chartDateTo;
    });

    const monthsForCharts = eachMonthOfInterval({ start: chartDateFrom, end: chartDateTo });
    const spendingByCategory: Record<string, number> = {};
    const monthlyCash: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};

    monthsForCharts.forEach(d => {
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        const label = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth())).toLocaleString(currentLocale, { month: 'short', year: '2-digit', timeZone: 'UTC' });
        if (!monthlyCash[key]) monthlyCash[key] = { income: 0, expense: 0, monthLabel: label, yearMonth: key };
    });

    chartEntries.forEach(entry => {
        const key = entry.date.substring(0, 7); 

        // Monthly Cash Flow Logic
        if (monthlyCash[key]) {
            if (cashAccountKeywords.some(k => entry.debitAccount.toLowerCase().includes(k))) {
                monthlyCash[key].income += entry.amount;
            }
            if (cashAccountKeywords.some(k => entry.creditAccount.toLowerCase().includes(k))) {
                monthlyCash[key].expense += entry.amount;
            }
        }
        
        // Spending Breakdown Logic (all cash out)
        if (cashAccountKeywords.some(k => entry.creditAccount.toLowerCase().includes(k))) {
            const category = entry.debitAccount || "Uncategorized";
            spendingByCategory[category] = (spendingByCategory[category] || 0) + entry.amount;
        }
    });

    // --- Part 4: Calculate data for Analytics KPIs (cash based) ---
    let chartCashIn = Object.values(monthlyCash).reduce((acc, cur) => acc + cur.income, 0);
    let chartCashOut = Object.values(monthlyCash).reduce((acc, cur) => acc + cur.expense, 0);
    let cashInTransactions = chartEntries.filter(e => cashAccountKeywords.some(k => e.debitAccount.toLowerCase().includes(k))).length;
    let cashOutTransactions = chartEntries.filter(e => cashAccountKeywords.some(k => e.creditAccount.toLowerCase().includes(k))).length;
    
    const analyticsKpis = {
      avgTransactionValue: (cashInTransactions + cashOutTransactions > 0) ? (chartCashIn + chartCashOut) / (cashInTransactions + cashOutTransactions) : 0,
      netCashFlow: chartCashIn - chartCashOut,
      cashInTransactions: cashInTransactions,
      cashOutTransactions: cashOutTransactions,
    };
    const analyticsExpenseCategories = Object.entries(spendingByCategory).map(([name, total]) => ({name, total})).sort((a,b) => b.total - a.total).slice(0, 7);

    // --- Part 5: Finalize data structures for charts ---
    let cumulativeNetCash = 0;
    const cumulativeCashFlowData = Object.values(monthlyCash).sort((a,b) => a.yearMonth.localeCompare(b.yearMonth)).map(agg => {
        cumulativeNetCash += (agg.income - agg.expense);
        return { month: agg.monthLabel, value: cumulativeNetCash }; // 'value' is for the chart component
    });

    const cashFlowChartData = Object.values(monthlyCash).sort((a,b) => a.yearMonth.localeCompare(b.yearMonth)).map(agg => ({
        month: agg.monthLabel,
        income: agg.income,
        expense: agg.expense,
        net: agg.income - agg.expense,
    }));

    const spendingBreakdownData = Object.entries(spendingByCategory).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);

    return {
        summaryData,
        cumulativeCashFlowData,
        cashFlowChartData,
        spendingBreakdownData,
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
        <SummaryCard title="Total Cash In" value={processedData.summaryData.totalCashIn} icon={TrendingUp} />
        <SummaryCard title="Total Cash Out" value={processedData.summaryData.totalCashOut} icon={TrendingDown} />
        <SummaryCard title="Net Cash Flow" value={processedData.summaryData.netCashFlow} icon={DollarSign} />
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
              <NetIncomeChart data={processedData.cumulativeCashFlowData} isLoading={isLoadingJournalEntries} />
              <div className="grid gap-6 md:grid-cols-2">
                  <CashFlowChart data={processedData.cashFlowChartData} isLoading={isLoadingJournalEntries} />
                  <ExpensesPieChart data={processedData.spendingBreakdownData} isLoading={isLoadingJournalEntries} />
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
