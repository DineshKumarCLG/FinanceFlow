
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface NetIncomeChartProps {
  data: { month: string; value: number }[]; // Changed netIncome to generic 'value'
  isLoading?: boolean;
}

const chartConfig = {
  value: { // Changed from netIncome to 'value'
    label: "Net Flow",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


export function NetIncomeChart({ data = [], isLoading = false }: NetIncomeChartProps) {
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const formatCurrencyYAxis = (value: number) => {
    if (value === 0) return '₹0';
    if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(0)}Cr`;
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
    return `₹${(value / 1000).toFixed(0)}k`;
  };
  
  const formatCurrencyTooltip = (value: number) => {
    return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR' }).format(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumulative Net Flow</CardTitle>
        <CardDescription>Cumulative inflow vs. outflow over the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : data.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                No data available for the selected period.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="w-full h-full">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
                <YAxis tickFormatter={formatCurrencyYAxis} tickLine={false} axisLine={false} tickMargin={5} fontSize={12} />
                <ChartTooltip
                  cursor={{ stroke: "hsl(var(--chart-1))", strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={
                    <ChartTooltipContent
                        formatter={(value) => formatCurrencyTooltip(Number(value))}
                        labelClassName="font-bold"
                    />
                  }
                />
                <Area type="monotone" dataKey="value" name="Net Flow" strokeWidth={2} stroke="var(--color-value)" fill="url(#cashFlowGradient)" />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

    