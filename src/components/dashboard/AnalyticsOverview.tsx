"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryCard } from "./SummaryCard";
import { TrendingUp, TrendingDown, Percent } from "lucide-react"; // Removed Hash as it's not used for KPIs

// Define types for the props this component will now receive
export interface AnalyticsKpiData {
  avgTransactionValue: number;
  profitMargin: number;
  incomeTransactions: number;
  expenseTransactions: number;
}

export interface ExpenseCategoryData {
  name: string;
  total: number;
}

interface AnalyticsOverviewProps {
  kpis: AnalyticsKpiData;
  expenseCategories: ExpenseCategoryData[];
  isLoading?: boolean;
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


export function AnalyticsOverview({ kpis, expenseCategories, isLoading = false }: AnalyticsOverviewProps) {
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

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
  
  // Check if there's meaningful data to display, not just if journalEntries was empty
  const noDataAvailable = !isLoading && 
                         kpis.avgTransactionValue === 0 && 
                         kpis.profitMargin === 0 && 
                         kpis.incomeTransactions === 0 && 
                         kpis.expenseTransactions === 0 && 
                         expenseCategories.length === 0;


  if (noDataAvailable) {
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
          icon={TrendingUp} // Consider if TrendingUp is always appropriate
        />
        <SummaryCard 
          title="Profit Margin" 
          value={kpis.profitMargin} 
          icon={Percent} 
          isCurrency={false} 
          change={`${kpis.profitMargin.toFixed(1)}%`} 
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
            <p className="text-muted-foreground">No expense data to display for the chart.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
