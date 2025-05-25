"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltipContent } from "@/components/ui/chart" // Assuming ChartTooltipContent is part of ShadCN chart components

// Placeholder data
const chartData = [
  { month: "Jan", income: 1860, expense: 800 },
  { month: "Feb", income: 3050, expense: 1900 },
  { month: "Mar", income: 2370, expense: 1200 },
  { month: "Apr", income: 730, expense: 1900 },
  { month: "May", income: 2090, expense: 1300 },
  { month: "Jun", income: 2140, expense: 1100 },
];

export function IncomeExpenseChart() {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Income vs. Expenses</CardTitle>
        <CardDescription>Monthly overview for the last 6 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
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
              <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
