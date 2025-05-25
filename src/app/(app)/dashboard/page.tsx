
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { AnalyticsOverview, type AnalyticsKpiData, type ExpenseCategoryData as AnalyticsExpenseCategoryData } from "@/components/dashboard/AnalyticsOverview";
import { ProfitLossReport, type ProfitLossReportData, type ReportLineItem as PLReportLineItem } from "@/components/dashboard/ProfitLossReport";
import { DollarSign, TrendingUp, TrendingDown, Activity, CalendarDays, Download } from "lucide-react"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSpendingList, type UserSpending } from "@/components/dashboard/UserSpendingList"; 
import { NotificationList, type Notification } from "@/components/dashboard/NotificationList"; // Corrected import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { getJournalEntries, type JournalEntry as StoredJournalEntry, getNotifications } from "@/lib/data-service";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns";

interface ChartPoint {
  month: string;
  income: number; 
  expense: number; 
}

// Moved keywords here for central access if needed, though now DashboardPage handles most logic
export const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received'];
export const expenseKeywords = ['expense', 'cost', 'supply', 'rent', 'salary', 'utility', 'utilities', 'purchase', 'advertising', 'maintenance', 'insurance', 'interest paid', 'fee'];


export default function DashboardPage() {
  const [clientLocale, setClientLocale] = useState('en-US');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allJournalEntries, setAllJournalEntries] = useState<StoredJournalEntry[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(subMonths(today, 5)), 
      to: endOfMonth(today),
    };
  });

  // State for Summary Cards
  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0, 
    totalExpenses: 0,
    netProfit: 0,    
    transactionCount: 0,
  });
  // State for Income/Expense Chart
  const [chartDisplayData, setChartDisplayData] = useState<ChartPoint[]>([]);
  // State for User Spending List
  const [userSpendingData, setUserSpendingData] = useState<UserSpending[]>([]);
  // State for Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  // NEW: State for Analytics Overview
  const [analyticsKpis, setAnalyticsKpis] = useState<AnalyticsKpiData>({
    avgTransactionValue: 0, profitMargin: 0, incomeTransactions: 0, expenseTransactions: 0,
  });
  const [analyticsExpenseCategories, setAnalyticsExpenseCategories] = useState<AnalyticsExpenseCategoryData[]>([]);

  // NEW: State for Profit & Loss Report
  const [profitLossReportData, setProfitLossReportData] = useState<ProfitLossReportData | undefined>();


  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      setIsLoadingNotifications(true);
      try {
        const fetchedEntries = await getJournalEntries();
        setAllJournalEntries(fetchedEntries);
        
        const fetchedNotifications = await getNotifications();
        setNotifications(fetchedNotifications);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
         setSummaryData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });
         setUserSpendingData([]);
         setNotifications([]);
         setAllJournalEntries([]);
         setAnalyticsKpis({ avgTransactionValue: 0, profitMargin: 0, incomeTransactions: 0, expenseTransactions: 0 });
         setAnalyticsExpenseCategories([]);
         setProfitLossReportData(undefined);
      } finally {
        // setIsLoadingData(false); // Moved to the processing useEffect
        setIsLoadingNotifications(false);
      }
    }
    loadInitialData();
  }, []); 


  // Centralized data processing useEffect
  useEffect(() => {
    if (allJournalEntries.length === 0 && !isLoadingData && typeof dateRange?.from !== 'undefined' && typeof dateRange?.to !== 'undefined') {
        // Handle case with no entries but processing should still set defaults
        setSummaryData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });
        const now = new Date();
        setChartDisplayData(
            Array.from({ length: 12 }).map((_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                return { month: d.toLocaleString(clientLocale, { month: 'short' }), income: 0, expense: 0 };
            })
        );
        setUserSpendingData([]);
        setAnalyticsKpis({ avgTransactionValue: 0, profitMargin: 0, incomeTransactions: 0, expenseTransactions: 0 });
        setAnalyticsExpenseCategories([]);
        const formattedRange = dateRange?.from && dateRange?.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : "All Time";
        setProfitLossReportData({
            revenueItems: [], expenseItems: [], totalRevenue: 0, totalExpenses: 0, netProfit: 0, formattedDateRange: formattedRange
        });
        setIsLoadingData(false); // Ensure loading is set to false
        return;
    }


    if (allJournalEntries.length > 0 && dateRange?.from && dateRange?.to) {
      setIsLoadingData(true); // Start loading before heavy processing

      // --- Calculations for Summary Cards, Chart, User Spending ---
      let calculatedTotalRevenue = 0; 
      let calculatedTotalExpenses = 0;
      let transactionCountInRange = 0;
      const monthlyAggregates: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
      const userExpenses: Record<string, number> = {};

      // --- Calculations for AnalyticsOverview ---
      let analyticsTotalTransactionAmount = 0;
      let analyticsIncomeTransactions = 0;
      let analyticsExpenseTransactions = 0;
      const expensesByAccountForAnalytics: Record<string, number> = {};
      let analyticsTotalRevenueForMargin = 0; // For profit margin based on all entries
      let analyticsTotalExpensesForMargin = 0; // For profit margin based on all entries
      
      // --- Calculations for ProfitLossReport ---
      const revenuesForReport: Record<string, number> = {};
      const expensesForReport: Record<string, number> = {};
      let reportTotalRevenue = 0;
      let reportTotalExpenses = 0;

      // Initialize monthly aggregates for the chart (last 12 months)
      const now = new Date();
      const last12MonthsInterval = { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
      const monthsForChart = eachMonthOfInterval(last12MonthsInterval);
      monthsForChart.forEach(d => {
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleString(clientLocale, { month: 'short' });
        if (!monthlyAggregates[yearMonth]) {
          monthlyAggregates[yearMonth] = { income: 0, expense: 0, monthLabel, yearMonth };
        }
      });
      
      allJournalEntries.forEach(entry => {
        const entryDate = new Date(entry.date);
        const entryYearMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
        const monthAggregate = monthlyAggregates[entryYearMonth];
        const isWithinRange = entryDate >= dateRange.from! && entryDate <= dateRange.to!;

        let isIncomeEntry = false;
        let isExpenseEntry = false;

        // General classification for multiple purposes (summary, analytics, P&L if applicable)
        // Income Check
        if (incomeKeywords.some(keyword => (entry.creditAccount?.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword))) ||
            (entry.debitAccount?.toLowerCase().includes('cash') || entry.debitAccount?.toLowerCase().includes('bank'))) {
            isIncomeEntry = true;
        }
        // Expense Check (more refined)
        if (expenseKeywords.some(keyword => (entry.debitAccount?.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword)))) {
            isExpenseEntry = true;
        } else if ((entry.creditAccount?.toLowerCase().includes('cash') || entry.creditAccount?.toLowerCase().includes('bank')) && !isIncomeEntry) {
            isExpenseEntry = true; // Cash outflow not already marked as income
        }
        
        // --- Summary Card Calculations (Date Range Specific) ---
        if (isWithinRange) {
          transactionCountInRange++;
          if (isIncomeEntry) calculatedTotalRevenue += entry.amount;
          if (isExpenseEntry) {
            calculatedTotalExpenses += entry.amount;
            // User Spending (Date Range Specific)
            const userId = entry.creatorUserId; 
            userExpenses[userId] = (userExpenses[userId] || 0) + entry.amount;
          }
        }

        // --- Chart Data (Last 12 Months) ---
        if (monthAggregate) {
          if (isIncomeEntry) monthAggregate.income += entry.amount;
          if (isExpenseEntry) monthAggregate.expense += entry.amount;
        }
        
        // --- Analytics KPIs (All Time) ---
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
        
        // --- Profit & Loss Report Data (Date Range Specific) ---
        if (isWithinRange) {
          if (isIncomeEntry) {
            const account = entry.creditAccount || "Uncategorized Revenue";
            revenuesForReport[account] = (revenuesForReport[account] || 0) + entry.amount;
            reportTotalRevenue += entry.amount;
          } else if (isExpenseEntry) { // Use else if to avoid double counting an entry as both revenue and expense for P&L
            const account = entry.debitAccount || "Uncategorized Expense";
            expensesForReport[account] = (expensesForReport[account] || 0) + entry.amount;
            reportTotalExpenses += entry.amount;
          }
        }
      });

      // --- Set State for Summary Cards ---
      setSummaryData({
          totalRevenue: calculatedTotalRevenue,
          totalExpenses: calculatedTotalExpenses,
          netProfit: calculatedTotalRevenue - calculatedTotalExpenses,
          transactionCount: transactionCountInRange,
      });

      // --- Set State for Chart ---
      const newChartData = Object.values(monthlyAggregates)
        .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)) 
        .map(agg => ({ month: agg.monthLabel, income: agg.income, expense: agg.expense })); 
      setChartDisplayData(newChartData);

      // --- Set State for User Spending List ---
      const topSpenders = Object.entries(userExpenses)
        .map(([userId, totalSpent]) => ({
          userId, totalSpent, displayName: `User ...${userId.slice(-6)}`, 
          avatarFallback: userId.substring(0, 2).toUpperCase(),
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5); 
      setUserSpendingData(topSpenders);

      // --- Set State for Analytics Overview ---
      const calculatedAnalyticsKpis: AnalyticsKpiData = {
        avgTransactionValue: allJournalEntries.length > 0 ? analyticsTotalTransactionAmount / allJournalEntries.length : 0,
        profitMargin: analyticsTotalRevenueForMargin > 0 ? ((analyticsTotalRevenueForMargin - analyticsTotalExpensesForMargin) / analyticsTotalRevenueForMargin) * 100 : 0,
        incomeTransactions: analyticsIncomeTransactions,
        expenseTransactions: analyticsExpenseTransactions,
      };
      setAnalyticsKpis(calculatedAnalyticsKpis);
      const topAnalyticsExpenseCategories = Object.entries(expensesByAccountForAnalytics)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total).slice(0, 5);
      setAnalyticsExpenseCategories(topAnalyticsExpenseCategories);

      // --- Set State for Profit & Loss Report ---
      const plRevenueItemsList: PLReportLineItem[] = Object.entries(revenuesForReport).map(([accountName, amount]) => ({ accountName, amount }));
      const plExpenseItemsList: PLReportLineItem[] = Object.entries(expensesForReport).map(([accountName, amount]) => ({ accountName, amount }));
      const formattedRange = dateRange?.from && dateRange?.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : "All Time";
      setProfitLossReportData({
        revenueItems: plRevenueItemsList,
        expenseItems: plExpenseItemsList,
        totalRevenue: reportTotalRevenue,
        totalExpenses: reportTotalExpenses,
        netProfit: reportTotalRevenue - reportTotalExpenses,
        formattedDateRange: formattedRange,
      });
      setIsLoadingData(false); // Data processing finished
    } else if (allJournalEntries.length === 0 && !isLoadingData && dateRange?.from && dateRange?.to) { // Ensure this condition is robust
        // If no entries and not loading, ensure all data is reset (already partially handled above, this is a safeguard)
        setIsLoadingData(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allJournalEntries, dateRange, clientLocale]); // isLoadingData is not a dependency here, it's set by this effect


  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-[260px] justify-start text-left font-normal bg-card hover:bg-muted"
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
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          <Button variant="default"> 
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="border-b-0 justify-start bg-transparent p-0 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-3 py-1.5 hover:bg-muted">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-3 py-1.5 hover:bg-muted">Analytics</TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-3 py-1.5 hover:bg-muted">Reports</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none px-3 py-1.5 hover:bg-muted">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            {isLoadingData ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => ( <Card key={i} className="shadow-sm h-36 animate-pulse bg-muted/50 border-border"/> ))}
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
                   <IncomeExpenseChart chartData={chartDisplayData} isLoading={isLoadingData} />
                </CardContent>
              </Card>
              <div className="lg:col-span-1">
                 <UserSpendingList spendingData={userSpendingData} isLoading={isLoadingData} />
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsOverview kpis={analyticsKpis} expenseCategories={analyticsExpenseCategories} isLoading={isLoadingData} />
        </TabsContent>
        <TabsContent value="reports">
           <ProfitLossReport reportData={profitLossReportData} isLoading={isLoadingData} />
        </TabsContent>
        <TabsContent value="notifications">
           <NotificationList notifications={notifications} isLoading={isLoadingNotifications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
