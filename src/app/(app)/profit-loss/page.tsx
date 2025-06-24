
"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/shared/PageTitle";
import { ProfitLossReport, type ProfitLossReportData } from "@/components/dashboard/ProfitLossReport";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

export const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received', 'consulting income', 'project revenue', 'deposit', 'commission', 'dividend'];
export const expenseKeywords = ['expense', 'cost', 'supply', 'rent', 'salary', 'utility', 'utilities', 'purchase', 'advertising', 'maintenance', 'insurance', 'interest paid', 'fee', 'software', 'development', 'services', 'consulting', 'contractor', 'design', 'travel', 'subscription', 'depreciation', 'amortization', 'office supplies', 'postage', 'printing', 'repairs', 'loss', 'cogs', 'cost of goods sold'];


export default function ProfitLossPage() {
  const { user: currentUser, currentCompanyId } = useAuth();
  const [profitLossReportData, setProfitLossReportData] = useState<ProfitLossReportData | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(today),
      to: endOfMonth(today),
    };
  });
  
  const { data: journalEntries, isLoading, error } = useQuery<StoredJournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentUser && !!currentCompanyId,
  });

  useEffect(() => {
    if (!journalEntries) return;

    const dateRangeFrom = dateRange?.from || new Date(0);
    const dateRangeTo = dateRange?.to || new Date();
    const inclusiveDateTo = new Date(dateRangeTo.getFullYear(), dateRangeTo.getMonth(), dateRangeTo.getDate(), 23, 59, 59);

    const entriesInDateRange = journalEntries.filter(entry => {
        try {
            const entryDate = new Date(entry.date);
            return entryDate >= dateRangeFrom && entryDate <= inclusiveDateTo;
        } catch(e) {
            return false;
        }
    });

    let totalRevenue = 0;
    let totalExpenses = 0;
    const revenueItems: Record<string, number> = {};
    const expenseItems: Record<string, number> = {};

    entriesInDateRange.forEach(entry => {
      // Revenue is recognized from the credit side of an income account
      if (incomeKeywords.some(keyword => entry.creditAccount?.toLowerCase().includes(keyword))) {
        totalRevenue += entry.amount;
        revenueItems[entry.creditAccount] = (revenueItems[entry.creditAccount] || 0) + entry.amount;
      }
      // Expenses are recognized from the debit side of an expense account
      if (expenseKeywords.some(keyword => entry.debitAccount?.toLowerCase().includes(keyword))) {
        totalExpenses += entry.amount;
        expenseItems[entry.debitAccount] = (expenseItems[entry.debitAccount] || 0) + entry.amount;
      }
    });

    setProfitLossReportData({
      revenueItems: Object.entries(revenueItems).map(([accountName, amount]) => ({accountName, amount})).sort((a,b) => b.amount - a.amount),
      expenseItems: Object.entries(expenseItems).map(([accountName, amount]) => ({accountName, amount})).sort((a,b) => b.amount - a.amount),
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      formattedDateRange: `${format(dateRangeFrom, "LLL dd, y")} - ${format(dateRangeTo, "LLL dd, y")}`
    });

  }, [journalEntries, dateRange]);


  if (!currentCompanyId && !isLoading) {
    return (
      <div className="space-y-6 p-4">
        <PageTitle
          title="Profit & Loss Statement"
          description="Analyze your company's revenues and expenses over a period."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Company ID Missing</AlertTitle>
          <AlertDescription>
            Please select or enter a Company ID on the main page to view this report.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Profit & Loss Statement"
        description="Analyze your company's revenues and expenses over a period."
      >
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
      </PageTitle>

      {error && (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>{error.message || "Could not fetch data for the report."}</AlertDescription>
        </Alert>
      )}

      <ProfitLossReport reportData={profitLossReportData} isLoading={isLoading} />
    </div>
  );
}
