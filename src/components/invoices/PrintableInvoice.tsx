
"use client";

import type { Invoice } from "@/lib/data-service";
import { AppLogo } from "@/components/layout/AppLogo";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

interface PrintableInvoiceProps {
  invoice: Invoice;
  // companyLogoUrl?: string; // Optional: For company logo
  // companyDetails?: { name: string; address: string; gstin?: string; email?: string; phone?: string };
}

export function PrintableInvoice({ invoice }: PrintableInvoiceProps) {
  const [clientLocale, setClientLocale] = useState('en-US');
  // Updated company details
  const companyDetails = {
    name: "FinanceFlow AI Solutions",
    address: "123 Innovation Drive, Tech Park, Bangalore, 560100",
    gstin: "29AAPCK1234A1Z5",
    email: "contact@financeflow.ai",
    phone: "+91 98765 43210"
  };
  const companyLogoUrl = "https://placehold.co/150x50.png?text=Company+Logo"; // Placeholder logo

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return "-";
    return value.toLocaleString(clientLocale, { style: "currency", currency: "INR" }); // Default to INR
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

  return (
    <div className="bg-white p-4 sm:p-8 rounded-lg shadow-none border-none printable-card">
      {/* Invoice Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start mb-8">
        <div>
          {companyLogoUrl ? (
            <Image src={companyLogoUrl} alt="Company Logo" width={150} height={50} data-ai-hint="company logo" className="mb-2" />
          ) : (
            <AppLogo className="mb-2" iconClassName="h-10 w-10" textClassName="text-2xl" />
          )}
          <h2 className="text-lg font-semibold text-gray-800 printable-text">{companyDetails.name}</h2>
          <p className="text-xs text-gray-600 printable-text whitespace-pre-line">{companyDetails.address}</p>
          {companyDetails.gstin && <p className="text-xs text-gray-600 printable-text">GSTIN: {companyDetails.gstin}</p>}
          {companyDetails.email && <p className="text-xs text-gray-600 printable-text">Email: {companyDetails.email}</p>}
          {companyDetails.phone && <p className="text-xs text-gray-600 printable-text">Phone: {companyDetails.phone}</p>}
        </div>
        <div className="text-left sm:text-right mt-4 sm:mt-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 printable-text uppercase">Invoice</h1>
          <p className="text-sm text-gray-600 printable-text">
            <span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}
          </p>
          <p className="text-sm text-gray-600 printable-text">
            <span className="font-semibold">Date:</span> {new Date(invoice.invoiceDate + 'T00:00:00').toLocaleDateString(clientLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {invoice.dueDate && (
            <p className="text-sm text-gray-600 printable-text">
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
        <h3 className="text-md font-semibold text-gray-700 printable-text mb-1">Bill To:</h3>
        <p className="text-sm font-medium text-gray-800 printable-text">{invoice.customerName}</p>
        {invoice.customerGstin && <p className="text-xs text-gray-600 printable-text">GSTIN: {invoice.customerGstin}</p>}
        {invoice.customerEmail && <p className="text-xs text-gray-600 printable-text">Email: {invoice.customerEmail}</p>}
        {invoice.billingAddress && <p className="text-xs text-gray-600 printable-text whitespace-pre-line">{invoice.billingAddress}</p>}
      </section>

      {/* Items Summary - For now, we use itemsSummary as line items are not yet implemented */}
      <section className="mb-8">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 printable-card">
              <tr>
                <th className="p-2 text-left font-semibold text-gray-600 printable-text">Description</th>
                <th className="p-2 w-24 text-right font-semibold text-gray-600 printable-text">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white printable-card">
              {invoice.itemsSummary ? (
                 <tr>
                    <td className="p-2 text-gray-700 printable-text whitespace-pre-line align-top">{invoice.itemsSummary}</td>
                    <td className="p-2 text-right text-gray-700 printable-text align-top">{formatCurrency(invoice.subTotal)}</td>
                 </tr>
              ) : (
                <tr>
                  <td colSpan={2} className="p-2 text-center text-gray-500 printable-text">No item details provided.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Totals Section */}
      <section className="flex justify-end mb-8">
        <div className="w-full sm:w-2/5 lg:w-1/3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-700 printable-text">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-700 printable-text">
              <span>Total GST:</span>
              <span>{formatCurrency(invoice.totalGstAmount)}</span>
            </div>
            <Separator className="my-1 bg-gray-300" />
            <div className="flex justify-between text-lg font-bold text-gray-800 printable-text">
              <span>Total Amount Due:</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notes / Terms */}
      {invoice.notes && (
        <section className="mb-8">
          <h4 className="text-sm font-semibold text-gray-700 printable-text mb-1">Notes:</h4>
          <p className="text-xs text-gray-600 printable-text whitespace-pre-line">{invoice.notes}</p>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 printable-text pt-8 border-t border-gray-200">
        <p>Thank you for your business!</p>
        <p>{companyDetails.name} - {companyDetails.email} - {companyDetails.phone}</p>
      </footer>
    </div>
  );
}
