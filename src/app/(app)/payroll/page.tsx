
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Users, Calculator, FileText, DollarSign, Calendar, Plus } from "lucide-react";

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

export default function PayrollPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  const employees: Employee[] = [
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
    },
  ];

  const payrollRuns: PayrollRun[] = [
    {
      id: '1',
      period: '2024-03',
      employees: 2,
      grossPay: 250000,
      deductions: 35000,
      netPay: 167000,
      status: 'paid',
      processedDate: '2024-03-31',
    },
    {
      id: '2',
      period: '2024-02',
      employees: 2,
      grossPay: 250000,
      deductions: 35000,
      netPay: 167000,
      status: 'paid',
      processedDate: '2024-02-28',
    },
  ];

  const calculateTotalPayroll = () => {
    const grossPay = employees.reduce((sum, emp) => sum + emp.baseSalary + emp.allowances, 0);
    const totalDeductions = employees.reduce((sum, emp) => sum + emp.deductions + emp.taxWithholding, 0);
    const netPay = employees.reduce((sum, emp) => sum + emp.netSalary, 0);
    
    return { grossPay, totalDeductions, netPay };
  };

  const { grossPay, totalDeductions, netPay } = calculateTotalPayroll();

  return (
    <div className="space-y-6">
      <PageTitle
        title="Payroll Management"
        description="Automated salary calculations, tax withholding, and payroll processing."
      />

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{grossPay.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalDeductions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Tax + Deductions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{netPay.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">To be paid</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Run Payroll
            </Button>
            <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>Enter employee details for payroll setup.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Enter full name" />
                  </div>
                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input id="designation" placeholder="Job title" />
                  </div>
                  <div>
                    <Label htmlFor="salary">Base Salary</Label>
                    <Input id="salary" type="number" placeholder="Monthly salary" />
                  </div>
                  <div>
                    <Label htmlFor="pan">PAN Number</Label>
                    <Input id="pan" placeholder="ABCDE1234F" />
                  </div>
                  <Button>Add Employee</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Generate Payslips
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">PF Compliance</span>
                <Badge variant="default">Current</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">ESI Compliance</span>
                <Badge variant="default">Current</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">TDS Filing</span>
                <Badge variant="secondary">Due Soon</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Form 16 Generation</span>
                <Badge variant="destructive">Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-2 border rounded">
                <div className="font-medium">Salary Processing</div>
                <div className="text-sm text-muted-foreground">28th of every month</div>
              </div>
              <div className="p-2 border rounded">
                <div className="font-medium">PF Contribution</div>
                <div className="text-sm text-muted-foreground">15th of next month</div>
              </div>
              <div className="p-2 border rounded">
                <div className="font-medium">TDS Deposit</div>
                <div className="text-sm text-muted-foreground">7th of next month</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Runs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee List</CardTitle>
              <CardDescription>Manage employee information and salary details</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.designation}</TableCell>
                      <TableCell>₹{employee.baseSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">₹{employee.netSalary.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="outline">Payslip</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Processing History</CardTitle>
              <CardDescription>Track monthly payroll runs and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{run.period}</TableCell>
                      <TableCell>{run.employees}</TableCell>
                      <TableCell>₹{run.grossPay.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">₹{run.netPay.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={run.status === 'paid' ? 'default' : run.status === 'processed' ? 'secondary' : 'destructive'}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">View Details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Statutory Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  PF Contribution Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  ESI Contribution Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  TDS Certificate
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Form 16 Generation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payroll Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Salary Trend Analysis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Department Wise Costs
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Attendance Integration
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calculator className="mr-2 h-4 w-4" />
                  Cost Center Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
