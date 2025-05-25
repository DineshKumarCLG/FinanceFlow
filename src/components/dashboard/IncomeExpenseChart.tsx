
"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

interface ChartPoint {
  month: string;
  income: number; // Represents the single series in the "Overview" chart
  // expense: number; // Kept for potential future use if dual series needed
}

interface IncomeExpenseChartProps {
  chartData: ChartPoint[];
  isLoading?: boolean;
}

// Chart config now uses 'income' which maps to the primary color from CSS variables
const chartConfig = {
  income: {
    label: "Value", // Generic label for the single series
    color: "hsl(var(--chart-1))", // This will be the lime green
  },
  // expense: { // Keep for potential future use
  //   label: "Expenses",
  //   color: "hsl(var(--chart-2))", 
  // },
} satisfies ChartConfig;

export function IncomeExpenseChart({ chartData = [], isLoading = false }: IncomeExpenseChartProps) {
  const formatCurrency = (value: number) => {
    if (value === 0) return "$0";
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };
  
  return (
    // Removed Card wrapper as it's in the parent now
    // <Card className="shadow-sm border-border">
    //   <CardHeader>
    //     <CardTitle className="text-lg font-semibold">Overview</CardTitle>
    //     {/* <CardDescription>Monthly overview for the last 12 months.</CardDescription> */}
    //   </CardHeader>
    //   <CardContent className="pl-2 pr-4 pb-4"> {/* Adjust padding for recharts */}
        <>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" /> // Adjusted height
        ) : chartData.length === 0 ? (
          <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground">
            No data available for chart.
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }} barGap={8} barCategoryGap="20%">
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
                    domain={[0, 'dataMax + 1000']} // Dynamic domain based on data
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    content={<ChartTooltipContent formatter={(value, name) => (
                        <div className="flex flex-col">
                           <span className="text-xs text-muted-foreground">{name}</span>
                           <span className="font-semibold">{typeof value === 'number' ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : value}</span>
                        </div>
                    )} />}
                  />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} name="Value" barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
        </>
    //   </CardContent>
    // </Card>
  )
}
```