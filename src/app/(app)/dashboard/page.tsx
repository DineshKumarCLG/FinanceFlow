
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { QuickActions } from "@/components/dashboard/QuickActions"; // This might be replaced or restyled
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard, Activity, CalendarDays, Download } from "lucide-react"; // Added Users, CreditCard, Activity
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RecentSales } from "@/components/dashboard/RecentSales"; // New component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";


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
  income: number; // "Overview" chart in image has one series, we'll map 'income' to it
  expense: number; // Keep for potential dual series later
}

export default function DashboardPage() {
  const [clientLocale, setClientLocale] = useState('en-US');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1), // Jan 1st of current year
    to: new Date(), // Today
  });


  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0, // Matched to "Total Revenue"
    subscriptions: 2350, // Placeholder from image
    sales: 12234, // Placeholder from image
    activeNow: 573, // Placeholder from image
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
        
        let calculatedTotalRevenue = 0; // For "Total Revenue" card
        const incomeKeywords = ['revenue', 'income', 'sales', 'service fee'];
        // For chart, we might use a simpler logic if not explicitly income/expense accounts
        
        const monthlyAggregates: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
        const now = new Date();

        // Initialize last 12 months for the chart to match image
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = d.toLocaleString('default', { month: 'short' });
          if (!monthlyAggregates[yearMonth]) {
            monthlyAggregates[yearMonth] = { income: 0, expense: 0, monthLabel, yearMonth };
          }
        }
        
        fetchedEntries.forEach(entry => {
          // Calculate Total Revenue
          if (incomeKeywords.some(keyword => entry.creditAccount.toLowerCase().includes(keyword))) {
            calculatedTotalRevenue += entry.amount;
          }

          // Process for chart data (entries within the last 12 months)
          const entryDate = new Date(entry.date);
          const entryYearMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

          if (monthlyAggregates[entryYearMonth]) { 
            // For the "Overview" chart (single green series), let's assume income increases it
            // This logic might need refinement based on actual account types
             if (incomeKeywords.some(keyword => entry.creditAccount.toLowerCase().includes(keyword))) {
                monthlyAggregates[entryYearMonth].income += entry.amount;
            } else if (entry.debitAccount.toLowerCase().includes('cash') || entry.debitAccount.toLowerCase().includes('bank')) {
                 // If cash/bank is debited, consider it an inflow for chart purposes
                monthlyAggregates[entryYearMonth].income += entry.amount;
            }
          }
        });

        setSummaryData(prev => ({
            ...prev, // Keep placeholder values for other cards
            totalRevenue: calculatedTotalRevenue,
        }));

        const newChartData = Object.values(monthlyAggregates)
          .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)) 
          .map(agg => ({ month: agg.monthLabel, income: agg.income, expense: 0 })); // Only income for this chart style
        setChartDisplayData(newChartData);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
         setSummaryData({ totalRevenue: 0, subscriptions: 0, sales: 0, activeNow: 0 });
         setChartDisplayData( 
            Array.from({ length: 12 }).map((_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                return { month: d.toLocaleString('default', { month: 'short' }), income: 0, expense: 0 };
            })
         );
      } finally {
        setIsLoadingData(false);
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
          <Button variant="default"> {/* Primary button style from new theme */}
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
            {/* Summary Cards */}
            {isLoadingData ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => ( <Card key={i} className="shadow-sm h-36 animate-pulse bg-muted/50 border-border"/> ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <SummaryCard title="Total Revenue" value={summaryData.totalRevenue.toLocaleString(clientLocale, { style: 'currency', currency: 'USD' })} icon={DollarSign} change="+20.1% from last month" changeType="positive" />
                <SummaryCard title="Subscriptions" value={`+${summaryData.subscriptions.toLocaleString(clientLocale)}`} icon={Users} change="+180.1% from last month" changeType="positive" />
                <SummaryCard title="Sales" value={`+${summaryData.sales.toLocaleString(clientLocale)}`} icon={CreditCard} change="+19% from last month" changeType="positive" />
                <SummaryCard title="Active Now" value={`+${summaryData.activeNow.toLocaleString(clientLocale)}`} icon={Activity} change="+201 since last hour" changeType="positive" />
              </div>
            )}

            {/* Main Chart and Recent Sales */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 shadow-sm border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2 pr-4 pb-4"> {/* Adjust padding for recharts */}
                   <IncomeExpenseChart chartData={chartDisplayData} isLoading={isLoadingData} />
                </CardContent>
              </Card>
              <div className="lg:col-span-1">
                 <RecentSales />
              </div>
            </div>
             {/* Quick Actions - Can be re-integrated or restyled if needed */}
             {/* <QuickActions /> */}
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <p className="text-muted-foreground">Analytics content will go here.</p>
        </TabsContent>
        <TabsContent value="reports">
           <p className="text-muted-foreground">Reports content will go here.</p>
        </TabsContent>
        <TabsContent value="notifications">
           <p className="text-muted-foreground">Notifications content will go here.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
