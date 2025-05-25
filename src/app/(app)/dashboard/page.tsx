
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { DollarSign, TrendingUp, TrendingDown, FileText, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

// Placeholder data for recent transactions
const recentTransactionsData = [
  { id: "1", date: "2024-07-15", description: "Software Subscription", amount: -49.99, category: "Software" },
  { id: "2", date: "2024-07-14", description: "Client Payment - Project Alpha", amount: 1200.00, category: "Income" },
  { id: "3", date: "2024-07-13", description: "Office Supplies", amount: -75.50, category: "Office Expense" },
  { id: "4", date: "2024-07-12", description: "Freelancer Payment", amount: -350.00, category: "Contractors" },
  { id: "5", date: "2024-07-11", description: "Web Hosting Renewal", amount: -15.00, category: "Utilities" },
];


export default function DashboardPage() {
  const [clientLocale, setClientLocale] = useState('en-US'); // Default locale
  const [recentTransactions, setRecentTransactions] = useState(recentTransactionsData);

  useEffect(() => {
    // This effect runs only on the client, after hydration
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
    // In a real app, you might fetch recentTransactions here
    // For now, we just use the static data
    setRecentTransactions(recentTransactionsData);
  }, []);


  return (
    <div className="space-y-6 md:space-y-8">
      <PageTitle title="Dashboard" description="Welcome back! Here's a summary of your finances." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Income" value="$12,450" icon={TrendingUp} change="+15.2% from last month" changeType="positive" />
        <SummaryCard title="Total Expenses" value="$3,890" icon={TrendingDown} change="+5.1% from last month" changeType="negative"/>
        <SummaryCard title="Net Profit" value="$8,560" icon={DollarSign} />
        <SummaryCard title="Transactions" value="128" icon={FileText} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
           <IncomeExpenseChart />
        </div>
        <div className="md:col-span-1">
            <QuickActions />
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.amount > 0 ? "default" : "secondary"} 
                           className={transaction.amount > 0 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}>
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? `+` : ``}{transaction.amount.toLocaleString(clientLocale, { style: 'currency', currency: 'USD' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
