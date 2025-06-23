
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getJournalEntries, addJournalEntry, type JournalEntry } from "@/lib/data-service";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, DollarSign, Calendar, Calculator, Plus, FileText, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  name: string;
  designation: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  taxWithholding: number;
  netSalary: number;
  bankAccount: string;
  panNumber: string;
  pfNumber: string;
  status: 'active' | 'inactive';
  joiningDate: string;
}

interface PayrollRun {
  id: string;
  period: string;
  employees: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: 'draft' | 'processed' | 'paid';
  processedDate?: string;
}

// For demo purposes, we'll use localStorage to store employee data
// In a real app, this would be in your database
const getStoredEmployees = (): Employee[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('payroll_employees');
  return stored ? JSON.parse(stored) : [
    {
      id: '1',
      name: 'John Doe',
      designation: 'Software Engineer',
      baseSalary: 80000,
      allowances: 20000,
      deductions: 15000,
      taxWithholding: 18000,
      netSalary: 67000,
      bankAccount: 'HDFC-****1234',
      panNumber: 'ABCDE1234F',
      pfNumber: 'PF123456',
      status: 'active',
      joiningDate: '2023-01-15',
    },
    {
      id: '2',
      name: 'Jane Smith',
      designation: 'Product Manager',
      baseSalary: 120000,
      allowances: 30000,
      deductions: 20000,
      taxWithholding: 30000,
      netSalary: 100000,
      bankAccount: 'ICICI-****5678',
      panNumber: 'FGHIJ5678K',
      pfNumber: 'PF789012',
      status: 'active',
      joiningDate: '2023-03-01',
    },
  ];
};

const saveEmployees = (employees: Employee[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('payroll_employees', JSON.stringify(employees));
  }
};

