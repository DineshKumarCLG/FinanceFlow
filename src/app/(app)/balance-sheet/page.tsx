
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
  balance: number;
}

interface BalanceSheetData {
  assets: ClassifiedAccount[];
  liabilities: ClassifiedAccount[];
  beginningEquityItems: ClassifiedAccount[];
  drawingItems: ClassifiedAccount[];
  totalAssets: number;
  totalLiabilities: number;
  totalBeginningEquity: number;
  currentPeriodNetIncome: number;
  totalDrawings: number;
  endingEquity: number;
}

const assetKeywords = ["cash", "bank", "receivable", "inventory", "equipment", "building", "land", "prepaid", "asset", "computer", "vehicle", "furniture", "goodwill", "patent", "investment", "marketable securities", "office supplies inventory"];
const liabilityKeywords = ["payable", "loan", "debt", "unearned", "deferred", "liability", "creditor", "accrued expense", "note payable", "mortgage", "bonds payable", "salaries payable", "taxes payable"];
const beginningEquityKeywords = ["equity", "capital", "retained earnings", "owner's contribution", "share capital", "common stock", "preferred stock", "paid-in capital"];
const drawingKeywords = ["drawings", "owner's draw", "dividends paid", "distributions"];
const incomeKeywords = ['revenue', 'sales', 'income', 'service fee', 'interest received', 'consulting income', 'project revenue', 'deposit', 'commission', 'dividend income', 'gain']; // Note: 'deposit' can be ambiguous
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
    const beginningEquityItems: ClassifiedAccount[] = [];
    const drawingItems: ClassifiedAccount[] = [];
    let currentPeriodNetIncome = 0;

    accountNetBalances.forEach((balance, accountName) => {
      const lowerAccountName = accountName.toLowerCase();
      
      let isAsset = assetKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isLiability = liabilityKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isBeginningEquity = beginningEquityKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isDrawing = drawingKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isIncome = incomeKeywords.some(keyword => lowerAccountName.includes(keyword));
      let isExpense = expenseKeywords.some(keyword => lowerAccountName.includes(keyword));

      // Resolve conflicts: BS accounts shouldn't also be P&L accounts or drawing accounts (unless misclassified)
      if (isAsset && (isIncome || isExpense || isDrawing || isBeginningEquity)) isAsset = false;
      if (isLiability && (isIncome || isExpense || isDrawing || isBeginningEquity)) isLiability = false;
      if (isBeginningEquity && (isIncome || isExpense || isDrawing)) isBeginningEquity = false;
      if (isDrawing && (isIncome || isExpense)) isDrawing = false; // Drawings are distinct from P&L

      if (isAsset) {
        if (balance > 0) assets.push({ name: accountName, balance: balance }); // Assets usually have debit balances
      } else if (isLiability) {
        if (balance < 0) liabilities.push({ name: accountName, balance: Math.abs(balance) }); // Liabilities usually have credit balances
      } else if (isBeginningEquity) {
         // Represents capital, retained earnings (beginning). Credit balances increase equity.
        if (balance < 0) beginningEquityItems.push({ name: accountName, balance: Math.abs(balance) });
      } else if (isDrawing) {
        // Drawings are debits, reduce equity. Store as positive value for subtraction.
        if (balance > 0) drawingItems.push({ name: accountName, balance: balance });
      } else if (isIncome) {
        currentPeriodNetIncome -= balance; // Income is credit (negative balance in map), so subtract to make it positive contribution to NI
      } else if (isExpense) {
        currentPeriodNetIncome -= balance; // Expense is debit (positive balance in map), so subtract to make it a negative impact on NI (i.e. positive expense amount reduces NI)
      }
    });

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    const totalBeginningEquity = beginningEquityItems.reduce((sum, acc) => sum + acc.balance, 0);
    const totalDrawings = drawingItems.reduce((sum, acc) => sum + acc.balance, 0);

    const endingEquity = totalBeginningEquity + currentPeriodNetIncome - totalDrawings;
    
    return {
      assets: assets.sort((a,b) => a.name.localeCompare(b.name)),
      liabilities: liabilities.sort((a,b) => a.name.localeCompare(b.name)),
      beginningEquityItems: beginningEquityItems.sort((a,b) => a.name.localeCompare(b.name)),
      drawingItems: drawingItems.sort((a,b) => a.name.localeCompare(b.name)),
      totalAssets,
      totalLiabilities,
      totalBeginningEquity,
      currentPeriodNetIncome,
      totalDrawings,
      endingEquity,
    };
  }, []);

  const initialBalanceSheetData: BalanceSheetData = {
    assets: [], liabilities: [], beginningEquityItems: [], drawingItems: [],
    totalAssets: 0, totalLiabilities: 0, totalBeginningEquity: 0,
    currentPeriodNetIncome: 0, totalDrawings: 0, endingEquity: 0,
  };

  useEffect(() => {
    async function loadData() {
      if (!currentUser || !currentCompanyId) {
        setIsLoading(false);
        setBalanceSheetData(initialBalanceSheetData);
        setError("No company selected. Please select a company to view the balance sheet.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const entries = await getJournalEntries(currentCompanyId);
        if (entries.length === 0) {
            setBalanceSheetData(initialBalanceSheetData);
        } else {
            const data = calculateBalanceSheet(entries);
            setBalanceSheetData(data);
        }
      } catch (e: any) {
        console.error("Failed to load or process balance sheet data:", e);
        setError(e.message || "An error occurred while fetching data.");
        setBalanceSheetData(initialBalanceSheetData);
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

  const renderSection = (title: string, items: ClassifiedAccount[], total: number, isSubSection: boolean = false) => (
    <>
      <TableRow className={!isSubSection ? "bg-muted/30" : ""}>
        <TableHead colSpan={2} className={`font-semibold ${!isSubSection ? "text-lg" : "text-md pl-4"}`}>{title}</TableHead>
      </TableRow>
      {items.length > 0 ? items.map(item => (
        <TableRow key={item.name}>
          <TableCell className="pl-8">{item.name}</TableCell>
          <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
        </TableRow>
      )) : (
         <TableRow><TableCell colSpan={2} className="text-muted-foreground pl-8">No {title.toLowerCase()} recorded.</TableCell></TableRow>
      )}
      {!isSubSection && (
        <TableRow className="font-semibold border-t">
          <TableCell>Total {title}</TableCell>
          <TableCell className="text-right">{formatCurrency(total)}</TableCell>
        </TableRow>
      )}
    </>
  );
  
  return (
    <div className="space-y-6">
      <PageTitle
        title={`Balance Sheet ${currentCompanyId ? `(${currentCompanyId})` : ''}`}
        description="A snapshot of your company's assets, liabilities, and equity, showing changes in equity."
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
                <Skeleton className="h-8 w-1/4 mb-4" />
                {[...Array(3)].map((_,i) => <Skeleton key={`eq-skel-${i}`} className="h-8 w-full mb-1" />)}
                <Skeleton className="h-10 w-full mt-2 mb-4" />
             </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !balanceSheetData || (balanceSheetData.assets.length === 0 && balanceSheetData.liabilities.length === 0 && balanceSheetData.totalBeginningEquity === 0 && balanceSheetData.currentPeriodNetIncome === 0 && !isLoading) ? (
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
                
                <TableRow><TableCell colSpan={2} className="py-2"></TableCell></TableRow> 
                
                {renderSection("Liabilities", balanceSheetData.liabilities, balanceSheetData.totalLiabilities)}

                <TableRow><TableCell colSpan={2} className="py-2"></TableCell></TableRow> 

                {/* Equity Section */}
                <TableRow className="bg-muted/30">
                    <TableHead colSpan={2} className="font-semibold text-lg">Equity</TableHead>
                </TableRow>

                {/* Beginning Equity Items */}
                {balanceSheetData.beginningEquityItems.length > 0 ? (
                  balanceSheetData.beginningEquityItems.map(item => (
                    <TableRow key={`beq-${item.name}`}>
                      <TableCell className="pl-8">{item.name} (Beginning)</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell className="pl-8 text-muted-foreground">No beginning capital/equity accounts identified.</TableCell><TableCell></TableCell></TableRow>
                )}
                 <TableRow>
                    <TableCell className="pl-8 font-medium">Total Beginning Equity</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(balanceSheetData.totalBeginningEquity)}</TableCell>
                </TableRow>

                <TableRow>
                    <TableCell className="pl-8">Add: Net Income / (Loss) for the Period</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceSheetData.currentPeriodNetIncome)}</TableCell>
                </TableRow>
                
                {/* Drawing Items */}
                {balanceSheetData.drawingItems.length > 0 ? (
                  balanceSheetData.drawingItems.map(item => (
                    <TableRow key={`draw-${item.name}`}>
                      <TableCell className="pl-8">Less: {item.name}</TableCell>
                      <TableCell className="text-right">({formatCurrency(item.balance)})</TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow><TableCell className="pl-8 text-muted-foreground">No drawings recorded.</TableCell><TableCell></TableCell></TableRow>
                )}
                 <TableRow>
                    <TableCell className="pl-8 font-medium">Total Drawings</TableCell>
                    <TableCell className="text-right font-medium">({formatCurrency(balanceSheetData.totalDrawings)})</TableCell>
                </TableRow>

                <TableRow className="font-semibold border-t">
                    <TableCell>Ending Equity</TableCell>
                    <TableCell className="text-right">{formatCurrency(balanceSheetData.endingEquity)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold text-lg bg-muted border-t-2 border-primary">
                  <TableCell>Total Liabilities & Ending Equity</TableCell>
                  <TableCell className="text-right">{formatCurrency(balanceSheetData.totalLiabilities + balanceSheetData.endingEquity)}</TableCell>
                </TableRow>
                {(Math.abs(balanceSheetData.totalAssets - (balanceSheetData.totalLiabilities + balanceSheetData.endingEquity)) > 0.01) && (
                     <TableRow>
                        <TableCell colSpan={2}>
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4"/>
                                <AlertTitle>Imbalance! Assets ({formatCurrency(balanceSheetData.totalAssets)}) must equal Liabilities + Equity ({formatCurrency(balanceSheetData.totalLiabilities + balanceSheetData.endingEquity)}).</AlertTitle>
                                <AlertDescription>
                                    Difference: {formatCurrency(balanceSheetData.totalAssets - (balanceSheetData.totalLiabilities + balanceSheetData.endingEquity))}.
                                    This may be due to misclassified accounts, incomplete transactions, or the simplified nature of equity calculation without formal closing entries. Please review account classifications and journal entries.
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

    