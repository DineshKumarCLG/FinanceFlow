
"use client";

import { useState, useEffect, useMemo } from "react";
import type { JournalEntry } from "@/lib/data-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryCard } from "./SummaryCard";
import { TrendingUp, TrendingDown, Hash, Percent } from "lucide-react";
import { incomeKeywords, expenseKeywords } from "@/app/(app)/dashboard/page"; // Import from dashboard

interface AnalyticsOverviewProps {
  journalEntries: JournalEntry[];
  isLoading?: boolean;
}

interface ExpenseCategoryData {
  name: string;
  total: number;
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const chartConfig = {
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-1))", // Default, individual bars will get colors from chartColors
  },
} satisfies ChartConfig;


export function AnalyticsOverview({ journalEntries, isLoading = false }: AnalyticsOverviewProps) {
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const { kpis, expenseCategories } = useMemo(() => {
    if (journalEntries.length === 0) {
      return {
        kpis: {
          avgTransactionValue: 0,
          profitMargin: 0,
          incomeTransactions: 0,
          expenseTransactions: 0,
          totalRevenue: 0,
          totalExpenses: 0,
        },
        expenseCategories: [],
      };
    }

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalTransactionAmount = 0;
    let incomeTransactions = 0;
    let expenseTransactions = 0;
    const expensesByAccount: Record<string, number> = {};

    journalEntries.forEach(entry => {
      totalTransactionAmount += entry.amount;
      let isIncome = false;
      let isExpense = false;

      if (incomeKeywords.some(keyword => entry.creditAccount?.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword))) {
        isIncome = true;
        totalRevenue += entry.amount;
        incomeTransactions++;
      }
      
      if (expenseKeywords.some(keyword => entry.debitAccount?.toLowerCase().includes(keyword) || entry.description.toLowerCase().includes(keyword))) {
         isExpense = true;
      }
      if (entry.creditAccount?.toLowerCase().includes('cash') || entry.creditAccount?.toLowerCase().includes('bank')) {
        if(!isIncome) isExpense = true;
      }

      if(isExpense){
        totalExpenses += entry.amount;
        expenseTransactions++;
        const account = entry.debitAccount || "Uncategorized Expense";
        expensesByAccount[account] = (expensesByAccount[account] || 0) + entry.amount;
      }
    });

    const avgTransactionValue = journalEntries.length > 0 ? totalTransactionAmount / journalEntries.length : 0;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    const sortedExpenseCategories = Object.entries(expensesByAccount)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      kpis: {
        avgTransactionValue,
        profitMargin,
        incomeTransactions,
        expenseTransactions,
        totalRevenue, // Also needed for profit margin context
        totalExpenses, // For context
      },
      expenseCategories: sortedExpenseCategories,
    };
  }, [journalEntries]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }
  
  if (journalEntries.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available to display analytics. Please add some journal entries.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          title="Avg. Transaction Value" 
          value={kpis.avgTransactionValue} 
          icon={TrendingUp} 
        />
        <SummaryCard 
          title="Profit Margin" 
          value={kpis.profitMargin} 
          icon={Percent} 
          isCurrency={false} 
          change={`${kpis.profitMargin.toFixed(1)}%`} // Show percentage
        />
        <SummaryCard 
          title="Income Transactions" 
          value={kpis.incomeTransactions} 
          icon={TrendingUp} 
          isCurrency={false} 
        />
        <SummaryCard 
          title="Expense Transactions" 
          value={kpis.expenseTransactions} 
          icon={TrendingDown} 
          isCurrency={false} 
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Expense Categories</CardTitle>
          <CardDescription>Based on all recorded journal entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseCategories.length > 0 ? (
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseCategories} layout="vertical" margin={{ right: 30, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={formatCurrency} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={150} tick={{ dx: -5 }} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                  />
                  <Bar dataKey="total" name="Total Expenses" radius={[0, 4, 4, 0]} barSize={25}>
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </ChartContainer>
            </div>
          ) : (
            <p className="text-muted-foreground">No expense data to display.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
