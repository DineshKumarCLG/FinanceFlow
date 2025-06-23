
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getJournalEntries, getCompanySettings, type JournalEntry } from "@/lib/data-service";
import { useQuery } from '@tanstack/react-query';
import { FileText, AlertTriangle, CheckCircle, Calculator, Download, Calendar } from "lucide-react";

interface TaxCalculation {
  period: string;
  taxableIncome: number;
  gstCollected: number;
  gstPaid: number;
  netGst: number;
  incomeTax: number;
  totalTax: number;
  status: 'draft' | 'filed' | 'paid';
  dueDate: string;
}

interface TaxCompliance {
  gstRegistration: boolean;
  vatRegistration: boolean;
  incomeTaxRegistration: boolean;
  nextFilingDate: string;
  overdueReturns: number;
}

export default function TaxManagementPage() {
  const { currentCompanyId } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('2024-Q1');

  const { data: journalEntries = [], isLoading: entriesLoading } = useQuery<JournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentCompanyId,
  });

  const { data: companySettings } = useQuery({
    queryKey: ['companySettings', currentCompanyId],
    queryFn: () => getCompanySettings(currentCompanyId!),
    enabled: !!currentCompanyId,
  });

  const calculateTaxLiability = (period: string): TaxCalculation => {
    // Parse period (e.g., "2024-Q1" -> get entries from Jan-Mar 2024)
    const [year, quarter] = period.split('-');
    const quarterNum = parseInt(quarter.replace('Q', ''));
    
    let startMonth, endMonth;
    switch (quarterNum) {
      case 1: [startMonth, endMonth] = [1, 3]; break;
      case 2: [startMonth, endMonth] = [4, 6]; break;
      case 3: [startMonth, endMonth] = [7, 9]; break;
      case 4: [startMonth, endMonth] = [10, 12]; break;
      default: [startMonth, endMonth] = [1, 3];
    }

    const startDate = new Date(parseInt(year), startMonth - 1, 1);
    const endDate = new Date(parseInt(year), endMonth, 0); // Last day of end month

    // Filter entries for the selected period
    const periodEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    });

    // Calculate taxable income (revenue - expenses)
    const revenueEntries = periodEntries.filter(entry => 
      entry.creditAccount.toLowerCase().includes('revenue') ||
      entry.creditAccount.toLowerCase().includes('income') ||
      entry.creditAccount.toLowerCase().includes('sales')
    );
    
    const expenseEntries = periodEntries.filter(entry => 
      entry.debitAccount.toLowerCase().includes('expense') ||
      entry.debitAccount.toLowerCase().includes('cost') ||
      entry.debitAccount.toLowerCase().includes('expenditure')
    );

    const totalRevenue = revenueEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const taxableIncome = totalRevenue - totalExpenses;

    // Calculate GST collected from sales (using GST fields if available)
    const gstCollected = periodEntries.reduce((sum, entry) => {
      if (entry.igstAmount) sum += entry.igstAmount;
      if (entry.cgstAmount) sum += entry.cgstAmount;
      if (entry.sgstAmount) sum += entry.sgstAmount;
      if (entry.vatAmount) sum += entry.vatAmount;
      return sum;
    }, 0);

    // Calculate GST paid on purchases
    const gstPaid = periodEntries
      .filter(entry => 
        entry.debitAccount.toLowerCase().includes('gst') || 
        entry.debitAccount.toLowerCase().includes('input tax') ||
        entry.debitAccount.toLowerCase().includes('tax paid')
      )
      .reduce((sum, entry) => sum + entry.amount, 0);

    const netGst = gstCollected - gstPaid;

    // Simplified income tax calculation (actual would depend on slab rates)
    let incomeTax = 0;
    if (taxableIncome > 250000) {
      if (taxableIncome <= 500000) {
        incomeTax = (taxableIncome - 250000) * 0.05;
      } else if (taxableIncome <= 1000000) {
        incomeTax = 12500 + (taxableIncome - 500000) * 0.20;
      } else {
        incomeTax = 112500 + (taxableIncome - 1000000) * 0.30;
      }
    }

    return {
      period,
      taxableIncome,
      gstCollected,
      gstPaid,
      netGst,
      incomeTax,
      totalTax: Math.max(netGst, 0) + incomeTax,
      status: 'draft',
      dueDate: getDueDate(period),
    };
  };

  const getDueDate = (period: string): string => {
    const [year, quarter] = period.split('-');
    const quarterNum = parseInt(quarter.replace('Q', ''));
    
    // GST return due dates are typically:
    // Q1: April 20, Q2: July 20, Q3: October 20, Q4: January 20 (next year)
    const dueDates = {
      1: `${year}-04-20`,
      2: `${year}-07-20`,
      3: `${year}-10-20`,
      4: `${parseInt(year) + 1}-01-20`
    };
    
    return dueDates[quarterNum as keyof typeof dueDates] || `${year}-04-20`;
  };

  const taxCalculation = useMemo(() => calculateTaxLiability(selectedPeriod), [selectedPeriod, journalEntries]);

  const compliance: TaxCompliance = {
    gstRegistration: !!companySettings?.companyGstin,
    vatRegistration: companySettings?.gstRegion === 'international_other',
    incomeTaxRegistration: true,
    nextFilingDate: taxCalculation.dueDate,
    overdueReturns: 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: companySettings?.currency || 'INR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const taxPeriods = [
    '2024-Q4', '2024-Q3', '2024-Q2', '2024-Q1', 
    '2023-Q4', '2023-Q3', '2023-Q2', '2023-Q1'
  ];

  if (entriesLoading) {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Tax Management"
          description="Loading tax data..."
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
        title="Tax Management"
        description="Automated GST/VAT calculations, compliance tracking, and multi-territory support."
      />

      {/* Tax Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GST Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(taxCalculation.gstCollected)}
            </div>
            <p className="text-xs text-muted-foreground">Current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GST Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(taxCalculation.gstPaid)}
            </div>
            <p className="text-xs text-muted-foreground">Input tax credit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net GST</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${taxCalculation.netGst >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(taxCalculation.netGst))}
            </div>
            <p className="text-xs text-muted-foreground">
              {taxCalculation.netGst >= 0 ? 'Payable' : 'Refundable'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Income Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(taxCalculation.incomeTax)}
            </div>
            <p className="text-xs text-muted-foreground">Estimated liability</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calculations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calculations">Tax Calculations</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="filings">Tax Filings</TabsTrigger>
        </TabsList>

        <TabsContent value="calculations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Tax Calculation
                  </CardTitle>
                  <CardDescription>
                    Based on journal entries from {selectedPeriod}
                  </CardDescription>
                </div>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxPeriods.map(period => (
                      <SelectItem key={period} value={period}>{period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Taxable Income:</span>
                      <span className="font-medium">{formatCurrency(taxCalculation.taxableIncome)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Revenue - Expenses</span>
                      <span>Base for tax calculation</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Tax Liability:</span>
                      <span className="font-bold text-red-600">{formatCurrency(taxCalculation.totalTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GST + Income Tax</span>
                      <span>Due: {taxCalculation.dueDate}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">GST Breakdown:</h4>
                  <div className="grid gap-2 md:grid-cols-3 text-sm">
                    <div className="flex justify-between">
                      <span>Output GST:</span>
                      <span>{formatCurrency(taxCalculation.gstCollected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Input GST:</span>
                      <span>{formatCurrency(taxCalculation.gstPaid)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Net GST:</span>
                      <span>{formatCurrency(taxCalculation.netGst)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>GST Registration</span>
                    <Badge variant={compliance.gstRegistration ? "default" : "destructive"}>
                      {compliance.gstRegistration ? "Active" : "Not Registered"}
                    </Badge>
                  </div>
                  {companySettings?.companyGstin && (
                    <p className="text-sm text-muted-foreground">
                      GSTIN: {companySettings.companyGstin}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span>Income Tax Registration</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>VAT Registration</span>
                    <Badge variant={compliance.vatRegistration ? "default" : "secondary"}>
                      {compliance.vatRegistration ? "Active" : "N/A"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Next Filing Date</span>
                    <Badge variant="outline">
                      {compliance.nextFilingDate}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Overdue Returns</span>
                    <Badge variant={compliance.overdueReturns > 0 ? "destructive" : "default"}>
                      {compliance.overdueReturns}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tax Filing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxPeriods.slice(0, 4).map(period => {
                    const calc = calculateTaxLiability(period);
                    return (
                      <TableRow key={period}>
                        <TableCell>{period}</TableCell>
                        <TableCell>GST Return</TableCell>
                        <TableCell>{formatCurrency(calc.totalTax)}</TableCell>
                        <TableCell>{calc.dueDate}</TableCell>
                        <TableCell>
                          <Badge variant={calc.status === 'filed' ? 'default' : 'secondary'}>
                            {calc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Generate
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
