
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, Loader2, FileText } from "lucide-react";
import { deleteInvoice } from "@/lib/data-service";
import { useToast } from "@/hooks/use-toast";
import type { Invoice } from "@/lib/data-service";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InvoiceListProps {
  invoices: Invoice[];
  companyId: string;
  onInvoiceDeleted?: () => void;
}

export function InvoiceList({ invoices = [], companyId, onInvoiceDeleted }: InvoiceListProps) {
  const [clientLocale, setClientLocale] = useState('en-US');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const formatCurrencyDisplay = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' });
  };

  const getStatusBadgeVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'default';
      case 'sent': return 'secondary';
      case 'overdue': return 'destructive';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!companyId) {
      toast({ variant: "destructive", title: "Error", description: "Company ID is missing." });
      return;
    }
    setIsDeleting(invoiceId);
    try {
      await deleteInvoice(companyId, invoiceId);
      toast({ title: "Invoice Deleted", description: `Invoice #${invoiceNumber} has been deleted.` });
      onInvoiceDeleted?.();
    } catch (error: any) {
      console.error("Failed to delete invoice:", error);
      let errorMessage = "Could not delete the invoice. Please try again.";
      if (error.message && error.message.toLowerCase().includes("permission")) {
        errorMessage = "Permission denied. You may not have the rights to delete this invoice.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ variant: "destructive", title: "Deletion Failed", description: errorMessage });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[120px]">Inv. Number</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-[100px]">Due Date</TableHead>
                <TableHead className="text-right w-[130px]">Total Amount</TableHead>
                <TableHead className="text-center w-[100px]">Status</TableHead>
                <TableHead className="w-[120px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                     <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                        <span>No invoices found for this company.</span>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/invoices/create">Create your first invoice</Link>
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.invoiceDate}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={invoice.customerName}>{invoice.customerName}</TableCell>
                    <TableCell>{invoice.dueDate || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrencyDisplay(invoice.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View Invoice" asChild>
                           <Link href={`/invoices/${invoice.id}/view`}> <Eye className="h-4 w-4" /> </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Invoice" asChild>
                           <Link href={`/invoices/${invoice.id}/edit`}> <Edit3 className="h-4 w-4" /> </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 h-7 w-7"
                              disabled={isDeleting === invoice.id}
                              title="Delete Invoice"
                            >
                              {isDeleting === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete invoice <strong>#{invoice.invoiceNumber}</strong> for {invoice.customerName}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                                disabled={isDeleting === invoice.id}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                {isDeleting === invoice.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete Invoice
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
