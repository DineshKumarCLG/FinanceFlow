
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getJournalEntries, type StoredJournalEntry } from "@/lib/data-service";
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Upload, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  matched: boolean;
  matchedEntryId?: string;
}

interface ReconciliationAnomalies {
  duplicates: BankTransaction[];
  missingEntries: StoredJournalEntry[];
  amountDiscrepancies: { bank: BankTransaction; journal: StoredJournalEntry }[];
}

export default function BankReconciliationPage() {
  const { currentCompanyId } = useAuth();
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [reconciliationStatus, setReconciliationStatus] = useState<'pending' | 'processing' | 'completed'>('pending');
  const [anomalies, setAnomalies] = useState<ReconciliationAnomalies>({ duplicates: [], missingEntries: [], amountDiscrepancies: [] });

  const { data: journalEntries = [] } = useQuery<StoredJournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentCompanyId,
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBankStatementFile(file);
      parseCSVFile(file);
    }
  };

  const parseCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',');
      
      const transactions: BankTransaction[] = lines.slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(',');
          return {
            id: `bank_${index}`,
            date: values[0]?.trim() || '',
            description: values[1]?.trim() || '',
            amount: parseFloat(values[2]?.trim() || '0'),
            balance: parseFloat(values[3]?.trim() || '0'),
            matched: false,
          };
        });
      
      setBankTransactions(transactions);
      performReconciliation(transactions);
    };
    reader.readAsText(file);
  };

  const performReconciliation = (bankTxns: BankTransaction[]) => {
    setReconciliationStatus('processing');
    
    // Real-time matching algorithm
    const matchedTransactions = bankTxns.map(bankTxn => {
      const matchingEntry = journalEntries.find(entry => 
        Math.abs(new Date(entry.date).getTime() - new Date(bankTxn.date).getTime()) <= 24 * 60 * 60 * 1000 && // Within 1 day
        Math.abs(entry.amount - Math.abs(bankTxn.amount)) < 0.01 // Amount matches within 1 cent
      );
      
      return {
        ...bankTxn,
        matched: !!matchingEntry,
        matchedEntryId: matchingEntry?.id,
      };
    });

    // Anomaly detection
    const duplicates = bankTxns.filter((txn, index, arr) => 
      arr.findIndex(t => t.date === txn.date && t.amount === txn.amount && t.description === txn.description) !== index
    );

    const matchedEntryIds = matchedTransactions.filter(t => t.matched).map(t => t.matchedEntryId);
    const missingEntries = journalEntries.filter(entry => !matchedEntryIds.includes(entry.id));

    const amountDiscrepancies: { bank: BankTransaction; journal: StoredJournalEntry }[] = [];
    matchedTransactions.forEach(bankTxn => {
      if (bankTxn.matchedEntryId) {
        const journalEntry = journalEntries.find(e => e.id === bankTxn.matchedEntryId);
        if (journalEntry && Math.abs(journalEntry.amount - Math.abs(bankTxn.amount)) > 0.01) {
          amountDiscrepancies.push({ bank: bankTxn, journal: journalEntry });
        }
      }
    });

    setBankTransactions(matchedTransactions);
    setAnomalies({ duplicates, missingEntries, amountDiscrepancies });
    setReconciliationStatus('completed');
  };

  const matchedCount = bankTransactions.filter(t => t.matched).length;
  const totalCount = bankTransactions.length;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Bank Reconciliation"
        description="Automatically match bank transactions with journal entries and detect anomalies."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Bank Statement
            </CardTitle>
            <CardDescription>Import CSV file from your bank</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bankStatement">Bank Statement (CSV)</Label>
                <Input
                  id="bankStatement"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
              </div>
              {bankStatementFile && (
                <div className="text-sm text-muted-foreground">
                  File: {bankStatementFile.name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Matched:</span>
                <Badge variant={reconciliationStatus === 'completed' ? 'default' : 'secondary'}>
                  {matchedCount}/{totalCount}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Anomalies:</span>
                <Badge variant={anomalies.duplicates.length + anomalies.amountDiscrepancies.length > 0 ? 'destructive' : 'default'}>
                  {anomalies.duplicates.length + anomalies.amountDiscrepancies.length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Missing Entries:</span>
                <Badge variant={anomalies.missingEntries.length > 0 ? 'secondary' : 'default'}>
                  {anomalies.missingEntries.length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" disabled={reconciliationStatus !== 'completed'}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button variant="outline" className="w-full" disabled={reconciliationStatus !== 'completed'}>
                Auto-Correct Errors
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {anomalies.duplicates.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Found {anomalies.duplicates.length} duplicate transactions that need review.
          </AlertDescription>
        </Alert>
      )}

      {bankTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Transactions</CardTitle>
            <CardDescription>Real-time matching with journal entries</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {transaction.matched ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Matched
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Unmatched
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!transaction.matched && (
                        <Button size="sm" variant="outline">
                          Manual Match
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
