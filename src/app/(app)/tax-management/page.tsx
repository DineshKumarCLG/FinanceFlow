
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getJournalEntries, type StoredJournalEntry } from "@/lib/data-service";
import { useQuery } from '@tanstack/react-query';
import { Calculator, FileText, AlertTriangle, Download, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TaxCalculation {
  period: string;
  taxableIncome: number;
  gstCollected: number;
  gstPaid: number;
  netGst: number;
  incomeTax: number;
  totalTax: number;
  status: 'draft' | 'filed' | 'overdue';
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
  const [taxJurisdiction, setTaxJurisdiction] = useState('IN');
  const [gstRate, setGstRate] = useState('18');
  
  const { data: journalEntries = [] } = useQuery<StoredJournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentCompanyId,
  });

  const calculateTaxLiability = (period: string): TaxCalculation => {
    // Filter entries for the selected period
    const periodEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const year = entryDate.getFullYear();
      const quarter = Math.ceil((entryDate.getMonth() + 1) / 3);
      return `${year}-Q${quarter}` === period;
    });

    // Calculate taxable income (revenue entries)
    const taxableIncome = periodEntries
      .filter(entry => entry.creditAccount.toLowerCase().includes('revenue') || 
                      entry.creditAccount.toLowerCase().includes('sales') ||
                      entry.creditAccount.toLowerCase().includes('income'))
      .reduce((sum, entry) => sum + entry.amount, 0);

    // Calculate GST collected and paid
    const gstCollected = taxableIncome * (parseFloat(gstRate) / 100);
    const gstPaid = periodEntries
      .filter(entry => entry.debitAccount.toLowerCase().includes('gst') || 
                      entry.debitAccount.toLowerCase().includes('tax'))
      .reduce((sum, entry) => sum + entry.amount, 0);

    const netGst = gstCollected - gstPaid;

    // Simple income tax calculation (simplified for demo)
    const incomeTax = taxableIncome > 250000 ? (taxableIncome - 250000) * 0.3 : 0;

    return {
      period,
      taxableIncome,
      gstCollected,
      gstPaid,
      netGst,
      incomeTax,
      totalTax: netGst + incomeTax,
      status: 'draft',
      dueDate: '2024-04-30',
    };
  };

  const taxCalculation = calculateTaxLiability(selectedPeriod);

  const compliance: TaxCompliance = {
    gstRegistration: true,
    vatRegistration: false,
    incomeTaxRegistration: true,
    nextFilingDate: '2024-04-30',
    overdueReturns: 0,
  };

  const taxPeriods = ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2023-Q4', '2023-Q3'];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Tax Management"
        description="Automated GST/VAT calculations, compliance tracking, and multi-territory support."
      />

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GST Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{taxCalculation.gstCollected.toLocaleString()}
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
              ₹{taxCalculation.gstPaid.toLocaleString()}
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
              ₹{Math.abs(taxCalculation.netGst).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {taxCalculation.netGst >= 0 ? 'Payable' : 'Refundable'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={compliance.overdueReturns === 0 ? 'default' : 'destructive'}>
                {compliance.overdueReturns === 0 ? 'Current' : `${compliance.overdueReturns} Overdue`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Filing status</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tax Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="jurisdiction">Tax Jurisdiction</Label>
              <Select value={taxJurisdiction} onValueChange={setTaxJurisdiction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India (GST)</SelectItem>
                  <SelectItem value="UK">United Kingdom (VAT)</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="AU">Australia (GST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gstRate">Default GST Rate (%)</Label>
              <Select value={gstRate} onValueChange={setGstRate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="period">Tax Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxPeriods.map(period => (
                    <SelectItem key={period} value={period}>{period}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  GST Return due: April 30, 2024
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  TDS certificate pending for Q4 2023
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Registration Status</h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm">GST Registration</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Income Tax</span>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Generate GST Return
            </Button>
            <Button variant="outline" className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Tax Calculator
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export for Filing
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calculations" className="w-full">
        <TabsList>
          <TabsTrigger value="calculations">Tax Calculations</TabsTrigger>
          <TabsTrigger value="returns">Filed Returns</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="calculations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Calculation Details - {selectedPeriod}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Tax Rate</TableHead>
                    <TableHead>Tax Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Taxable Revenue</TableCell>
                    <TableCell>₹{taxCalculation.taxableIncome.toLocaleString()}</TableCell>
                    <TableCell>{gstRate}%</TableCell>
                    <TableCell>₹{taxCalculation.gstCollected.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Input Tax Credit</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>₹{taxCalculation.gstPaid.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Net GST Payable</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>₹{taxCalculation.netGst.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filed Tax Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Return Type</TableHead>
                    <TableHead>Filed Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>2023-Q4</TableCell>
                    <TableCell>GST Return</TableCell>
                    <TableCell>2024-01-20</TableCell>
                    <TableCell>
                      <Badge variant="default">Filed</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">View</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2023-Q3</TableCell>
                    <TableCell>GST Return</TableCell>
                    <TableCell>2023-10-25</TableCell>
                    <TableCell>
                      <Badge variant="default">Filed</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">View</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <div className="font-medium">GST Return</div>
                      <div className="text-sm text-muted-foreground">Monthly filing</div>
                    </div>
                    <Badge variant="destructive">Due: 20th</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <div className="font-medium">TDS Return</div>
                      <div className="text-sm text-muted-foreground">Quarterly filing</div>
                    </div>
                    <Badge variant="default">Due: 30th</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <div className="font-medium">Income Tax</div>
                      <div className="text-sm text-muted-foreground">Annual filing</div>
                    </div>
                    <Badge variant="secondary">Due: July 31</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multi-Territory Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>India (GST)</span>
                    <Badge variant="default">Configured</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>UK (VAT)</span>
                    <Badge variant="secondary">Not Setup</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>US (Sales Tax)</span>
                    <Badge variant="secondary">Not Setup</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Add Territory
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
