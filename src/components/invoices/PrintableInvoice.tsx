
"use client";

import type { Invoice, InvoiceLineItem } from "@/lib/data-service";
import { AppLogo } from "@/components/layout/AppLogo";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";

interface PrintableInvoiceProps {
  invoice: Invoice;
}

export function PrintableInvoice({ invoice }: PrintableInvoiceProps) {
  const [clientLocale, setClientLocale] = useState('en-US');
  const companyDetails = {
    name: "FinanceFlow AI Solutions",
    address: "123 Innovation Drive, Tech Park, Bangalore, 560100",
    gstin: "29AAPCK1234A1Z5",
    email: "contact@financeflow.ai",
    phone: "+91 98765 43210"
  };
  const companyLogoUrl = "https://placehold.co/150x50.png?text=Company+Logo"; 

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const formatCurrency = (value: number | undefined, locale = clientLocale, currency = "INR") => {
    if (value === undefined || value === null) return "-";
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
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

  const calculateLineItemGstAmount = (item: InvoiceLineItem): number => {
    if (item.gstRate && item.amount) {
      return item.amount * (item.gstRate / 100);
    }
    return 0;
  };

  // Recalculate subTotal, totalGstAmount, and totalAmount from lineItems if they exist
  const derivedSubTotal = invoice.lineItems && invoice.lineItems.length > 0 
    ? invoice.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    : invoice.subTotal;
  
  const derivedTotalGstAmount = invoice.lineItems && invoice.lineItems.length > 0
    ? invoice.lineItems.reduce((sum, item) => sum + calculateLineItemGstAmount(item), 0)
    : invoice.totalGstAmount;

  const derivedTotalAmount = derivedSubTotal + derivedTotalGstAmount;


  return (
    <div className="bg-white p-4 sm:p-8 rounded-lg shadow-none border-none printable-card text-gray-800 printable-text">
      {/* Invoice Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start mb-8">
        <div>
          {companyLogoUrl ? (
            <Image src={companyLogoUrl} alt="Company Logo" width={150} height={50} data-ai-hint="company logo" className="mb-2" />
          ) : (
            <AppLogo className="mb-2" iconClassName="h-10 w-10" textClassName="text-2xl" />
          )}
          <h2 className="text-lg font-semibold">{companyDetails.name}</h2>
          <p className="text-xs text-gray-600 whitespace-pre-line">{companyDetails.address}</p>
          {companyDetails.gstin && <p className="text-xs text-gray-600">GSTIN: {companyDetails.gstin}</p>}
          {companyDetails.email && <p className="text-xs text-gray-600">Email: {companyDetails.email}</p>}
          {companyDetails.phone && <p className="text-xs text-gray-600">Phone: {companyDetails.phone}</p>}
        </div>
        <div className="text-left sm:text-right mt-4 sm:mt-0">
          <h1 className="text-2xl sm:text-3xl font-bold uppercase">Invoice</h1>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Date:</span> {new Date(invoice.invoiceDate + 'T00:00:00').toLocaleDateString(clientLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {invoice.dueDate && (
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Due Date:</span> {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString(clientLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
           <div className="mt-2">
            <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize text-sm px-3 py-1">
              {invoice.status}
            </Badge>
          </div>
        </div>
      </header>

      {/* Customer Details */}
      <section className="mb-8">
        <h3 className="text-md font-semibold text-gray-700 mb-1">Bill To:</h3>
        <p className="text-sm font-medium">{invoice.customerName}</p>
        {invoice.customerGstin && <p className="text-xs text-gray-600">GSTIN: {invoice.customerGstin}</p>}
        {invoice.customerEmail && <p className="text-xs text-gray-600">Email: {invoice.customerEmail}</p>}
        {invoice.billingAddress && <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.billingAddress}</p>}
      </section>

      {/* Items Table */}
      <section className="mb-8">
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-10">#</TableHead>
                <TableHead className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Description</TableHead>
                <TableHead className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">HSN/SAC</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Qty</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Rate</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">GST</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                invoice.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="p-2 text-sm text-gray-700">{index + 1}</TableCell>
                    <TableCell className="p-2 text-sm text-gray-700">{item.description}</TableCell>
                    <TableCell className="p-2 text-sm text-gray-700">{item.hsnSacCode || '-'}</TableCell>
                    <TableCell className="p-2 text-sm text-gray-700 text-right">{item.quantity}</TableCell>
                    <TableCell className="p-2 text-sm text-gray-700 text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="p-2 text-sm text-gray-700 text-right">{item.gstRate ? `${item.gstRate}%` : '-'}</TableCell>
                    <TableCell className="p-2 text-sm text-gray-700 text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                  </TableRow>
                ))
              ) : invoice.itemsSummary ? (
                 <TableRow>
                    <TableCell className="p-2 text-sm text-gray-700">1</TableCell>
                    <TableCell className="p-2 text-sm text-gray-700" colSpan={5}>{invoice.itemsSummary}</TableCell>
                    <TableCell className="p-2 text-sm text-gray-700 text-right font-medium">{formatCurrency(invoice.subTotal)}</TableCell>
                 </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="p-4 text-center text-sm text-gray-500">
                    No item details provided.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
      
      {/* Totals Section */}
      <section className="flex justify-end mb-8">
        <div className="w-full sm:w-2/5 lg:w-1/3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span>{formatCurrency(derivedSubTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Total GST:</span>
              <span>{formatCurrency(derivedTotalGstAmount)}</span>
            </div>
            <Separator className="my-1 bg-gray-300" />
            <div className="flex justify-between text-lg font-bold text-gray-800">
              <span>Total Amount Due:</span>
              <span>{formatCurrency(derivedTotalAmount)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notes / Terms */}
      {invoice.notes && (
        <section className="mb-8">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes:</h4>
          <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.notes}</p>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 pt-8 border-t border-gray-200">
        <p>Thank you for your business!</p>
        <p>{companyDetails.name} - {companyDetails.email} - {companyDetails.phone}</p>
      </footer>
    </div>
  );
}
