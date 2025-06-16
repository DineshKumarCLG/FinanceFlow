
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { Invoice, CompanySettings } from "@/lib/data-service"; // Added CompanySettings
import { getInvoiceById, getCompanySettings } from "@/lib/data-service"; // Added getCompanySettings
import { PageTitle } from "@/components/shared/PageTitle";
import { PrintableInvoice } from "@/components/invoices/PrintableInvoice";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from "@/hooks/use-toast";


export default function InvoiceViewPage() {
  const params = useParams();
  const invoiceId = typeof params.id === "string" ? params.id : "";
  const { currentCompanyId } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null); // State for company settings
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printableAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      if (invoiceId && currentCompanyId) {
        setIsLoadingInvoice(true);
        setIsLoadingSettings(true);
        setError(null);
        try {
          const invoiceData = await getInvoiceById(currentCompanyId, invoiceId);
          if (invoiceData) {
            setInvoice(invoiceData);
          } else {
            setError("Invoice not found or you do not have permission to view it.");
          }
        } catch (e: any) {
          console.error("Failed to fetch invoice:", e);
          setError(e.message || "An unexpected error occurred while fetching the invoice.");
        } finally {
          setIsLoadingInvoice(false);
        }

        try {
          const settings = await getCompanySettings(currentCompanyId);
          setCompanySettings(settings);
        } catch (e: any) {
          console.error("Failed to fetch company settings:", e);
          // Not setting main error for this, invoice can still be shown with default company details
          toast({ variant: "destructive", title: "Settings Error", description: "Could not load company details for the invoice header." });
        } finally {
          setIsLoadingSettings(false);
        }

      } else if (!currentCompanyId) {
          setError("Company ID not available. Cannot fetch invoice.");
          setIsLoadingInvoice(false);
          setIsLoadingSettings(false);
      } else if (!invoiceId) {
          setError("Invoice ID not specified.");
          setIsLoadingInvoice(false);
          setIsLoadingSettings(false);
      }
    }
    fetchData();
  }, [invoiceId, currentCompanyId, toast]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printableAreaRef.current || !invoice) {
        toast({ variant: "destructive", title: "Download Error", description: "Cannot download PDF. Printable content not found." });
        return;
    }
    setIsDownloadingPdf(true);
    toast({ title: "Generating PDF...", description: "Please wait while your invoice PDF is being prepared." });

    try {
        const canvas = await html2canvas(printableAreaRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;
        const x = (pdfWidth - scaledWidth) / 2;
        const y = 0; 

        pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
        pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
        toast({ title: "PDF Downloaded", description: "Invoice PDF has been successfully generated." });
    } catch (e: any) {
        console.error("Error generating PDF:", e);
        toast({ variant: "destructive", title: "PDF Generation Failed", description: e.message || "An unexpected error occurred." });
    } finally {
        setIsDownloadingPdf(false);
    }
};

  const isLoading = isLoadingInvoice || isLoadingSettings;

  return (
    <div className="space-y-6">
      <PageTitle
        title={isLoadingInvoice ? "Loading Invoice..." : invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice Detail"}
        description={invoice ? `Customer: ${invoice.customerName}` : ""}
      >
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" asChild>
            <Link href="/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Link>
          </Button>
          {invoice && !isLoadingInvoice && (
            <>
              <Button onClick={handlePrint} disabled={isDownloadingPdf}>
                <Printer className="mr-2 h-4 w-4" /> Print Invoice
              </Button>
              <Button onClick={handleDownloadPdf} disabled={isDownloadingPdf || !invoice}>
                {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                 Download PDF
              </Button>
            </>
          )}
        </div>
      </PageTitle>

      {isLoading && (
        <Card>
          <CardContent className="p-6 flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}

      {error && !isLoadingInvoice && ( // Only show main error if invoice loading failed
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Invoice</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoadingInvoice && !error && invoice && (
        <div ref={printableAreaRef} className="printable-invoice-container bg-white"> 
          <Card className="printable-invoice-area printable-card shadow-lg">
            <CardContent className="p-0 md:p-0">
              <PrintableInvoice invoice={invoice} companyDetails={companySettings} />
            </CardContent>
          </Card>
        </div>
      )}
       {!isLoadingInvoice && !error && !invoice && (
         <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invoice Not Found</AlertTitle>
            <AlertDescription>The requested invoice could not be found. It may have been deleted or the ID is incorrect.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}
