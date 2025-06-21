"use client";

import { useState, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/shared/PageTitle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { getJournalEntries, type JournalEntry as StoredJournalEntry } from "@/lib/data-service";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AccountBalance {
  accountName: string;
  debit: number;
  credit: number;
}

export default function TrialBalancePage() {
  const { user: currentUser, currentCompanyId } = useAuth();
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [totalDebits, setTotalDebits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const calculateTrialBalance = useCallback((entries: StoredJournalEntry[]): void => {
    const accountMap = new Map<string, { debit: number; credit: number }>();

    entries.forEach(entry => {
      // Debit side
      if (entry.debitAccount) {
        const currentDebit = accountMap.get(entry.debitAccount) || { debit: 0, credit: 0 };
        accountMap.set(entry.debitAccount, { ...currentDebit, debit: currentDebit.debit + entry.amount });
      }
      // Credit side
      if (entry.creditAccount) {
        const currentCredit = accountMap.get(entry.creditAccount) || { debit: 0, credit: 0 };
        accountMap.set(entry.creditAccount, { ...currentCredit, credit: currentCredit.credit + entry.amount });
      }
    });

    let runningTotalDebits = 0;
    let runningTotalCredits = 0;
    const calculatedBalances: AccountBalance[] = [];

    accountMap.forEach((value, key) => {
      calculatedBalances.push({ accountName: key, debit: value.debit, credit: value.credit });
      runningTotalDebits += value.debit;
      runningTotalCredits += value.credit;
    });
    
    calculatedBalances.sort((a, b) => a.accountName.localeCompare(b.accountName));

    setBalances(calculatedBalances);
    setTotalDebits(runningTotalDebits);
    setTotalCredits(runningTotalCredits);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!currentUser || !currentCompanyId) {
        setIsLoading(false);
        setBalances([]);
        setError("No company selected. Please select a company to view the trial balance.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const entries = await getJournalEntries(currentCompanyId);
        if (entries.length === 0) {
          setBalances([]);
          setTotalDebits(0);
          setTotalCredits(0);
        } else {
          calculateTrialBalance(entries);
        }
      } catch (e: any) {
        console.error("Failed to load or process trial balance data:", e);
        setError(e.message || "An error occurred while fetching data.");
        setBalances([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentUser, currentCompanyId, calculateTrialBalance]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(clientLocale, { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
  };

  if (!currentCompanyId && !isLoading) {
    return (
      <div className="space-y-6 p-4">
        <PageTitle
          title="Trial Balance"
          description="A summary of all ledger accounts and their debit or credit balances."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Company ID Missing</AlertTitle>
          <AlertDescription>
            Please select or enter a Company ID on the main page to view the Trial Balance.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageTitle
        title={`Trial Balance ${currentCompanyId ? `(${currentCompanyId})` : ''}`}
        description="A summary of all ledger accounts and their debit or credit balances. Totals should match."
      />
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Unadjusted Trial Balance</CardTitle>
          <CardDescription>As of {new Date().toLocaleDateString(clientLocale, { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-12 w-full mt-2" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : balances.length === 0 && !isLoading ? (
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Data</AlertTitle>
                <AlertDescription>No journal entries found for the selected company to generate a trial balance.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-3/5">Account Name</TableHead>
                  <TableHead className="text-right w-1/5">Debit</TableHead>
                  <TableHead className="text-right w-1/5">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((item) => (
                  <TableRow key={item.accountName}>
                    <TableCell>{item.accountName}</TableCell>
                    <TableCell className="text-right">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</TableCell>
                    <TableCell className="text-right">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Totals</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalDebits)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalCredits)}</TableCell>
                </TableRow>
                {totalDebits !== totalCredits && (
                    <TableRow>
                        <TableCell colSpan={3}>
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4"/>
                                <AlertTitle>Imbalance Detected</AlertTitle>
                                <AlertDescription>Total debits do not equal total credits. Please review your journal entries.</AlertDescription>
                            </Alert>
                        </TableCell>
                    </TableRow>
                )}
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
