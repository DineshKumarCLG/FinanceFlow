
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { DollarSign, TrendingUp, TrendingDown, Activity, CalendarDays, Download, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { UserSpendingList, type UserSpending } from "@/components/dashboard/UserSpendingList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { getJournalEntries, type JournalEntry as StoredJournalEntry, getNotifications } from "@/lib/data-service";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert";
import { useQuery } from '@tanstack/react-query';

import type { AnalyticsKpiData, ExpenseCategoryData as AnalyticsExpenseCategoryData } from "@/components/dashboard/AnalyticsOverview";
const AnalyticsOverview = dynamic(() => import('@/components/dashboard/AnalyticsOverview').then(mod => mod.AnalyticsOverview), {
  ssr: false,
  loading: () => <div className="grid gap-6"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div><Skeleton className="h-80 rounded-lg" /></div>
});

import type { ProfitLossReportData, ReportLineItem as PLReportLineItem } from "@/components/dashboard/ProfitLossReport";
const ProfitLossReport = dynamic(() => import('@/components/dashboard/ProfitLossReport').then(mod => mod.ProfitLossReport), {
  ssr: false,
  loading: () => {
    const { Card: DynCard, CardHeader: DynCardHeader, CardContent: DynCardContent } = require('@/components/ui/card');
    const { Skeleton: DynSkeleton } = require('@/components/ui/skeleton');
    return <DynCard><DynCardHeader><DynSkeleton className="h-6 w-1/2 mb-2" /><DynSkeleton className="h-4 w-1/3" /></DynCardHeader><DynCardContent><DynSkeleton className="h-40 w-full" /></DynCardContent></DynCard>;
  }
});

import type { Notification } from "@/lib/data-service";
const NotificationList = dynamic(() => import('@/components/dashboard/NotificationList').then(mod => mod.NotificationList), {
  ssr: false,
  loading: () => {
    const { Card: DynCard, CardHeader: DynCardHeader, CardTitle: DynCardTitle, CardDescription: DynCardDescription, CardContent: DynCardContent } = require('@/components/ui/card');
    const { Skeleton: DynSkeleton } = require('@/components/ui/skeleton');
    return (
      <DynCard>
        <DynCardHeader>
          <DynCardTitle>Notifications</DynCardTitle>
          <DynCardDescription>Loading latest updates...</DynCardDescription>
        </DynCardHeader>
        <DynCardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted"></div>
              <div className="flex-1 space-y-2">
                <DynSkeleton className="h-4 bg-muted rounded w-3/4" />
                <DynSkeleton className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </DynCardContent>
      </DynCard>
    );
  }
});


interface ChartPoint {
  month: string;
  income: number;
  expense: number;
}

export const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received', 'consulting income', 'project revenue', 'deposit', 'commission', 'dividend'];
export const expenseKeywords = ['expense', 'cost', 'supply', 'rent', 'salary', 'utility', 'utilities', 'purchase', 'advertising', 'maintenance', 'insurance', 'interest paid', 'fee', 'software', 'development', 'services', 'consulting', 'contractor', 'design', 'travel', 'subscription', 'depreciation', 'amortization', 'office supplies', 'postage', 'printing', 'repairs'];


export default function DashboardPage() {
  const { user: currentUser, currentCompanyId } = useAuth();
  const [clientLocale, setClientLocale] = useState('en-US');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(subMonths(today, 5)),
      to: endOfMonth(today),
    };
  });
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");

  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactionCount: 0,
  });
  const [chartDisplayData, setChartDisplayData] = useState<ChartPoint[]>([]);
  const [userSpendingData, setUserSpendingData] = useState<UserSpending[]>([]);
  const [analyticsKpis, setAnalyticsKpis] = useState<AnalyticsKpiData>({
    avgTransactionValue: 0, profitMargin: 0, incomeTransactions: 0, expenseTransactions: 0,
  });
  const [analyticsExpenseCategories, setAnalyticsExpenseCategories] = useState<AnalyticsExpenseCategoryData[]>([]);
  const [profitLossReportData, setProfitLossReportData] = useState<ProfitLossReportData | undefined>();

  const { data: journalEntriesData, isLoading: isLoadingJournalEntries, error: journalEntriesError } = useQuery<StoredJournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentUser && !!currentCompanyId && pathname === '/dashboard',
  });

  const { data: notificationsData, isLoading: isLoadingNotifications, error: notificationsError } = useQuery<Notification[], Error>({
    queryKey: ['notifications', currentCompanyId],
    queryFn: () => getNotifications(currentCompanyId!),
    enabled: !!currentUser && !!currentCompanyId && pathname === '/dashboard',
  });
  
  useEffect(() => {
    if (journalEntriesError) {
      toast({ variant: "destructive", title: "Error Loading Entries", description: journalEntriesError.message || "Could not fetch journal entries." });
    }
    if (notificationsError) {
      toast({ variant: "destructive", title: "Error Loading Notifications", description: notificationsError.message || "Could not fetch notifications." });
    }
  }, [journalEntriesError, notificationsError, toast]);


  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ["overview", "analytics", "reports", "notifications"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);


  // Effect to process entries when they or dateRange change
  useEffect(() => {
    console.log("Dashboard Processing: Triggered. DateRange:", dateRange);
    const overallProcessingStartTime = Date.now();

    if (!dateRange?.from || !dateRange?.to) {
      console.log("Dashboard Processing: Date range not fully set, skipping.");
      return;
    }

    const currentLocale = clientLocale || 'en-US';
    const defaultChartData = eachMonthOfInterval({ start: startOfMonth(subMonths(new Date(), 11)), end: endOfMonth(new Date()) }).map(d => ({
        month: d.toLocaleString(currentLocale, { month: 'short' }), income: 0, expense: 0
    }));
    const defaultFormattedRange = `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`;

    if (!journalEntriesData || journalEntriesData.length === 0) {
        console.log("Dashboard Processing: No entries data or empty. Setting defaults.");
        setSummaryData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });
        setChartDisplayData(defaultChartData);
        setUserSpendingData([]);
        setAnalyticsKpis({ avgTransactionValue: 0, profitMargin: 0, incomeTransactions: 0, expenseTransactions: 0 });
        setAnalyticsExpenseCategories([]);
        setProfitLossReportData({
            revenueItems: [], expenseItems: [], totalRevenue: 0, totalExpenses: 0, netProfit: 0, formattedDateRange: defaultFormattedRange
        });
        console.log(`Dashboard Processing: Finished (empty state) in ${Date.now() - overallProcessingStartTime}ms.`);
        return;
    }
    
    console.log("Dashboard Processing: Starting calculations for", journalEntriesData.length, "entries.");
    let sectionStartTime = Date.now();

    let calculatedTotalRevenue = 0;
    let calculatedTotalExpenses = 0;
    let transactionCountInRange = 0;
    const monthlyAggregates: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
    const userExpenses: Record<string, number> = {};

    let analyticsTotalTransactionAmount = 0;
    let analyticsIncomeTransactions = 0;
    let analyticsExpenseTransactions = 0;
    const expensesByAccountForAnalytics: Record<string, number> = {};
    let analyticsTotalRevenueForMargin = 0;
    let analyticsTotalExpensesForMargin = 0;

    const revenuesForReport: Record<string, number> = {};
    const expensesForReport: Record<string, number> = {};
    let reportTotalRevenue = 0;
    let reportTotalExpenses = 0;

    const chartIntervalStart = startOfMonth(subMonths(new Date(), 11));
    const chartIntervalEnd = endOfMonth(new Date());
    const monthsForChart = eachMonthOfInterval({ start: chartIntervalStart, end: chartIntervalEnd });
    
    monthsForChart.forEach(d => {
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString(currentLocale, { month: 'short' });
      if (!monthlyAggregates[yearMonth]) {
        monthlyAggregates[yearMonth] = { income: 0, expense: 0, monthLabel, yearMonth };
      }
    });
    console.log(`Dashboard Processing: Initial month setup for chart took ${Date.now() - sectionStartTime}ms.`);
    sectionStartTime = Date.now();

    journalEntriesData.forEach(entry => {
      const entryDate = new Date(entry.date);
      const entryYearMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

      const isWithinRange = entryDate >= dateRange.from! && entryDate <= dateRange.to!;
      let isIncomeEntry = false;
      let isExpenseEntry = false;

      const debitAccountLower = entry.debitAccount?.toLowerCase() || "";
      const creditAccountLower = entry.creditAccount?.toLowerCase() || "";

      if (incomeKeywords.some(keyword => creditAccountLower.includes(keyword))) {
          isIncomeEntry = true;
      }
      if (expenseKeywords.some(keyword => debitAccountLower.includes(keyword))) {
          isExpenseEntry = true;
      }
      
      if (isWithinRange) {
        transactionCountInRange++;
        if (isIncomeEntry) calculatedTotalRevenue += entry.amount;
        if (isExpenseEntry) {
          calculatedTotalExpenses += entry.amount;
          const userId = entry.creatorUserId; 
          userExpenses[userId] = (userExpenses[userId] || 0) + entry.amount;
        }
      }

      if (entryDate >= chartIntervalStart && entryDate <= chartIntervalEnd && monthlyAggregates[entryYearMonth]) {
        if (isIncomeEntry) monthlyAggregates[entryYearMonth].income += entry.amount;
        if (isExpenseEntry) monthlyAggregates[entryYearMonth].expense += entry.amount;
      }

      analyticsTotalTransactionAmount += entry.amount;
      if (isIncomeEntry) {
        analyticsIncomeTransactions++;
        analyticsTotalRevenueForMargin += entry.amount;
      }
      if (isExpenseEntry) {
        analyticsExpenseTransactions++;
        analyticsTotalExpensesForMargin += entry.amount;
        const analyticsAccount = entry.debitAccount || "Uncategorized Expense";
        expensesByAccountForAnalytics[analyticsAccount] = (expensesByAccountForAnalytics[analyticsAccount] || 0) + entry.amount;
      }

      if (isWithinRange) {
        if (isIncomeEntry) {
          const account = entry.creditAccount || "Uncategorized Revenue";
          revenuesForReport[account] = (revenuesForReport[account] || 0) + entry.amount;
          reportTotalRevenue += entry.amount;
        } else if (isExpenseEntry) {
          const account = entry.debitAccount || "Uncategorized Expense";
          expensesForReport[account] = (expensesForReport[account] || 0) + entry.amount;
          reportTotalExpenses += entry.amount;
        }
      }
    });
    console.log(`Dashboard Processing: Main entry iteration (${journalEntriesData.length} entries) took ${Date.now() - sectionStartTime}ms.`);
    
    sectionStartTime = Date.now();
    setSummaryData({
        totalRevenue: calculatedTotalRevenue,
        totalExpenses: calculatedTotalExpenses,
        netProfit: calculatedTotalRevenue - calculatedTotalExpenses,
        transactionCount: transactionCountInRange,
    });
    console.log(`Dashboard Processing: Summary data state update took ${Date.now() - sectionStartTime}ms.`);
    
    sectionStartTime = Date.now();
    const newChartData = Object.values(monthlyAggregates)
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
      .map(agg => ({ month: agg.monthLabel, income: agg.income, expense: agg.expense }));
    setChartDisplayData(newChartData);
    console.log(`Dashboard Processing: Chart data state update took ${Date.now() - sectionStartTime}ms.`);

    sectionStartTime = Date.now();
    const topSpenders = Object.entries(userExpenses)
      .map(([userId, totalSpent]) => {
        let displayName = `User ...${userId.slice(-6)}`;
        let avatarFallbackInitials = userId.substring(0, 2).toUpperCase();
        if (currentUser && userId === currentUser.uid) {
          displayName = currentUser.displayName || `User ...${userId.slice(-6)}`;
          if (currentUser.displayName && currentUser.displayName.trim() !== "") {
            const names = currentUser.displayName.split(' ');
            avatarFallbackInitials = names.map(n => n[0]).slice(0,2).join('').toUpperCase();
          } else if (currentUser.email) {
            avatarFallbackInitials = currentUser.email.substring(0, 2).toUpperCase();
          }
        }
        return { userId, totalSpent, displayName, avatarFallback: avatarFallbackInitials };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
    setUserSpendingData(topSpenders);
    console.log(`Dashboard Processing: Top spenders state update took ${Date.now() - sectionStartTime}ms.`);
    
    sectionStartTime = Date.now();
    const calculatedAnalyticsKpis: AnalyticsKpiData = {
      avgTransactionValue: journalEntriesData.length > 0 ? analyticsTotalTransactionAmount / journalEntriesData.length : 0,
      profitMargin: analyticsTotalRevenueForMargin > 0 ? ((analyticsTotalRevenueForMargin - analyticsTotalExpensesForMargin) / analyticsTotalRevenueForMargin) * 100 : 0,
      incomeTransactions: analyticsIncomeTransactions,
      expenseTransactions: analyticsExpenseTransactions,
    };
    setAnalyticsKpis(calculatedAnalyticsKpis);
    console.log(`Dashboard Processing: Analytics KPIs state update took ${Date.now() - sectionStartTime}ms.`);

    sectionStartTime = Date.now();
    const topAnalyticsExpenseCategories = Object.entries(expensesByAccountForAnalytics)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
    setAnalyticsExpenseCategories(topAnalyticsExpenseCategories);
    console.log(`Dashboard Processing: Analytics expense categories state update took ${Date.now() - sectionStartTime}ms.`);

    sectionStartTime = Date.now();
    const plRevenueItemsList: PLReportLineItem[] = Object.entries(revenuesForReport).map(([accountName, amount]) => ({ accountName, amount }));
    const plExpenseItemsList: PLReportLineItem[] = Object.entries(expensesForReport).map(([accountName, amount]) => ({ accountName, amount }));
    
    setProfitLossReportData({
      revenueItems: plRevenueItemsList,
      expenseItems: plExpenseItemsList,
      totalRevenue: reportTotalRevenue,
      totalExpenses: reportTotalExpenses,
      netProfit: reportTotalRevenue - reportTotalExpenses,
      formattedDateRange: defaultFormattedRange,
    });
    console.log(`Dashboard Processing: P&L report data state update took ${Date.now() - sectionStartTime}ms.`);

    console.log(`Dashboard Processing: Finished overall processing calculations in ${Date.now() - overallProcessingStartTime}ms.`);
  }, [journalEntriesData, dateRange, clientLocale, currentUser]);


  const handleDownloadReport = () => {
    if (!profitLossReportData) {
      toast({ variant: "destructive", title: "No Report Data", description: "Please ensure there is data loaded for the selected period." });
      return;
    }
    if (!currentCompanyId) {
       toast({ variant: "destructive", title: "Company ID Missing", description: "Cannot generate report without a Company ID." });
       return;
    }

    const { revenueItems, expenseItems, totalRevenue, totalExpenses, netProfit, formattedDateRange } = profitLossReportData;
    let csvContent = `Company: ${currentCompanyId} - Profit & Loss Statement\n`; 
    csvContent += `Period: ${formattedDateRange}\n\n`;
    csvContent += "Account,Amount (INR)\n";
    csvContent += "Revenue\n";
    revenueItems.forEach(item => { csvContent += `"${item.accountName}",${item.amount}\n`; });
    csvContent += "Total Revenue," + totalRevenue + "\n\n";
    csvContent += "Expenses\n";
    expenseItems.forEach(item => { csvContent += `"${item.accountName}",${item.amount}\n`; });
    csvContent += "Total Expenses," + totalExpenses + "\n\n";
    csvContent += "Net Profit / (Loss)," + netProfit + "\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const fromDateStr = dateRange?.from ? format(dateRange.from, "yyyyMMdd") : "alltime";
      const toDateStr = dateRange?.to ? format(dateRange.to, "yyyyMMdd") : "";
      link.setAttribute("href", url);
      link.setAttribute("download", `Profit_Loss_Report_${currentCompanyId.replace(/\s+/g, '_')}_${fromDateStr}${toDateStr ? '-' + toDateStr : ''}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
       toast({ title: "Report Downloaded", description: "Profit & Loss Statement CSV has been downloaded." });
    } else {
       toast({ variant: "destructive", title: "Download Failed", description: "Your browser does not support this download method." });
    }
  };

  const isLoadingPage = isLoadingJournalEntries; // Main loading indicator for the page structure

  if (!currentCompanyId && !isLoadingPage && pathname === '/dashboard') {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard {currentCompanyId ? `(${currentCompanyId})` : ''}</h1>
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
          <Button variant="default" onClick={handleDownloadReport} disabled={!currentCompanyId || isLoadingPage}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="border-b-0 justify-start bg-transparent p-0 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-3 py-1.5 hover:bg-muted">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-3 py-1.5 hover:bg-muted">Analytics</TabsTrigger>
          <TabsTrigger value="reports" id="reports" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-3 py-1.5 hover:bg-muted">Reports</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-3 py-1.5 hover:bg-muted">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            {isLoadingPage ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => ( <Skeleton key={i} className="h-36 rounded-lg shadow-sm bg-muted/50 border-border"/> ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <SummaryCard title="Total Revenue" value={summaryData.totalRevenue} icon={DollarSign} />
                <SummaryCard title="Total Expenses" value={summaryData.totalExpenses} icon={TrendingDown} />
                <SummaryCard title="Net Profit" value={summaryData.netProfit} icon={TrendingUp} />
                <SummaryCard title="Transactions" value={summaryData.transactionCount} icon={Activity} isCurrency={false} />
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 shadow-sm border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Revenue & Expense Trend (Last 12 Months)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2 pr-4 pb-4">
                   <IncomeExpenseChart chartData={chartDisplayData} isLoading={isLoadingPage} />
                </CardContent>
              </Card>
              <div className="lg:col-span-1">
                 <UserSpendingList spendingData={userSpendingData} isLoading={isLoadingPage} />
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsOverview kpis={analyticsKpis} expenseCategories={analyticsExpenseCategories} isLoading={isLoadingPage} />
        </TabsContent>
        <TabsContent value="reports">
           <ProfitLossReport reportData={profitLossReportData} isLoading={isLoadingPage} />
        </TabsContent>
        <TabsContent value="notifications">
           <NotificationList notifications={notificationsData || []} isLoading={isLoadingNotifications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
