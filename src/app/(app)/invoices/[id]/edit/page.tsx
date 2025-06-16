
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { Invoice } from "@/lib/data-service";
import { getInvoiceById } from "@/lib/data-service";
import { PageTitle } from "@/components/shared/PageTitle";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
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
            setError("Invoice not found or you do not have permission to edit it.");
            // Optionally redirect if not found after a delay, or show permanent error
            // setTimeout(() => router.push('/invoices'), 3000); 
          }
        })
        .catch((e) => {
          console.error("Failed to fetch invoice for editing:", e);
          setError(e.message || "An unexpected error occurred while fetching the invoice.");
        })
        .finally(() => setIsLoading(false));
    } else if (!currentCompanyId) {
        setError("Company ID not available. Cannot fetch invoice for editing.");
        setIsLoading(false);
    } else if (!invoiceId) {
        setError("Invoice ID not specified for editing.");
        setIsLoading(false);
    }
  }, [invoiceId, currentCompanyId, router]);

  return (
    <div>
      <PageTitle
        title={isLoading ? "Loading Invoice for Edit..." : invoice ? `Edit Invoice ${invoice.invoiceNumber}` : "Edit Invoice"}
        description="Modify the details of your existing invoice."
      />
      <div className="max-w-3xl mx-auto">
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
          <InvoiceForm mode="edit" initialInvoiceData={invoice} />
        )}

        {!isLoading && !error && !invoice && (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invoice Not Found</AlertTitle>
                <AlertDescription>The invoice you are trying to edit could not be found.</AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}
