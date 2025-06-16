
"use client";

import Link from "next/link";
import { PageTitle } from "@/components/shared/PageTitle";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertCircle } from "lucide-react";
import { InvoiceList } from "@/components/invoices/InvoiceList";
import { useState, useEffect, useCallback } from "react";
import type { Invoice } from "@/lib/data-service";
import { getInvoices } from "@/lib/data-service";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from '@tanstack/react-query';

export default function InvoicesPage() {
  const { user: currentUser, currentCompanyId } = useAuth();

  const { data: invoices, isLoading, error } = useQuery<Invoice[], Error>({
    queryKey: ['invoices', currentCompanyId],
    queryFn: () => {
      if (!currentCompanyId) return Promise.resolve([]);
      return getInvoices(currentCompanyId);
    },
    enabled: !!currentUser && !!currentCompanyId,
  });

  if (!currentCompanyId && !isLoading) {
    return (
      <div className="space-y-6 p-4">
        <PageTitle
          title="Invoices"
          description="Manage your customer invoices."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Company ID Missing</AlertTitle>
          <AlertDescription>
            Please select or enter a Company ID on the main login page to manage invoices.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title={`Invoices ${currentCompanyId ? `(${currentCompanyId})` : ''}`}
        description="Manage your customer invoices."
      >
        <Button asChild>
          <Link href="/invoices/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Link>
        </Button>
      </PageTitle>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Invoices</AlertTitle>
          <AlertDescription>{error.message || "Could not fetch invoices."}</AlertDescription>
        </Alert>
      ) : (
        <InvoiceList invoices={invoices || []} companyId={currentCompanyId!} />
      )}
    </div>
  );
}
