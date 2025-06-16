
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

interface ClassifiedAccount {
  name: string;
  balance: number; // Positive for assets/debits, positive for liabilities/credits in their sections
}

interface BalanceSheetData {
  assets: ClassifiedAccount[];
  liabilities: ClassifiedAccount[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

const assetKeywords = ["cash", "bank", "receivable", "inventory", "equipment", "building", "land", "prepaid", "asset", "computer", "vehicle", "furniture", "goodwill", "patent", "investment"];
const liabilityKeywords = ["payable", "loan", "debt", "unearned", "deferred", "liability", "creditor", "accrued expense", "note payable", "mortgage"];
// Equity accounts like "Owner's Capital", "Retained Earnings" will be implicitly calculated for now or if specific keywords are found.
const equityKeywords = ["equity", "capital", "retained earnings", "drawings", "owner's contribution", "share capital"];


// For P&L calculation for current period equity adjustment (if not directly using Assets - Liabilities for Total Equity)
const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received', 'consulting income', 'project revenue', 'deposit', 'commission', 'dividend', 'gain'];
const expenseKeywords = ['expense', 'cost', 'supply', 'rent', 'salary', 'utility', 'utilities', 'purchase', 'advertising', 'maintenance', 'insurance', 'interest paid', 'fee', 'software', 'development', 'services', 'consulting', 'contractor', 'design', 'travel', 'subscription', 'depreciation', 'amortization', 'office supplies', 'postage', 'printing', 'repairs', 'loss', 'cogs', 'cost of goods sold'];


export default function BalanceSheetPage() {
  const { user: currentUser, currentCompanyId } = useAuth();
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const calculateBalanceSheet = useCallback((entries: StoredJournalEntry[]): BalanceSheetData => {
    const accountNetBalances = new Map<string, number>(); // Store net balance (debits as positive, credits as negative)

    entries.forEach(entry => {
      accountNetBalances.set(entry.debitAccount, (accountNetBalances.get(entry.debitAccount) || 0) + entry.amount);
      accountNetBalances.set(entry.creditAccount, (accountNetBalances.get(entry.creditAccount) || 0) - entry.amount);
    });
    
    const assets: ClassifiedAccount[] = [];
    const liabilities: ClassifiedAccount[] = [];
    const equityAccounts: ClassifiedAccount[] = []; // For explicitly identified equity accounts
    let currentPeriodNetIncome = 0;

    accountNetBalances.forEach((balance, accountName) => {
      const lowerAccountName = accountName.toLowerCase();
      let isAsset = assetKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isLiability = liabilityKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isEquity = equityKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isIncome = incomeKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isExpense = expenseKeywords.some(keyword => lowerAccountName.includes(keyword));

      // Basic conflict resolution: if also income/expense, it's not a balance sheet account directly (unless it's an error in naming)
      if (isAsset && (isIncome || isExpense)) isAsset = false;
      if (isLiability && (isIncome || isExpense)) isLiability = false;


      if (isAsset) {
        if (balance > 0) assets.push({ name: accountName, balance: balance }); // Assets usually have debit balances
      } else if (isLiability) {
        if (balance < 0) liabilities.push({ name: accountName, balance: Math.abs(balance) }); // Liabilities usually have credit balances
      } else if (isEquity) {
         // Equity can be tricky; capital/contributions are credit, drawings are debit
         // For simplicity, we'll sum them up, and adjust with net income.
         // A credit balance (balance < 0) increases equity. A debit balance (balance > 0) decreases equity.
        equityAccounts.push({ name: accountName, balance: -balance });
      } else if (isIncome) {
        currentPeriodNetIncome -= balance; // Income is credit (negative balance), so subtract to make it positive contribution
      } else if (isExpense) {
        currentPeriodNetIncome -= balance; // Expense is debit (positive balance), so subtract to make it negative contribution
      }
    });

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    
    // Calculate initial equity from explicitly identified equity accounts
    const initialEquity = equityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    // Add current period's net income to this initial equity
    const calculatedTotalEquity = initialEquity + currentPeriodNetIncome;

    // As a fallback or primary method if explicit equity accounts + NI is not robust enough without proper closing:
    // const totalEquity = totalAssets - totalLiabilities; // Using accounting equation

    return {
      assets: assets.sort((a,b) => a.name.localeCompare(b.name)),
      liabilities: liabilities.sort((a,b) => a.name.localeCompare(b.name)),
      totalAssets,
      totalLiabilities,
      totalEquity: calculatedTotalEquity, // Using calculated equity
    };
  }, []);


  useEffect(() => {
    async function loadData() {
      if (!currentUser || !currentCompanyId) {
        setIsLoading(false);
        setBalanceSheetData(null);
        setError("No company selected. Please select a company to view the balance sheet.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const entries = await getJournalEntries(currentCompanyId);
        if (entries.length === 0) {
            setBalanceSheetData({ assets: [], liabilities: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });
        } else {
            const data = calculateBalanceSheet(entries);
            setBalanceSheetData(data);
        }
      } catch (e: any) {
        console.error("Failed to load or process balance sheet data:", e);
        setError(e.message || "An error occurred while fetching data.");
        setBalanceSheetData(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentUser, currentCompanyId, calculateBalanceSheet]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString(clientLocale, { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
  };

  if (!currentCompanyId && !isLoading) {
    return (
      <div className="space-y-6 p-4">
        <PageTitle
          title="Balance Sheet"
          description="A snapshot of your company's financial position."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Company ID Missing</AlertTitle>
          <AlertDescription>
            Please select or enter a Company ID on the main page to view the Balance Sheet.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderSection = (title: string, items: ClassifiedAccount[], total: number) => (
    <>
      <TableRow className="bg-muted/30">
        <TableHead colSpan={2} className="font-semibold text-lg">{title}</TableHead>
      </TableRow>
      {items.length > 0 ? items.map(item => (
        <TableRow key={item.name}>
          <TableCell className="pl-8">{item.name}</TableCell>
          <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
        </TableRow>
      )) : (
         <TableRow><TableCell colSpan={2} className="text-muted-foreground pl-8">No {title.toLowerCase()} recorded.</TableCell></TableRow>
      )}
      <TableRow className="font-semibold border-t">
        <TableCell>Total {title}</TableCell>
        <TableCell className="text-right">{formatCurrency(total)}</TableCell>
      </TableRow>
    </>
  );
  
  return (
    <div className="space-y-6">
      <PageTitle
        title={`Balance Sheet ${currentCompanyId ? `(${currentCompanyId})` : ''}`}
        description="A snapshot of your company's assets, liabilities, and equity."
      />
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Balance Sheet Statement</CardTitle>
          <CardDescription>As of {new Date().toLocaleDateString(clientLocale, { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-8 w-1/4 mb-4" />
                {[...Array(3)].map((_,i) => <Skeleton key={`asset-skel-${i}`} className="h-8 w-full mb-1" />)}
                <Skeleton className="h-10 w-full mt-2 mb-4" />
                <Skeleton className="h-8 w-1/4 mb-4" />
                {[...Array(2)].map((_,i) => <Skeleton key={`liab-skel-${i}`} className="h-8 w-full mb-1" />)}
                <Skeleton className="h-10 w-full mt-2 mb-4" />
             </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !balanceSheetData || (balanceSheetData.assets.length === 0 && balanceSheetData.liabilities.length === 0 && !isLoading) ? (
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Data</AlertTitle>
                <AlertDescription>No journal entries found for the selected company to generate a balance sheet.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-3/5">Account/Category</TableHead>
                  <TableHead className="text-right w-2/5">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSection("Assets", balanceSheetData.assets, balanceSheetData.totalAssets)}
                
                {/* Spacer Row */}
                <TableRow><TableCell colSpan={2} className="py-2"></TableCell></TableRow> 
                
                {renderSection("Liabilities", balanceSheetData.liabilities, balanceSheetData.totalLiabilities)}

                {/* Spacer Row */}
                <TableRow><TableCell colSpan={2} className="py-2"></TableCell></TableRow> 

                <TableRow className="bg-muted/30">
                    <TableHead colSpan={2} className="font-semibold text-lg">Equity</TableHead>
                </TableRow>
                <TableRow>
                    <TableCell className="pl-8">Owner's Equity (Calculated)</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceSheetData.totalEquity)}</TableCell>
                </TableRow>
                <TableRow className="font-semibold border-t">
                    <TableCell>Total Equity</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceSheetData.totalEquity)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold text-lg bg-muted border-t-2 border-primary">
                  <TableCell>Total Liabilities & Equity</TableCell>
                  <TableCell className="text-right">{formatCurrency(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity)}</TableCell>
                </TableRow>
                {(Math.abs(balanceSheetData.totalAssets - (balanceSheetData.totalLiabilities + balanceSheetData.totalEquity)) > 0.01) && (
                     <TableRow>
                        <TableCell colSpan={2}>
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4"/>
                                <AlertTitle>Imbalance! Assets must equal Liabilities + Equity.</AlertTitle>
                                <AlertDescription>
                                    Assets: {formatCurrency(balanceSheetData.totalAssets)} vs 
                                    Liabilities + Equity: {formatCurrency(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity)}. 
                                    Difference: {formatCurrency(balanceSheetData.totalAssets - (balanceSheetData.totalLiabilities + balanceSheetData.totalEquity))}.
                                    Please review account classifications or journal entries.
                                </AlertDescription>
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
