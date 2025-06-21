
"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

interface ExpensesPieChartProps {
    data: { name: string; total: number }[];
    isLoading?: boolean;
}

const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "#FFBB28", 
    "#FF8042"
];

const CustomLegend = (props: any) => {
    const { payload } = props;
    const [clientLocale, setClientLocale] = useState('en-US');

    useEffect(() => {
        if (typeof navigator !== 'undefined') {
        setClientLocale(navigator.language || 'en-US');
        }
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR' }).format(value);
    }
    
    if (!payload || payload.length === 0) {
        return <div className="text-sm text-muted-foreground">No expense categories to show.</div>;
    }

    return (
        <ul className="flex flex-col gap-2 text-sm">
        {payload.map((entry, index) => (
            <li key={`item-${index}`} className="flex items-center justify-between gap-2 truncate">
                <div className="flex items-center gap-2 truncate">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="truncate text-muted-foreground" title={entry.value}>{entry.value}</span>
                </div>
                <span className="font-semibold">{formatCurrency(entry.payload.total)}</span>
            </li>
        ))}
        </ul>
    );
};


export function ExpensesPieChart({ data = [], isLoading = false }: ExpensesPieChartProps) {
    const [clientLocale, setClientLocale] = useState('en-US');

    useEffect(() => {
        if (typeof navigator !== 'undefined') {
        setClientLocale(navigator.language || 'en-US');
        }
    }, []);

    const chartConfig = useMemo(() => {
        const config: ChartConfig = {};
        if (data && data.length > 0) {
            data.forEach((item, index) => {
                config[item.name] = {
                    label: item.name,
                    color: COLORS[index % COLORS.length]
                }
            });
        }
        return config;
    }, [data]);

    const formatCurrencyTooltip = (value: number) => {
        return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR' }).format(value);
    }

    const totalExpenses = data.reduce((sum, item) => sum + item.total, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Expenses Breakdown</CardTitle>
                <CardDescription>
                    Total Expenses: {formatCurrencyTooltip(totalExpenses)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    {isLoading ? (
                         <Skeleton className="h-full w-full" />
                    ) : data.length === 0 ? (
                         <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            No expense data for this period.
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-full">
                                <div className="w-full h-full min-h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <ChartTooltip
                                                cursor={false}
                                                content={<ChartTooltipContent hideLabel nameKey="name" />}
                                            />
                                            <Pie 
                                                data={data} 
                                                dataKey="total" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={60} 
                                                outerRadius={90} 
                                                strokeWidth={2}
                                            >
                                                {data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full">
                                    <CustomLegend payload={data.map((entry, index) => ({
                                        value: entry.name,
                                        type: 'circle',
                                        color: COLORS[index % COLORS.length],
                                        payload: {
                                            total: entry.total
                                        }
                                    }))} />
                                </div>
                            </div>
                        </ChartContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

    
