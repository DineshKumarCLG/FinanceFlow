
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { DollarSign, TrendingUp, TrendingDown, Activity, CalendarDays, Download } from "lucide-react"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSpendingList, type UserSpending } from "@/components/dashboard/RecentSales"; 
import { NotificationList } from "@/components/dashboard/NotificationList"; // Import NotificationList
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getJournalEntries, type JournalEntry as StoredJournalEntry, getNotifications, type Notification } from "@/lib/data-service"; // Import getNotifications and Notification type
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";

interface ChartPoint {
  month: string;
  income: number; 
  expense: number; 
}

export default function DashboardPage() {
  const [clientLocale, setClientLocale] = useState('en-US');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(), 
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

    async function loadDashboardData() {
      setIsLoadingData(true);
      setIsLoadingNotifications(true);
      try {
        const fetchedEntries = await getJournalEntries();
        
        let calculatedTotalRevenue = 0; 
        let calculatedTotalExpenses = 0;

        const incomeKeywords = ['revenue', 'sales', 'income', 'service fee'];
        const expenseKeywords = ['expense', 'cost', 'supply', 'rent', 'salary', 'utility', 'utilities', 'purchase'];
        
        const monthlyAggregates: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
        const userExpenses: Record<string, number> = {};

        const now = new Date();

        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = d.toLocaleString(clientLocale, { month: 'short' });
          if (!monthlyAggregates[yearMonth]) {
            monthlyAggregates[yearMonth] = { income: 0, expense: 0, monthLabel, yearMonth };
          }
        }
        
        fetchedEntries.forEach(entry => {
          const entryDate = new Date(entry.date);
          const entryYearMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
          const monthAggregate = monthlyAggregates[entryYearMonth];

          let isIncome = false;
          let isExpense = false;

          if (incomeKeywords.some(keyword => entry.creditAccount.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword))) {
            isIncome = true;
            calculatedTotalRevenue += entry.amount;
            if (monthAggregate) monthAggregate.income += entry.amount;
          }
          
          if (expenseKeywords.some(keyword => entry.debitAccount.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword))) {
             isExpense = true;
          }
          if (entry.creditAccount.toLowerCase().includes('cash') || entry.creditAccount.toLowerCase().includes('bank')) {
            if(!isIncome) isExpense = true;
          }

          if(isExpense){
            calculatedTotalExpenses += entry.amount;
            if (monthAggregate) monthAggregate.expense += entry.amount;
            const userId = entry.creatorUserId; // Use creatorUserId
            userExpenses[userId] = (userExpenses[userId] || 0) + entry.amount;
          }
        });

        setSummaryData({
            totalRevenue: calculatedTotalRevenue,
            totalExpenses: calculatedTotalExpenses,
            netProfit: calculatedTotalRevenue - calculatedTotalExpenses,
            transactionCount: fetchedEntries.length,
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

        // Fetch notifications
        const fetchedNotifications = await getNotifications();
        setNotifications(fetchedNotifications);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
         setSummaryData({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, transactionCount: 0 });
         setChartDisplayData( 
            Array.from({ length: 12 }).map((_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                return { month: d.toLocaleString(clientLocale, { month: 'short' }), income: 0, expense: 0 };
            })
         );
         setUserSpendingData([]);
         setNotifications([]);
      } finally {
        setIsLoadingData(false);
        setIsLoadingNotifications(false);
      }
    }
    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


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
                <SummaryCard title="Total Revenue" value={summaryData.totalRevenue} icon={DollarSign} change="+20.1%" changeType="positive" />
                <SummaryCard title="Total Expenses" value={summaryData.totalExpenses} icon={TrendingDown} change="-5.2%" changeType="negative" />
                <SummaryCard title="Net Profit" value={summaryData.netProfit} icon={TrendingUp} change="+15%" changeType="positive" />
                <SummaryCard title="Transactions" value={summaryData.transactionCount} icon={Activity} />
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 shadow-sm border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Overview</CardTitle>
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
          <Card>
            <CardHeader><CardTitle>Analytics</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Analytics content will go here.</p></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports">
           <Card>
            <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Reports content will go here.</p></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
           <NotificationList notifications={notifications} isLoading={isLoadingNotifications} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
