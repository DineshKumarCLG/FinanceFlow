"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// Define types for the props this component will now receive
export interface ReportLineItem {
  accountName: string;
  amount: number;
}

export interface ProfitLossReportData {
  revenueItems: ReportLineItem[];
  expenseItems: ReportLineItem[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  formattedDateRange: string;
}

interface ProfitLossReportProps {
  reportData?: ProfitLossReportData; // Make it optional initially
  isLoading?: boolean;
}

export function ProfitLossReport({ reportData, isLoading = false }: ProfitLossReportProps) {
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(clientLocale, { style: 'currency', currency: 'INR' }).format(value);
  };
  
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
  
  if (!reportData || (reportData.revenueItems.length === 0 && reportData.expenseItems.length === 0 && !isLoading)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit &amp; Loss Statement</CardTitle>
           <CardDescription>For the period: {reportData?.formattedDateRange || "selected period"}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available for the selected period to generate the report.</p>
        </CardContent>
      </Card>
    );
  }

  const { revenueItems, expenseItems, totalRevenue, totalExpenses, netProfit, formattedDateRange } = reportData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit &amp; Loss Statement</CardTitle>
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
