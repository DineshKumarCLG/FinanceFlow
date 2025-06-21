
"use client";

import type { Invoice, InvoiceLineItem, CompanySettings } from "@/lib/data-service";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PrintableInvoiceProps {
  invoice: Invoice;
  companyDetails: CompanySettings | null;
}

const fallbackCompanyDetails: Required<Pick<CompanySettings, 'businessName' | 'companyGstin'>> & Partial<CompanySettings> = {
  businessName: "Your Company Name",
  companyAddress: "123 Business Street, City, Country",
  companyGstin: "YOUR_GSTIN_HERE",
  companyEmail: "your.email@example.com",
  companyPhone: "+1234567890",
  bankDetails: "Bank: Default Bank\nAccount Name: Your Company\nAccount No: 0000000000\nIFSC: DEFB0000000",
  authorizedSignatory: "Authorized Signatory",
  currency: "INR",
};


export function PrintableInvoice({ invoice, companyDetails }: PrintableInvoiceProps) {
  const [clientLocale, setClientLocale] = useState('en-US');
  
  const currentCompanyDetails = {
    name: companyDetails?.businessName || fallbackCompanyDetails.businessName,
    address: companyDetails?.companyAddress || fallbackCompanyDetails.companyAddress,
    gstin: companyDetails?.companyGstin || fallbackCompanyDetails.companyGstin,
    email: companyDetails?.companyEmail || fallbackCompanyDetails.companyEmail,
    phone: companyDetails?.companyPhone || fallbackCompanyDetails.companyPhone,
    bankDetails: companyDetails?.bankDetails || fallbackCompanyDetails.bankDetails,
    authorizedSignatory: companyDetails?.authorizedSignatory || fallbackCompanyDetails.authorizedSignatory,
    currency: companyDetails?.currency || fallbackCompanyDetails.currency,
  };


  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const formatCurrency = (value: number | undefined, locale = clientLocale, curr = currentCompanyDetails.currency) => {
    if (value === undefined || value === null) return "-";
    return new Intl.NumberFormat(locale, { style: "currency", currency: curr, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatDate = (dateString: string | undefined, locale = clientLocale) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadgeVariant = (status: Invoice['status'] = 'draft') => {
    switch (status) {
      case 'paid': return 'default';
      case 'sent': return 'secondary';
      case 'overdue': return 'destructive';
      case 'draft': return 'outline';
      case 'void': return 'outline';
      default: return 'outline';
    }
  };

  const calculateLineItemGstAmount = (item: InvoiceLineItem): number => {
    if (item.gstRate && item.amount) {
      return parseFloat((item.amount * (item.gstRate / 100)).toFixed(2));
    }
    return 0;
  };
  
  const calculateLineItemTotal = (item: InvoiceLineItem): number => {
    const taxableAmount = item.amount || 0;
    const gstAmount = calculateLineItemGstAmount(item);
    return parseFloat((taxableAmount + gstAmount).toFixed(2));
  };

  const { subTotal, totalGstAmount, totalAmount } = invoice;

  return (
    <div className="bg-white p-6 sm:p-10 text-sm font-sans printable-card text-gray-800 printable-text">
      <header className="grid grid-cols-2 gap-4 mb-8 items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{currentCompanyDetails.name}</h2>
          <p className="text-xs text-gray-600 whitespace-pre-line">{currentCompanyDetails.address || fallbackCompanyDetails.companyAddress}</p>
          {currentCompanyDetails.gstin && <p className="text-xs text-gray-600">GSTIN/VAT ID: {currentCompanyDetails.gstin}</p>}
          {currentCompanyDetails.email && <p className="text-xs text-gray-600">Email: {currentCompanyDetails.email}</p>}
          {currentCompanyDetails.phone && <p className="text-xs text-gray-600">Phone: {currentCompanyDetails.phone}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gray-900 uppercase mb-2">Invoice</h1>
          <p className="text-gray-700"><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</p>
          <p className="text-gray-700"><span className="font-semibold">Date:</span> {formatDate(invoice.invoiceDate)}</p>
          {invoice.dueDate && <p className="text-gray-700"><span className="font-semibold">Due Date:</span> {formatDate(invoice.dueDate)}</p>}
          <div className="mt-2">
            <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize text-xs px-2.5 py-1">
              Status: {invoice.status}
            </Badge>
          </div>
        </div>
      </header>

      <Separator className="my-6 bg-gray-300" />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Bill To:</h3>
          <p className="font-semibold text-gray-800">{invoice.customerName || "N/A"}</p>
          {invoice.billingAddress && <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.billingAddress}</p>}
          {invoice.customerEmail && <p className="text-xs text-gray-600">Email: {invoice.customerEmail}</p>}
          {invoice.customerGstin && <p className="text-xs text-gray-600">GSTIN/VAT ID: {invoice.customerGstin}</p>}
        </div>
        {invoice.shippingAddress && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Ship To:</h3>
            <p className="font-semibold text-gray-800">{invoice.customerName || "N/A"}</p>
            <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.shippingAddress}</p>
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="border border-gray-300 rounded-md overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-100 text-gray-600">
              <TableRow>
                <TableHead className="p-2 text-left text-xs font-semibold uppercase tracking-wider w-10">#</TableHead>
                <TableHead className="p-2 text-left text-xs font-semibold uppercase tracking-wider">Item & Description</TableHead>
                <TableHead className="p-2 text-center text-xs font-semibold uppercase tracking-wider w-20">HSN/SAC</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold uppercase tracking-wider w-16">Qty</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold uppercase tracking-wider w-24">Rate</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold uppercase tracking-wider w-28">Taxable Value</TableHead>
                <TableHead className="p-2 text-center text-xs font-semibold uppercase tracking-wider w-16">GST @</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold uppercase tracking-wider w-24">GST Amt.</TableHead>
                <TableHead className="p-2 text-right text-xs font-semibold uppercase tracking-wider w-28">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                invoice.lineItems.map((item, index) => {
                  const lineGstAmount = calculateLineItemGstAmount(item);
                  const lineItemTotal = calculateLineItemTotal(item);
                  return (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="p-2 text-gray-700 align-top">{index + 1}</TableCell>
                      <TableCell className="p-2 text-gray-700 align-top">{item.description}</TableCell>
                      <TableCell className="p-2 text-gray-700 text-center align-top">{item.hsnSacCode || '-'}</TableCell>
                      <TableCell className="p-2 text-gray-700 text-right align-top">{(item.quantity || 0).toLocaleString(clientLocale)}</TableCell>
                      <TableCell className="p-2 text-gray-700 text-right align-top">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="p-2 text-gray-700 text-right align-top">{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="p-2 text-gray-700 text-center align-top">{item.gstRate ? `${item.gstRate}%` : '-'}</TableCell>
                      <TableCell className="p-2 text-gray-700 text-right align-top">{formatCurrency(lineGstAmount)}</TableCell>
                      <TableCell className="p-2 text-gray-700 text-right font-medium align-top">{formatCurrency(lineItemTotal)}</TableCell>
                    </TableRow>
                  );
                })
              ) : invoice.itemsSummary ? (
                 <TableRow>
                    <TableCell className="p-2 text-gray-700">1</TableCell>
                    <TableCell className="p-2 text-gray-700" colSpan={7}>{invoice.itemsSummary}</TableCell>
                    <TableCell className="p-2 text-gray-700 text-right font-medium">{formatCurrency(subTotal)}</TableCell>
                 </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="p-4 text-center text-gray-500">
                    No item details provided.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
      
      <section className="flex justify-end mb-8">
        <div className="w-full sm:w-2/3 md:w-1/2 lg:w-2/5 space-y-1 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal (Taxable Value):</span>
            <span className="font-medium">{formatCurrency(subTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Total Tax (GST/VAT):</span>
            <span className="font-medium">{formatCurrency(totalGstAmount)}</span>
          </div>
          <Separator className="my-1 bg-gray-300" />
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Grand Total ({currentCompanyDetails.currency}):</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs">
        <div>
          {(invoice.paymentTerms || invoice.notes) && <Separator className="mb-2 bg-gray-200 md:hidden" />}
          <div className="mb-3">
            <h4 className="font-semibold text-gray-700 mb-0.5">Payment Terms:</h4>
            <p className="text-gray-600 whitespace-pre-line">
              {invoice.paymentTerms ? invoice.paymentTerms : <span className="text-gray-500 italic">Not specified</span>}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-0.5">Notes:</h4>
            <p className="text-gray-600 whitespace-pre-line">
              {invoice.notes ? invoice.notes : <span className="text-gray-500 italic">No additional notes</span>}
            </p>
          </div>
        </div>
        <div>
          <Separator className="mb-2 bg-gray-200 md:hidden"/>
          <h4 className="font-semibold text-gray-700 mb-0.5">Bank Details for Payment:</h4>
          <p className="text-gray-600 whitespace-pre-line">{currentCompanyDetails.bankDetails || fallbackCompanyDetails.bankDetails}</p>
        </div>
      </section>

      <footer className="mt-12 pt-6 border-t border-gray-300 text-xs text-gray-600">
        <div className="grid grid-cols-2">
          <div className="text-left">
            <p>This is a computer-generated invoice and does not require a physical signature if sent digitally.</p>
            <p>For {currentCompanyDetails.name}</p>
            <div className="mt-10">
               <Separator className="w-48 bg-gray-400"/>
              <p className="mt-1">({currentCompanyDetails.authorizedSignatory || fallbackCompanyDetails.authorizedSignatory})</p>
              <p>Authorized Signatory</p>
            </div>
          </div>
           <div className="text-right">
             <p>Thank you for your business!</p>
             {currentCompanyDetails.email && currentCompanyDetails.phone &&
                <p>If you have any questions, please contact us at: <br/>{currentCompanyDetails.email} or {currentCompanyDetails.phone}</p>
             }
           </div>
        </div>
        <div className="mt-8 text-center">
          <p className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs rounded-md shadow">
            Powered by FinanceFlow AI
          </p>
        </div>
      </footer>
    </div>
  );
}
