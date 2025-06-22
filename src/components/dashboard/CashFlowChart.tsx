
"use client";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartContainer } from "@/components/ui/chart";
import { useState, useEffect } from 'react';

interface CashFlowChartProps {
    data: { month: string; income: number; expense: number; net: number }[];
    isLoading?: boolean;
}

const chartConfig = {
    income: {
      label: "Inflow",
      color: "hsl(var(--chart-1))",
    },
    expense: {
      label: "Outflow",
      color: "hsl(var(--chart-4))",
    },
    net: {
        label: "Net Flow",
        color: "hsl(var(--foreground))"
    }
};

export function CashFlowChart({ data = [], isLoading = false }: CashFlowChartProps) {
    const [clientLocale, setClientLocale] = useState('en-US');

    useEffect(() => {
        if (typeof navigator !== 'undefined') {
        setClientLocale(navigator.language || 'en-US');
        }
    }, []);

    const formatCurrencyYAxis = (value: number) => {
        if (value === 0) return '₹0';
        if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
        return `₹${value.toFixed(0)}`;
    };

    const formatCurrencyTooltip = (value: number) => {
        return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR' }).format(value);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Monthly Activity Flow</CardTitle>
                <CardDescription>Monthly inflow (revenue) vs. outflow (spending).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    {isLoading ? (
                        <Skeleton className="h-full w-full" />
                    ) : data.length === 0 ? (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            No activity data for this period.
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
                                <YAxis tickFormatter={formatCurrencyYAxis} tickLine={false} axisLine={false} fontSize={12} />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        formatter={(value, name) => (
                                            <div className="flex items-center gap-2">
                                                <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{backgroundColor: chartConfig[name as keyof typeof chartConfig]?.color}}/>
                                                <div className="flex flex-1 justify-between">
                                                    <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label || name}</span>
                                                    <span className="font-bold">{formatCurrencyTooltip(Number(value))}</span>
                                                </div>
                                            </div>
                                        )}
                                    />}
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="income" stackId="a" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" stackId="a" fill="var(--color-expense)" radius={[4, 4, 0, 0]}/>
                                <Line type="monotone" dataKey="net" strokeWidth={2} stroke="var(--color-net)" dot={false} />
                            </ComposedChart>
                        </ChartContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

    

    