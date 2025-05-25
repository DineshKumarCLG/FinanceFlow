
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
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { JournalEntry } from "@/lib/data-service"; 

interface JournalTableProps {
  entries: JournalEntry[]; 
  onDelete: (entry: JournalEntry) => void;
}

export function JournalTable({ entries = [], onDelete }: JournalTableProps) { 
  const [clientLocale, setClientLocale] = useState('en-US'); 

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  return (
    <Card className="shadow-lg flex flex-col flex-1 overflow-hidden"> {/* Allow card to grow and manage overflow */}
      <CardContent className="p-0 flex-1 overflow-hidden"> {/* Content takes up space and hides its own overflow */}
        <ScrollArea className="h-full"> {/* ScrollArea takes full height of parent */}
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Debit Account</TableHead>
                <TableHead>Credit Account</TableHead>
                <TableHead className="text-right w-[120px]">Amount</TableHead>
                <TableHead className="w-[150px]">Tags</TableHead>
                <TableHead className="w-[100px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
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
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => onDelete(entry)} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
