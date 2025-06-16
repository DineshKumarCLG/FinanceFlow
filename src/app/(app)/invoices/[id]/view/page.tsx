
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { Invoice } from "@/lib/data-service";
import { getInvoiceById } from "@/lib/data-service";
import { PageTitle } from "@/components/shared/PageTitle";
import { PrintableInvoice } from "@/components/invoices/PrintableInvoice";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function InvoiceViewPage() {
  const params = useParams();
  const invoiceId = typeof params.id === "string" ? params.id : "";
  const { currentCompanyId } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print Invoice
              </Button>
              <Button variant="outline" disabled>
                <Download className="mr-2 h-4 w-4" /> Download PDF
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
        <Card className="printable-invoice-area printable-card">
          <CardContent className="p-0 md:p-6"> {/* Less padding on mobile for print layout */}
            <PrintableInvoice invoice={invoice} />
          </CardContent>
        </Card>
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
