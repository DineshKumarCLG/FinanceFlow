
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


// --- Dashboard Data Logic Keywords ---
// These keywords determine how transactions are categorized for the dashboard's "activity" view.
export const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received', 'consulting income', 'project revenue', 'commission', 'dividend income', 'gain'];
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
      summaryData: { totalInflow: 0, totalOutflow: 0, netFlow: 0, transactionCount: 0 },
      cumulativeFlowData: [],
      monthlyFlowChartData: [],
      spendingBreakdownData: [],
      analyticsKpis: { avgTransactionValue: 0, netFlow: 0, inflowTransactions: 0, outflowTransactions: 0 },
      analyticsExpenseCategories: [],
    };
    if (!journalEntriesData) return defaultData;

    // A. Determine the effective date range for filtering
    const isFilterActive = journalEntriesData.length >= ENTRIES_THRESHOLD_FOR_FILTERING;
    setIsFilterBypassed(!isFilterActive);

    let effectiveDateRange: { from: Date; to: Date };
    if (isFilterActive && dateRange?.from) {
      effectiveDateRange = {
        from: dateRange.from,
        to: dateRange.to || endOfMonth(new Date()),
      };
    } else {
      if (journalEntriesData && journalEntriesData.length > 0) {
        const allDates = journalEntriesData.map(e => parseISO(e.date));
        effectiveDateRange = {
          from: new Date(Math.min(...allDates.map(d => d.getTime()))),
          to: new Date(Math.max(...allDates.map(d => d.getTime()))),
        };
      } else {
        effectiveDateRange = {
          from: startOfMonth(subMonths(new Date(), 5)),
          to: endOfMonth(new Date()),
        };
      }
    }
    const { from: rangeStart, to: rangeEnd } = effectiveDateRange;
    const inclusiveEndDate = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59);

    const entriesInPeriod = journalEntriesData.filter(entry => {
        try {
            const entryDate = parseISO(entry.date);
            return entryDate >= rangeStart && entryDate <= inclusiveEndDate;
        } catch (e) { return false; }
    });

    // B. Process entries in the selected period to calculate dashboard metrics
    let totalInflow = 0;
    let totalOutflow = 0;
    const monthlyFlows: Record<string, { income: number; expense: number; monthLabel: string; yearMonth: string }> = {};
    const spendingByCategory: Record<string, number> = {};
    const movementsInPeriod: {date: Date, amount: number}[] = [];

    const monthsInRange = eachMonthOfInterval({ start: rangeStart, end: inclusiveEndDate });
    monthsInRange.forEach(d => {
        const key = format(d, 'yyyy-MM');
        monthlyFlows[key] = { income: 0, expense: 0, monthLabel: format(d, 'MMM yy'), yearMonth: key };
    });

    entriesInPeriod.forEach(entry => {
        const lowerDebit = entry.debitAccount.toLowerCase();
        const lowerCredit = entry.creditAccount.toLowerCase();

        // Skip internal cash transfers (e.g., Cash -> Bank)
        const isCashTransfer = cashAccountKeywords.some(k => lowerDebit.includes(k)) && cashAccountKeywords.some(k => lowerCredit.includes(k));
        if (isCashTransfer) return;

        const movementDate = parseISO(entry.date);
        
        // Check for inflow (revenue/income)
        if (incomeKeywords.some(k => lowerCredit.includes(k))) {
            totalInflow += entry.amount;
            movementsInPeriod.push({ date: movementDate, amount: entry.amount });
            const key = format(movementDate, 'yyyy-MM');
            if (monthlyFlows[key]) monthlyFlows[key].income += entry.amount;
        } 
        // Check for outflow (any debit to a non-cash account is considered spending)
        else if (!cashAccountKeywords.some(k => lowerDebit.includes(k))) {
            totalOutflow += entry.amount;
            movementsInPeriod.push({ date: movementDate, amount: -entry.amount });
            spendingByCategory[entry.debitAccount] = (spendingByCategory[entry.debitAccount] || 0) + entry.amount;
            const key = format(movementDate, 'yyyy-MM');
            if (monthlyFlows[key]) monthlyFlows[key].expense += entry.amount;
        }
        // Fallback for simple cash payments not otherwise categorized
        else if (cashAccountKeywords.some(k => lowerCredit.includes(k))) {
            totalOutflow += entry.amount;
            movementsInPeriod.push({ date: movementDate, amount: -entry.amount });
            spendingByCategory[entry.debitAccount] = (spendingByCategory[entry.debitAccount] || 0) + entry.amount;
            const key = format(movementDate, 'yyyy-MM');
            if (monthlyFlows[key]) monthlyFlows[key].expense += entry.amount;
        }
    });

    const summaryData = {
      totalInflow,
      totalOutflow,
      netFlow: totalInflow - totalOutflow,
      transactionCount: movementsInPeriod.length,
    };
    
    const monthlyFlowChartData = Object.values(monthlyFlows).sort((a,b) => a.yearMonth.localeCompare(b.yearMonth)).map(agg => ({
        month: agg.monthLabel,
        income: agg.income,
        expense: agg.expense,
        net: agg.income - agg.expense,
    }));

    const spendingBreakdownData = Object.entries(spendingByCategory).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);

    // C. Process ALL historical entries for the cumulative chart
    let cumulativeNet = 0;
    const allMovementsSorted = journalEntriesData.map(entry => {
        const lowerDebit = entry.debitAccount.toLowerCase();
        const lowerCredit = entry.creditAccount.toLowerCase();
        const isCashTransfer = cashAccountKeywords.some(k => lowerDebit.includes(k)) && cashAccountKeywords.some(k => lowerCredit.includes(k));
        if (isCashTransfer) return null;

        let amount = 0;
        if (incomeKeywords.some(k => lowerCredit.includes(k))) {
            amount = entry.amount;
        } else if (!cashAccountKeywords.some(k => lowerDebit.includes(k))) {
            amount = -entry.amount;
        } else if (cashAccountKeywords.some(k => lowerCredit.includes(k))) {
            amount = -entry.amount;
        }
        
        if (amount === 0) return null;
        try { return { date: parseISO(entry.date), amount }; } catch(e) { return null; }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a,b) => a.date.getTime() - b.date.getTime());

    const cumulativeDataPoints = allMovementsSorted.map(m => {
        cumulativeNet += m.amount;
        return { monthDate: startOfMonth(m.date), value: cumulativeNet };
    });

    const cumulativeMonthlyFlows: Record<string, { month: string; value: number }> = {};
    cumulativeDataPoints.forEach(p => {
        const key = format(p.monthDate, 'yyyy-MM');
        cumulativeMonthlyFlows[key] = { month: format(p.monthDate, 'MMM yy'), value: p.value };
    });

    const cumulativeFlowData = Object.entries(cumulativeMonthlyFlows)
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => a.key.localeCompare(b.key))
        .filter(item => {
            const itemDate = parseISO(item.key + '-01');
            return itemDate >= startOfMonth(rangeStart) && itemDate <= endOfMonth(inclusiveEndDate);
        });

    // D. Finalize Analytics KPIs
    const analyticsKpis = {
        avgTransactionValue: movementsInPeriod.length > 0 ? movementsInPeriod.reduce((sum, m) => sum + Math.abs(m.amount), 0) / movementsInPeriod.length : 0,
        netFlow: summaryData.netFlow,
        inflowTransactions: movementsInPeriod.filter(m => m.amount > 0).length,
        outflowTransactions: movementsInPeriod.filter(m => m.amount < 0).length,
    };
    const analyticsExpenseCategories = spendingBreakdownData.slice(0, 7);

    return { summaryData, cumulativeFlowData, monthlyFlowChartData, spendingBreakdownData, analyticsKpis, analyticsExpenseCategories };
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
        <SummaryCard title="Total Inflow (Revenue)" value={processedData.summaryData.totalInflow} icon={TrendingUp} />
        <SummaryCard title="Total Outflow (Spending)" value={processedData.summaryData.totalOutflow} icon={TrendingDown} />
        <SummaryCard title="Net Flow" value={processedData.summaryData.netFlow} icon={DollarSign} />
        <SummaryCard title="Total Transactions" value={processedData.summaryData.transactionCount} icon={Activity} isCurrency={false} />
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
              <NetIncomeChart data={processedData.cumulativeFlowData} isLoading={isLoadingJournalEntries} />
              <div className="grid gap-6 md:grid-cols-2">
                  <CashFlowChart data={processedData.monthlyFlowChartData} isLoading={isLoadingJournalEntries} />
                  <ExpensesPieChart data={processedData.spendingBreakdownData} isLoading={isLoadingJournalEntries} />
              </div>
              <AnalyticsOverview kpis={{...processedData.analyticsKpis, netCashFlow: processedData.summaryData.netFlow}} expenseCategories={processedData.analyticsExpenseCategories} isLoading={isLoadingJournalEntries} />
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

    