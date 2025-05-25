
"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

interface ChartPoint {
  month: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  chartData: ChartPoint[];
  isLoading?: boolean;
}

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--primary))",
  },
  expense: {
    label: "Expenses",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export function IncomeExpenseChart({ chartData = [], isLoading = false }: IncomeExpenseChartProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Income vs. Expenses</CardTitle>
        <CardDescription>Monthly overview for the last 6 months.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            No data available for chart.
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                    tickFormatter={(value) => `$${value/1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