export default function PayrollPage() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(getStoredEmployees);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    designation: '',
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    taxWithholding: 0,
    bankAccount: '',
    panNumber: '',
    pfNumber: '',
  });

  const { data: journalEntries = [] } = useQuery<JournalEntry[], Error>({
    queryKey: ['journalEntries', currentCompanyId],
    queryFn: () => getJournalEntries(currentCompanyId!),
    enabled: !!currentCompanyId,
  });

  const processPayrollMutation = useMutation({
    mutationFn: async (payrollData: { period: string; employees: Employee[] }) => {
      if (!currentCompanyId) throw new Error('No company selected');

      const entries: Array<Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>> = [];
      
      // Create journal entries for each employee's salary
      payrollData.employees.forEach(employee => {
        const grossPay = employee.baseSalary + employee.allowances;
        const totalDeductions = employee.deductions + employee.taxWithholding;
        
        // Salary expense entry
        entries.push({
          date: new Date().toISOString().split('T')[0],
          description: `Salary payment for ${employee.name} - ${payrollData.period}`,
          debitAccount: 'Salary Expense',
          creditAccount: 'Salary Payable',
          amount: grossPay,
          type: 'expense',
          tags: ['payroll', 'salary', payrollData.period],
        });

        // Tax withholding entry
        if (employee.taxWithholding > 0) {
          entries.push({
            date: new Date().toISOString().split('T')[0],
            description: `Tax withholding for ${employee.name} - ${payrollData.period}`,
            debitAccount: 'Salary Payable',
            creditAccount: 'TDS Payable',
            amount: employee.taxWithholding,
            type: 'expense',
            tags: ['payroll', 'tax', 'tds', payrollData.period],
          });
        }

        // Other deductions entry
        if (employee.deductions > 0) {
          entries.push({
            date: new Date().toISOString().split('T')[0],
            description: `Deductions for ${employee.name} - ${payrollData.period}`,
            debitAccount: 'Salary Payable',
            creditAccount: 'Employee Deductions Payable',
            amount: employee.deductions,
            type: 'expense',
            tags: ['payroll', 'deductions', payrollData.period],
          });
        }

        // Net salary payment entry
        entries.push({
          date: new Date().toISOString().split('T')[0],
          description: `Net salary payment to ${employee.name} - ${payrollData.period}`,
          debitAccount: 'Salary Payable',
          creditAccount: 'Bank Account',
          amount: employee.netSalary,
          type: 'expense',
          tags: ['payroll', 'payment', payrollData.period],
        });
      });

      // Add all entries to journal
      for (const entry of entries) {
        await addJournalEntry(currentCompanyId, entry);
      }

      return entries.length;
    },
    onSuccess: (entriesCount) => {
      toast({
        title: "Payroll Processed",
        description: `Successfully created ${entriesCount} journal entries for payroll.`,
      });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process payroll. Please try again.",
        variant: "destructive",
      });
      console.error('Payroll processing error:', error);
    },
  });

  const calculatePayrollMetrics = () => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    const grossPay = activeEmployees.reduce((sum, emp) => sum + emp.baseSalary + emp.allowances, 0);
    const totalDeductions = activeEmployees.reduce((sum, emp) => sum + emp.deductions + emp.taxWithholding, 0);
    const netPay = activeEmployees.reduce((sum, emp) => sum + emp.netSalary, 0);
    
    return { grossPay, totalDeductions, netPay, activeEmployees: activeEmployees.length };
  };

  const getPayrollHistory = (): PayrollRun[] => {
    // Extract payroll history from journal entries
    const payrollEntries = journalEntries.filter(entry => 
      entry.tags?.includes('payroll') && entry.tags?.includes('salary')
    );

    // Group by period (extract from tags)
    const groupedByPeriod = payrollEntries.reduce((acc, entry) => {
      const periodTag = entry.tags?.find(tag => tag.match(/\d{4}-\d{2}/));
      if (periodTag) {
        if (!acc[periodTag]) {
          acc[periodTag] = [];
        }
        acc[periodTag].push(entry);
      }
      return acc;
    }, {} as Record<string, JournalEntry[]>);

    return Object.entries(groupedByPeriod).map(([period, entries]) => {
      const grossPay = entries
        .filter(e => e.debitAccount === 'Salary Expense')
        .reduce((sum, e) => sum + e.amount, 0);
      
      const deductions = entries
        .filter(e => e.creditAccount === 'TDS Payable' || e.creditAccount === 'Employee Deductions Payable')
        .reduce((sum, e) => sum + e.amount, 0);

      const netPay = entries
        .filter(e => e.description.includes('Net salary payment'))
        .reduce((sum, e) => sum + e.amount, 0);

      const uniqueEmployees = new Set(
        entries.map(e => e.description.match(/for (.+?) -/)?.[1]).filter(Boolean)
      ).size;

      return {
        id: period,
        period,
        employees: uniqueEmployees,
        grossPay,
        deductions,
        netPay,
        status: 'paid' as const,
        processedDate: entries[0]?.date,
      };
    }).sort((a, b) => b.period.localeCompare(a.period));
  };

  const handleAddEmployee = () => {
    const netSalary = newEmployee.baseSalary + newEmployee.allowances - newEmployee.deductions - newEmployee.taxWithholding;
    
    const employee: Employee = {
      id: Date.now().toString(),
      ...newEmployee,
      netSalary,
      status: 'active',
      joiningDate: new Date().toISOString().split('T')[0],
    };

    const updatedEmployees = [...employees, employee];
    setEmployees(updatedEmployees);
    saveEmployees(updatedEmployees);
    setIsAddEmployeeOpen(false);
    setNewEmployee({
      name: '',
      designation: '',
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
      taxWithholding: 0,
      bankAccount: '',
      panNumber: '',
      pfNumber: '',
    });

    toast({
      title: "Employee Added",
      description: `${employee.name} has been added to payroll.`,
    });
  };

  const handleProcessPayroll = () => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    processPayrollMutation.mutate({
      period: selectedPeriod,
      employees: activeEmployees,
    });
  };

  const { grossPay, totalDeductions, netPay, activeEmployees } = calculatePayrollMetrics();
  const payrollHistory = getPayrollHistory();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Payroll Management"
        description="Automated salary calculations, tax withholding, and payroll processing."
      />

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Gross Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grossPay)}</div>
            <p className="text-xs text-muted-foreground">Total monthly cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDeductions)}</div>
            <p className="text-xs text-muted-foreground">Tax + Other deductions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(netPay)}</div>
            <p className="text-xs text-muted-foreground">Monthly net payments</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Runs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Management
                </CardTitle>
                <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                      <DialogDescription>
                        Enter employee details for payroll setup.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newEmployee.name}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                          id="designation"
                          value={newEmployee.designation}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, designation: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="baseSalary">Base Salary (₹)</Label>
                        <Input
                          id="baseSalary"
                          type="number"
                          value={newEmployee.baseSalary}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, baseSalary: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="allowances">Allowances (₹)</Label>
                        <Input
                          id="allowances"
                          type="number"
                          value={newEmployee.allowances}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, allowances: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="deductions">Other Deductions (₹)</Label>
                        <Input
                          id="deductions"
                          type="number"
                          value={newEmployee.deductions}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, deductions: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="taxWithholding">Tax Withholding (₹)</Label>
                        <Input
                          id="taxWithholding"
                          type="number"
                          value={newEmployee.taxWithholding}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, taxWithholding: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="panNumber">PAN Number</Label>
                        <Input
                          id="panNumber"
                          value={newEmployee.panNumber}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, panNumber: e.target.value }))}
                        />
                      </div>
                      <Button onClick={handleAddEmployee} className="w-full">
                        Add Employee
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.designation}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(employee.baseSalary)}</TableCell>
                      <TableCell>{formatCurrency(employee.allowances)}</TableCell>
                      <TableCell>{formatCurrency(employee.deductions + employee.taxWithholding)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(employee.netSalary)}</TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Process Payroll
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['2024-03', '2024-02', '2024-01', '2023-12', '2023-11', '2023-10'].map(period => (
                        <SelectItem key={period} value={period}>{period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleProcessPayroll}
                    disabled={processPayrollMutation.isPending || activeEmployees === 0}
                  >
                    {processPayrollMutation.isPending ? 'Processing...' : 'Process Payroll'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{activeEmployees}</div>
                    <p className="text-sm text-muted-foreground">Employees to process</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatCurrency(grossPay)}</div>
                    <p className="text-sm text-muted-foreground">Total gross pay</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatCurrency(netPay)}</div>
                    <p className="text-sm text-muted-foreground">Total net payout</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>Previous payroll runs and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollHistory.length > 0 ? payrollHistory.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.period}</TableCell>
                      <TableCell>{run.employees}</TableCell>
                      <TableCell>{formatCurrency(run.grossPay)}</TableCell>
                      <TableCell>{formatCurrency(run.deductions)}</TableCell>
                      <TableCell>{formatCurrency(run.netPay)}</TableCell>
                      <TableCell>
                        <Badge variant={run.status === 'paid' ? 'default' : 'secondary'}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{run.processedDate}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No payroll history found. Process your first payroll to see data here.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center py-2">
                  <span>Average Salary</span>
                  <span className="font-medium">
                    {formatCurrency(activeEmployees > 0 ? (grossPay / activeEmployees) : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span>Total Tax Withholding</span>
                  <span className="font-medium">
                    {formatCurrency(employees.reduce((sum, emp) => sum + emp.taxWithholding, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span>Deduction Rate</span>
                  <span className="font-medium">
                    {grossPay > 0 ? ((totalDeductions / grossPay) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span>Annual Payroll Cost</span>
                  <span className="font-medium">{formatCurrency(grossPay * 12)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Payroll Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Pay Slips
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calculator className="mr-2 h-4 w-4" />
                  Tax Filing Reports
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Salary Revision Tool
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
