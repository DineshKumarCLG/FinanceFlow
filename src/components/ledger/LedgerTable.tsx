
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { suggestLedgerTags } from "@/ai/flows/suggest-ledger-tags";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export interface LedgerTransaction {
  id: string;
  date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  tags?: string[];
}

// Sample transactions removed as data will come from props

interface LedgerTableProps {
  accountName: string;
  transactions: LedgerTransaction[]; // Changed from optional
  companyId: string; // Expect companyId
}

export function LedgerTable({ accountName, transactions = [], companyId }: LedgerTableProps) {
  const [currentTransactions, setCurrentTransactions] = useState(transactions);
  const [loadingTagsFor, setLoadingTagsFor] = useState<string | null>(null);
  const { toast } = useToast();
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  useEffect(() => {
    setCurrentTransactions(transactions);
  }, [transactions]);

  const handleSuggestTags = async (transactionId: string, description: string) => {
    if (!companyId) { // Ensure companyId is present
      toast({ variant: "destructive", title: "Error", description: "Company ID is missing. Cannot suggest tags." });
      return;
    }
    setLoadingTagsFor(transactionId);
    try {
      // Assuming suggestLedgerTags does not need companyId, if it does, it would need to be passed.
      // For now, the flow itself is not company-scoped in its input.
      const { tags } = await suggestLedgerTags({ entryDescription: description });
      setCurrentTransactions(prev =>
        prev.map(tx =>
          tx.id === transactionId ? { ...tx, tags: Array.from(new Set([...(tx.tags || []), ...tags])) } : tx
        )
      );
      toast({ title: "Tags Suggested", description: `AI suggested tags for "${description}".` });
    } catch (error) {
      console.error("Failed to suggest tags:", error);
      toast({ variant: "destructive", title: "Tagging Error", description: "Could not suggest tags at this time." });
    } finally {
      setLoadingTagsFor(null);
    }
  };

  const totalDebits = currentTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
  const totalCredits = currentTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
  const finalBalance = currentTransactions.length > 0 ? currentTransactions[currentTransactions.length - 1].balance : 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Ledger: {accountName} {companyId ? `(${companyId})` : ''}</CardTitle>
        <CardDescription>Detailed transactions for the selected account.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-28rem)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-[100px]">Debit</TableHead>
                <TableHead className="text-right w-[100px]">Credit</TableHead>
                <TableHead className="text-right w-[120px]">Balance</TableHead>
                <TableHead className="w-[250px]">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No transactions found for this account or filter.
                  </TableCell>
                </TableRow>
              ) : (
                currentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell className="text-right">
                      {tx.debit ? tx.debit.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' }) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.credit ? tx.credit.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' }) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {tx.balance.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {tx.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5"
                          onClick={() => handleSuggestTags(tx.id, tx.description)}
                          disabled={loadingTagsFor === tx.id || !companyId}
                          title="Suggest tags with AI"
                        >
                           {loadingTagsFor === tx.id ? (
                             <Loader2 className="h-3 w-3 animate-spin" />
                           ) : (
                             <Wand2 className="h-3 w-3 text-primary" />
                           )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter className="sticky bottom-0 bg-background z-10">
              <TableRow>
                <TableHead colSpan={2} className="text-right font-bold">Totals / Final Balance</TableHead>
                <TableHead className="text-right font-bold">{totalDebits.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}</TableHead>
                <TableHead className="text-right font-bold">{totalCredits.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}</TableHead>
                <TableHead className="text-right font-bold">{finalBalance.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableFooter>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
