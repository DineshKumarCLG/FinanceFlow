
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { DollarSign, TrendingUp, TrendingDown, Activity, CalendarDays, Download, AlertCircle, PlusCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { getJournalEntries, type StoredJournalEntry, getNotifications, type Notification } from "@/lib/data-service";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, parseISO } from "date-fns";
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


// Cash Account Keywords are now more explicit to drive dashboard analytics.
export const cashAccountKeywords = ['cash', 'bank', 'bank account', 'company account'];
const ENTRIES_THRESHOLD_FOR_FILTERING = 50;


export default function DashboardPage() {
  const { user: currentUser, currentCompanyId } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(subMonths(today, 5)),
      to: endOfMonth(today),
    };
  });
  const [isFilterBypassed, setIsFilterBypassed] = useState(false);
  const { toast } = useToast();
  const pathname = usePathname();

  // Fetch journal entries
  const { data: journalEntriesData, isLoading: isLoadingJournalEntries, error: journalEntriesError } = useQuery<StoredJournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentUser && !!currentCompanyId,
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
    const defaultData = {
      summaryData: { totalCashIn: 0, totalCashOut: 0, netCashFlow: 0, transactionCount: 0 },
      cumulativeCashFlowData: [],
      cashFlowChartData: [],
      spendingBreakdownData: [],
      analyticsKpis: { avgTransactionValue: 0, netCashFlow: 0, cashInTransactions: 0, cashOutTransactions: 0 },
      analyticsExpenseCategories: [],
    };
    if (!journalEntriesData) return defaultData;

    // A. Fix the Date Range Logic
    const isFilterActive = journalEntriesData.length >= ENTRIES_THRESHOLD_FOR_FILTERING;
    setIsFilterBypassed(!isFilterActive);

    let effectiveDateRange: { from: Date; to: Date };
    if (isFilterActive && dateRange?.from) {
      // Use user-selected range if filter is active and a range is selected
      effectiveDateRange = {
        from: dateRange.from,
        to: dateRange.to || endOfMonth(new Date()),
      };
    } else {
      // Otherwise (filter bypassed or no date selected), use all-time range from the data
      if (journalEntriesData && journalEntriesData.length > 0) {
        const allDates = journalEntriesData.map(e => parseISO(e.date));
        effectiveDateRange = {
          from: new Date(Math.min(...allDates.map(d => d.getTime()))),
          to: new Date(Math.max(...allDates.map(d => d.getTime()))),
        };
      } else {
        // Default fallback if no entries exist
        effectiveDateRange = {
          from: startOfMonth(subMonths(new Date(), 5)),
          to: endOfMonth(new Date()),
        };
      }
    }
    const { from: rangeStart, to: rangeEnd } = effectiveDateRange;
    const inclusiveEndDate = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59);

    // B. Calculate Cash-Based Metrics using the corrected date range
    const allTimeCashMovements = journalEntriesData
        .map(entry => {
            if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return null;
            const isCashIn = cashAccountKeywords.some(k => entry.debitAccount.toLowerCase().includes(k));
            const isCashOut = cashAccountKeywords.some(k => entry.creditAccount.toLowerCase().includes(k));
            if (!isCashIn && !isCashOut) return null;
            try {
                return { date: parseISO(entry.date), amount: isCashIn ? entry.amount : -entry.amount };
            } catch (e) { return null; }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const periodCashMovements = allTimeCashMovements.filter(m => m.date >= rangeStart && m.date <= inclusiveEndDate);

    const summaryTotalCashIn = periodCashMovements.filter(m => m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
    const summaryTotalCashOut = periodCashMovements.filter(m => m.amount < 0).reduce((sum, m) => sum + Math.abs(m.amount), 0);
    const summaryData = {
        totalCashIn: summaryTotalCashIn,
        totalCashOut: summaryTotalCashOut,
        netCashFlow: summaryTotalCashIn - summaryTotalCashOut,
        transactionCount: periodCashMovements.length,
    };

    const monthlyCash: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
    const monthsInRange = eachMonthOfInterval({ start: rangeStart, end: inclusiveEndDate });
    monthsInRange.forEach(d => {
        const key = format(d, 'yyyy-MM');
        monthlyCash[key] = { income: 0, expense: 0, monthLabel: format(d, 'MMM yy'), yearMonth: key };
    });
    periodCashMovements.forEach(m => {
        const key = format(m.date, 'yyyy-MM');
        if (monthlyCash[key]) {
            if (m.amount > 0) monthlyCash[key].income += m.amount;
            else monthlyCash[key].expense += Math.abs(m.amount);
        }
    });
    const cashFlowChartData = Object.values(monthlyCash).sort((a,b) => a.yearMonth.localeCompare(b.yearMonth)).map(agg => ({
        month: agg.monthLabel,
        income: agg.income,
        expense: agg.expense,
        net: agg.income - agg.expense,
    }));
    
    let cumulativeNetCash = 0;
    const cumulativeDataPoints = allTimeCashMovements.map(m => {
        cumulativeNetCash += m.amount;
        return { monthDate: startOfMonth(m.date), value: cumulativeNetCash };
    });
    const cumulativeMonthlyCash: Record<string, { month: string; value: number }> = {};
    cumulativeDataPoints.forEach(p => {
        const key = format(p.monthDate, 'yyyy-MM');
        cumulativeMonthlyCash[key] = { month: format(p.monthDate, 'MMM yy'), value: p.value };
    });
    const cumulativeCashFlowData = Object.entries(cumulativeMonthlyCash)
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => a.key.localeCompare(b.key))
        .filter(item => {
            const itemDate = parseISO(item.key + '-01');
            return itemDate >= startOfMonth(rangeStart) && itemDate <= endOfMonth(inclusiveEndDate);
        });

    // C. Calculate Spending-Based Metrics (including non-cash/credit purchases)
    const entriesInPeriod = journalEntriesData.filter(entry => {
        try {
            const entryDate = parseISO(entry.date);
            return entryDate >= rangeStart && entryDate <= inclusiveEndDate;
        } catch (e) { return false; }
    });

    const spendingByCategory: Record<string, number> = {};
    entriesInPeriod.forEach(entry => {
        // A "spending" transaction is a debit to any account that is not a cash-equivalent account.
        if (entry.debitAccount && !cashAccountKeywords.some(k => entry.debitAccount.toLowerCase().includes(k))) {
            spendingByCategory[entry.debitAccount] = (spendingByCategory[entry.debitAccount] || 0) + entry.amount;
        }
    });
    const spendingBreakdownData = Object.entries(spendingByCategory).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    
    // D. Finalize Analytics KPIs
    const analyticsKpis = {
        avgTransactionValue: periodCashMovements.length > 0 ? periodCashMovements.reduce((sum, m) => sum + Math.abs(m.amount), 0) / periodCashMovements.length : 0,
        netCashFlow: summaryData.netCashFlow,
        cashInTransactions: periodCashMovements.filter(m => m.amount > 0).length,
        cashOutTransactions: periodCashMovements.filter(m => m.amount < 0).length,
    };
    const analyticsExpenseCategories = spendingBreakdownData.slice(0, 7);

    return { summaryData, cumulativeCashFlowData, cashFlowChartData, spendingBreakdownData, analyticsKpis, analyticsExpenseCategories };
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
      
       {isFilterBypassed && (
         <Alert variant="default" className="border-primary/50 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescriptionComponent className="text-primary">
              Showing all-time data because you have fewer than {ENTRIES_THRESHOLD_FOR_FILTERING} total entries. Select a date range to filter.
            </AlertDescriptionComponent>
         </Alert>
       )}

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Cash In" value={processedData.summaryData.totalCashIn} icon={TrendingUp} />
        <SummaryCard title="Total Cash Out" value={processedData.summaryData.totalCashOut} icon={TrendingDown} />
        <SummaryCard title="Net Cash Flow" value={processedData.summaryData.netCashFlow} icon={DollarSign} />
        <SummaryCard title="Cash Transactions" value={processedData.summaryData.transactionCount} icon={Activity} isCurrency={false} />
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
