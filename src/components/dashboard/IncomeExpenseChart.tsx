"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

interface ChartPoint {
  month: string;
  income: number;
  expense: number; // Added expense
}

interface IncomeExpenseChartProps {
  chartData: ChartPoint[];
  isLoading?: boolean;
}

const chartConfig = {
  income: {
    label: "Income", 
    color: "hsl(var(--chart-1))", // Green
  },
  expense: {
    label: "Expense",
    color: "hsl(var(--chart-2))", // Another color, e.g. a shade of red or blue
  }
} satisfies ChartConfig;

export function IncomeExpenseChart({ chartData = [], isLoading = false }: IncomeExpenseChartProps) {
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);
  
  const formatCurrency = (value: number) => {
    if (value === 0) return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(0);
    if (Math.abs(value) >= 10000000) { // For crores
      return `₹${(value / 10000000).toFixed(value % 10000000 === 0 ? 0 : 1)}Cr`;
    }
    if (Math.abs(value) >= 100000) { // For lakhs
      return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
    }
    if (Math.abs(value) >= 1000) {
      return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 0)}k`;
    }
    return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  return (
        <>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" /> 
        ) : chartData.length === 0 ? (
          <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground">
            No data available for chart.
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ChartContainer config={chartConfig} className="w-full h-full">
              {/* Removed explicit ResponsiveContainer wrapper */}
              <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCurrency}
                  domain={[0, 'dataMax + 1000']} 
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                  content={<ChartTooltipContent 
                      formatter={(value, name) => (
                        <div className="flex flex-col">
                           <span className="text-xs capitalize text-muted-foreground">{name}</span>
                           <span className="font-semibold">{typeof value === 'number' ? formatCurrency(value) : value}</span>
                        </div>
                    )} 
                    nameKey="name" 
                  />}
                />
                 <Legend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} name="Income" barSize={15} />
                <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} name="Expense" barSize={15} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
        </>
  )
}
