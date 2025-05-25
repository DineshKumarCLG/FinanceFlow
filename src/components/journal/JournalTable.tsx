"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

// Placeholder type for journal entries
export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  tags?: string[];
}

// Placeholder data
const sampleJournalEntries: JournalEntry[] = [
  { id: "1", date: "2024-07-15", description: "Office Supplies Purchase", debitAccount: "Office Expenses", creditAccount: "Cash", amount: 150.75, tags: ["office", "expense"] },
  { id: "2", date: "2024-07-14", description: "Client Payment Received", debitAccount: "Cash", creditAccount: "Service Revenue", amount: 1200.00, tags: ["income", "client A"] },
  { id: "3", date: "2024-07-13", description: "Software Subscription Renewal", debitAccount: "Software Expenses", creditAccount: "Credit Card", amount: 49.99, tags: ["software", "recurring"] },
  { id: "4", date: "2024-07-12", description: "Rent Payment", debitAccount: "Rent Expense", creditAccount: "Bank Account", amount: 850.00, tags: ["rent", "fixed cost"] },
  { id: "5", date: "2024-07-11", description: "Consulting Fee for Project X", debitAccount: "Consulting Expenses", creditAccount: "Cash", amount: 500.00, tags: ["consulting", "project X"] },
];

interface JournalTableProps {
  entries?: JournalEntry[];
}

export function JournalTable({ entries = sampleJournalEntries }: JournalTableProps) {
  return (
    <Card className="shadow-lg">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Debit Account</TableHead>
                <TableHead>Credit Account</TableHead>
                <TableHead className="text-right w-[120px]">Amount</TableHead>
                <TableHead className="w-[200px]">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No journal entries found.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell className="font-medium">{entry.description}</TableCell>
                    <TableCell>{entry.debitAccount}</TableCell>
                    <TableCell>{entry.creditAccount}</TableCell>
                    <TableCell className="text-right">
                      {entry.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {entry.tags?.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
