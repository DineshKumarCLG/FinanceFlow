
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { AnalyticsOverview } from "@/components/dashboard/AnalyticsOverview"; // New import
import { ProfitLossReport } from "@/components/dashboard/ProfitLossReport"; // New import
import { DollarSign, TrendingUp, TrendingDown, Activity, CalendarDays, Download } from "lucide-react"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSpendingList, type UserSpending } from "@/components/dashboard/UserSpendingList"; 
import { NotificationList } from "@/components/dashboard/NotificationList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { getJournalEntries, type JournalEntry as StoredJournalEntry, getNotifications, type Notification } from "@/lib/data-service";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns";

interface ChartPoint {
  month: string;
  income: number; 
  expense: number; 
}

export const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received'];
export const expenseKeywords = ['expense', 'cost', 'supply', 'rent', 'salary', 'utility', 'utilities', 'purchase', 'advertising', 'maintenance', 'insurance', 'interest paid'];


export default function DashboardPage() {
  const [clientLocale, setClientLocale] = useState('en-US');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allJournalEntries, setAllJournalEntries] = useState<StoredJournalEntry[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(subMonths(today, 5)), // Default to last 6 months (current + 5 previous)
      to: endOfMonth(today),
    };
  });

  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0, 
    totalExpenses: 0,
    netProfit: 0,    
    transactionCount: 0,
  });
  const [chartDisplayData, setChartDisplayData] = useState<ChartPoint[]>([]);
  const [userSpendingData, setUserSpendingData] = useState<UserSpending[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoadingData(true);
      setIsLoadingNotifications(true);
      try {
        const fetchedEntries = await getJournalEntries();
        setAllJournalEntries(fetchedEntries); // Store all entries for other components
        
        // Fetch notifications
        const fetchedNotifications = await getNotifications();
        setNotifications(fetchedNotifications);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
         setSummaryData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });
         setUserSpendingData([]);
         setNotifications([]);
         setAllJournalEntries([]); // Clear entries on error
      } finally {
        setIsLoadingData(false);
        setIsLoadingNotifications(false);
      }
    }
    loadDashboardData();
  }, []); 


  // Recalculate dashboard overview data when allJournalEntries or dateRange changes
  useEffect(() => {
    if (allJournalEntries.length > 0 && dateRange?.from && dateRange?.to) {
      let calculatedTotalRevenue = 0; 
      let calculatedTotalExpenses = 0;
      let transactionCountInRange = 0;
      
      const monthlyAggregates: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
      const userExpenses: Record<string, number> = {};

      // Initialize monthly aggregates for the chart (last 12 months for broader view regardless of dateRange)
      const now = new Date();
      const last12MonthsInterval = {
        start: startOfMonth(subMonths(now, 11)),
        end: endOfMonth(now),
      };
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

        let isIncome = false;
        let isExpense = false;

        // Determine if entry is within selected dateRange for summary cards
        const isWithinRange = entryDate >= dateRange.from! && entryDate <= dateRange.to!;
        if (isWithinRange) transactionCountInRange++;

        // Income calculation
        if (incomeKeywords.some(keyword => 
            (entry.creditAccount?.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword)) ||
            (entry.debitAccount?.toLowerCase().includes('cash') || entry.debitAccount?.toLowerCase().includes('bank')) // Cash inflow
        )) {
          isIncome = true;
          if (isWithinRange) calculatedTotalRevenue += entry.amount;
          if (monthAggregate) monthAggregate.income += entry.amount; // For chart (always last 12 months)
        }
        
        // Expense calculation
        if (expenseKeywords.some(keyword => 
            (entry.debitAccount?.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword)) ||
            (entry.creditAccount?.toLowerCase().includes('cash') || entry.creditAccount?.toLowerCase().includes('bank')) // Cash outflow
        )) {
           isExpense = true;
        }
        
        // Refined: If it's an income type (e.g. Sales Revenue credit), don't also mark it as expense if cash was debited.
        // If it's clearly an expense (e.g. Rent Expense debit), and cash/bank was credited, it's definitely an expense.
        if(entry.creditAccount?.toLowerCase().includes('cash') || entry.creditAccount?.toLowerCase().includes('bank')) {
          if(!isIncome) isExpense = true; // If not already marked income, cash out is likely expense
        }


        if(isExpense){
          if (isWithinRange) {
            calculatedTotalExpenses += entry.amount;
            const userId = entry.creatorUserId; 
            userExpenses[userId] = (userExpenses[userId] || 0) + entry.amount;
          }
          if (monthAggregate) monthAggregate.expense += entry.amount; // For chart (always last 12 months)
        }
      });

      setSummaryData({
          totalRevenue: calculatedTotalRevenue,
          totalExpenses: calculatedTotalExpenses,
          netProfit: calculatedTotalRevenue - calculatedTotalExpenses,
          transactionCount: transactionCountInRange,
      });

      const newChartData = Object.values(monthlyAggregates)
        .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)) 
        .map(agg => ({ month: agg.monthLabel, income: agg.income, expense: agg.expense })); 
      setChartDisplayData(newChartData);

      const topSpenders = Object.entries(userExpenses)
        .map(([userId, totalSpent]) => ({
          userId,
          totalSpent,
          displayName: `User ...${userId.slice(-6)}`, 
          avatarFallback: userId.substring(0, 2).toUpperCase(),
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5); 
      setUserSpendingData(topSpenders);
    } else if (allJournalEntries.length === 0 && !isLoadingData) {
      // Reset data if no entries
      setSummaryData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });
      setChartDisplayData(
        Array.from({ length: 12 }).map((_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
            return { month: d.toLocaleString(clientLocale, { month: 'short' }), income: 0, expense: 0 };
        })
      );
      setUserSpendingData([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allJournalEntries, dateRange, clientLocale]); 


  const filteredEntriesForReport = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return allJournalEntries;
    return allJournalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= dateRange.from! && entryDate <= dateRange.to!;
    });
  }, [allJournalEntries, dateRange]);


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
          <AnalyticsOverview journalEntries={allJournalEntries} isLoading={isLoadingData} />
        </TabsContent>
        <TabsContent value="reports">
           <ProfitLossReport journalEntries={filteredEntriesForReport} dateRange={dateRange} isLoading={isLoadingData} />
        </TabsContent>
        <TabsContent value="notifications">
           <NotificationList notifications={notifications} isLoading={isLoadingNotifications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
