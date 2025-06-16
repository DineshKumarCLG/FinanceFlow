
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { Invoice } from "@/lib/data-service";
import { getInvoiceById } from "@/lib/data-service";
import { PageTitle } from "@/components/shared/PageTitle";
import { PrintableInvoice } from "@/components/invoices/PrintableInvoice";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card"; // Removed CardHeader as it's not used
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
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printableAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (invoiceId && currentCompanyId) {
      setIsLoading(true);
      setError(null);
      getInvoiceById(currentCompanyId, invoiceId)
        .then((data) => {
          if (data) {
            setInvoice(data);
          } else {
            setError("Invoice not found or you do not have permission to view it.");
          }
        })
        .catch((e) => {
          console.error("Failed to fetch invoice:", e);
          setError(e.message || "An unexpected error occurred while fetching the invoice.");
        })
        .finally(() => setIsLoading(false));
    } else if (!currentCompanyId) {
        setError("Company ID not available. Cannot fetch invoice.");
        setIsLoading(false);
    } else if (!invoiceId) {
        setError("Invoice ID not specified.");
        setIsLoading(false);
    }
  }, [invoiceId, currentCompanyId]);

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
            scale: 2, // Increase scale for better quality
            useCORS: true, // If you have external images
            logging: false, // Disable logging for cleaner console
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt', // points
            format: 'a4' // A4 paper size
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Calculate the aspect ratio
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;

        // Center the image on the PDF page (optional)
        const x = (pdfWidth - scaledWidth) / 2;
        const y = 0; // (pdfHeight - scaledHeight) / 2; // Align to top for invoices

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


  return (
    <div className="space-y-6">
      <PageTitle
        title={isLoading ? "Loading Invoice..." : invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice Detail"}
        description={invoice ? `Customer: ${invoice.customerName}` : ""}
      >
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" asChild>
            <Link href="/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Link>
          </Button>
          {invoice && !isLoading && (
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

      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Invoice</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && invoice && (
        // The ref is attached to the direct parent of PrintableInvoice
        // Ensure PrintableInvoice itself does not have margins that could be cut off by html2canvas
        <div ref={printableAreaRef} className="printable-invoice-container bg-white"> 
          <Card className="printable-invoice-area printable-card shadow-lg">
            <CardContent className="p-0 md:p-0"> {/* Minimal padding for canvas capture */}
              <PrintableInvoice invoice={invoice} />
            </CardContent>
          </Card>
        </div>
      )}
       {!isLoading && !error && !invoice && (
         <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invoice Not Found</AlertTitle>
            <AlertDescription>The requested invoice could not be found. It may have been deleted or the ID is incorrect.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}

