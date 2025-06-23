
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
import { getJournalEntries, type JournalEntry } from "@/lib/data-service";
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
  missingEntries: JournalEntry[];
  amountDiscrepancies: { bank: BankTransaction; journal: JournalEntry }[];
}

export default function BankReconciliationPage() {
  const { currentCompanyId } = useAuth();
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [reconciliationStatus, setReconciliationStatus] = useState<'pending' | 'processing' | 'completed'>('pending');
  const [anomalies, setAnomalies] = useState<ReconciliationAnomalies>({ duplicates: [], missingEntries: [], amountDiscrepancies: [] });

  const { data: journalEntries = [], isLoading } = useQuery<JournalEntry[], Error>({
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
    
    // Real-time matching algorithm using actual journal entries
    const matchedTransactions = bankTxns.map(bankTxn => {
      const matchingEntry = journalEntries.find(entry => {
        const bankDate = new Date(bankTxn.date);
        const entryDate = new Date(entry.date);
        const timeDiff = Math.abs(bankDate.getTime() - entryDate.getTime());
        const withinOneDay = timeDiff <= 24 * 60 * 60 * 1000;
        const amountMatches = Math.abs(entry.amount - Math.abs(bankTxn.amount)) < 0.01;
        
        // Also check if the entry involves bank/cash accounts
        const isBankAccount = entry.debitAccount.toLowerCase().includes('bank') || 
                             entry.debitAccount.toLowerCase().includes('cash') ||
                             entry.creditAccount.toLowerCase().includes('bank') || 
                             entry.creditAccount.toLowerCase().includes('cash');
        
        return withinOneDay && amountMatches && isBankAccount;
      });
      
      return {
        ...bankTxn,
        matched: !!matchingEntry,
        matchedEntryId: matchingEntry?.id,
      };
    });

    // Anomaly detection using real data
    const duplicates = bankTxns.filter((txn, index, arr) => 
      arr.findIndex(t => t.date === txn.date && t.amount === txn.amount && t.description === txn.description) !== index
    );

    const matchedEntryIds = matchedTransactions.filter(t => t.matched).map(t => t.matchedEntryId);
    const missingEntries = journalEntries.filter(entry => {
      const isBankAccount = entry.debitAccount.toLowerCase().includes('bank') || 
                           entry.debitAccount.toLowerCase().includes('cash') ||
                           entry.creditAccount.toLowerCase().includes('bank') || 
                           entry.creditAccount.toLowerCase().includes('cash');
      return isBankAccount && !matchedEntryIds.includes(entry.id);
    });

    const amountDiscrepancies: { bank: BankTransaction; journal: JournalEntry }[] = [];
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  const matchedCount = bankTransactions.filter(t => t.matched).length;
  const totalCount = bankTransactions.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Bank Reconciliation"
          description="Loading journal entries..."
        />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Bank Reconciliation"
        description="Automatically match bank transactions with journal entries and detect anomalies."
      />

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Bank Statement
          </CardTitle>
          <CardDescription>
            Upload a CSV file of your bank statement to begin reconciliation. 
            Expected format: Date, Description, Amount, Balance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-sm text-muted-foreground">
              File uploaded: {bankStatementFile.name}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation Status */}
      {reconciliationStatus !== 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Reconciliation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
                <p className="text-sm text-muted-foreground">Matched Transactions</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{totalCount - matchedCount}</div>
                <p className="text-sm text-muted-foreground">Unmatched Transactions</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0}%
                </div>
                <p className="text-sm text-muted-foreground">Match Rate</p>
              </div>
            </div>
            
            {reconciliationStatus === 'processing' && (
              <div className="mt-4">
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                  Processing reconciliation with {journalEntries.length} journal entries...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Anomalies Detection */}
      {reconciliationStatus === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Anomalies Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {anomalies.duplicates.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {anomalies.duplicates.length} duplicate transactions found in bank statement
                </AlertDescription>
              </Alert>
            )}
            
            {anomalies.missingEntries.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {anomalies.missingEntries.length} journal entries have no matching bank transactions
                </AlertDescription>
              </Alert>
            )}
            
            {anomalies.amountDiscrepancies.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {anomalies.amountDiscrepancies.length} amount discrepancies found between bank and journal
                </AlertDescription>
              </Alert>
            )}
            
            {anomalies.duplicates.length === 0 && 
             anomalies.missingEntries.length === 0 && 
             anomalies.amountDiscrepancies.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No anomalies detected. All transactions reconciled successfully.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bank Transactions Table */}
      {bankTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Transactions</CardTitle>
            <CardDescription>
              Bank statement transactions with matching status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Matched Entry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankTransactions.map((transaction) => {
                  const matchedEntry = transaction.matchedEntryId 
                    ? journalEntries.find(e => e.id === transaction.matchedEntryId)
                    : null;
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.matched ? "default" : "destructive"}>
                          {transaction.matched ? "Matched" : "Unmatched"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {matchedEntry ? (
                          <div className="text-sm">
                            <div>{matchedEntry.description}</div>
                            <div className="text-muted-foreground">
                              {formatCurrency(matchedEntry.amount)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Missing Entries */}
      {anomalies.missingEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unmatched Journal Entries</CardTitle>
            <CardDescription>
              Bank/Cash entries from your journal that don't have matching bank transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Accounts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anomalies.missingEntries.slice(0, 10).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{formatCurrency(entry.amount)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Dr: {entry.debitAccount}</div>
                        <div>Cr: {entry.creditAccount}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {anomalies.missingEntries.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 10 of {anomalies.missingEntries.length} unmatched entries
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
