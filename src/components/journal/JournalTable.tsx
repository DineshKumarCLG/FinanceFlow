
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
import { useState, useEffect } from "react";
import type { JournalEntry } from "@/lib/data-service"; 

interface JournalTableProps {
  entries: JournalEntry[]; 
}

export function JournalTable({ entries = [] }: JournalTableProps) { 
  const [clientLocale, setClientLocale] = useState('en-US'); 

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  return (
    <Card className="shadow-lg">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-20rem)]"> 
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
                      {entry.amount.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}
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
