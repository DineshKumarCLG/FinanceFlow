
"use client";

import { useState, useEffect, useMemo } from "react";
import type { JournalEntry } from "@/lib/data-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { incomeKeywords, expenseKeywords } from "@/app/(app)/dashboard/page"; // Import from dashboard


interface ProfitLossReportProps {
  journalEntries: JournalEntry[];
  dateRange?: DateRange;
  isLoading?: boolean;
}

interface ReportLineItem {
  accountName: string;
  amount: number;
}

export function ProfitLossReport({ journalEntries, dateRange, isLoading = false }: ProfitLossReportProps) {
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const { revenueItems, expenseItems, totalRevenue, totalExpenses, netProfit } = useMemo(() => {
    if (!journalEntries) {
      return { revenueItems: [], expenseItems: [], totalRevenue: 0, totalExpenses: 0, netProfit: 0 };
    }

    const revenues: Record<string, number> = {};
    const expenses: Record<string, number> = {};
    let currentTotalRevenue = 0;
    let currentTotalExpenses = 0;

    journalEntries.forEach(entry => {
      let isIncome = false;
      // Check for income
      if (incomeKeywords.some(keyword => entry.creditAccount?.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword))) {
        isIncome = true;
        const account = entry.creditAccount || "Uncategorized Revenue";
        revenues[account] = (revenues[account] || 0) + entry.amount;
        currentTotalRevenue += entry.amount;
      }
      
      // Check for expenses
      // Prioritize explicit expense accounts, then cash outflows not marked as income
      if (expenseKeywords.some(keyword => entry.debitAccount?.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword))) {
        const account = entry.debitAccount || "Uncategorized Expense";
        expenses[account] = (expenses[account] || 0) + entry.amount;
        currentTotalExpenses += entry.amount;
      } else if ( (entry.creditAccount?.toLowerCase().includes('cash') || entry.creditAccount?.toLowerCase().includes('bank')) && !isIncome ) {
        // If cash/bank is credited and it's not already an income transaction, consider it an expense
        const account = entry.description || "Cash Payment (Uncategorized)"; // Use description as fallback category
        expenses[account] = (expenses[account] || 0) + entry.amount;
        currentTotalExpenses += entry.amount;
      }
    });
    
    const revenueItemsList = Object.entries(revenues).map(([accountName, amount]) => ({ accountName, amount }));
    const expenseItemsList = Object.entries(expenses).map(([accountName, amount]) => ({ accountName, amount }));

    return {
      revenueItems: revenueItemsList,
      expenseItems: expenseItemsList,
      totalRevenue: currentTotalRevenue,
      totalExpenses: currentTotalExpenses,
      netProfit: currentTotalRevenue - currentTotalExpenses,
    };
  }, [journalEntries]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR' }).format(value);
  };
  
  const formattedDateRange = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`;
    } else if (dateRange?.from) {
      return `From ${format(dateRange.from, "LLL dd, y")}`;
    }
    return "All Time";
  }, [dateRange]);


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (journalEntries.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
           <CardDescription>For the period: {formattedDateRange}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available for the selected period to generate the report.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit & Loss Statement</CardTitle>
        <CardDescription>For the period: {formattedDateRange}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-3/5">Account</TableHead>
              <TableHead className="text-right w-2/5">Amount (INR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="font-semibold bg-muted/30">
              <TableCell>Revenue</TableCell>
              <TableCell></TableCell>
            </TableRow>
            {revenueItems.length > 0 ? revenueItems.map((item, index) => (
              <TableRow key={`rev-${index}`}>
                <TableCell className="pl-8">{item.accountName}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={2} className="text-muted-foreground pl-8">No revenue recorded.</TableCell></TableRow>
            )}
            <TableRow className="font-semibold">
              <TableCell>Total Revenue</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
            </TableRow>

            <TableRow className="font-semibold bg-muted/30 mt-4">
              <TableCell>Expenses</TableCell>
              <TableCell></TableCell>
            </TableRow>
            {expenseItems.length > 0 ? expenseItems.map((item, index) => (
              <TableRow key={`exp-${index}`}>
                <TableCell className="pl-8">{item.accountName}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
              </TableRow>
            )) : (
               <TableRow><TableCell colSpan={2} className="text-muted-foreground pl-8">No expenses recorded.</TableCell></TableRow>
            )}
            <TableRow className="font-semibold">
              <TableCell>Total Expenses</TableCell>
              <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow className="text-lg font-bold border-t-2 border-primary">
              <TableCell>Net Profit / (Loss)</TableCell>
              <TableCell className="text-right">{formatCurrency(netProfit)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
