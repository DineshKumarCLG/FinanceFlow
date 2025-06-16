
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { PageTitle } from "@/components/shared/PageTitle";

export default function CreateInvoicePage() {
  return (
    <div>
      <PageTitle
        title="Create New Invoice"
        description="Generate a new invoice using AI assistance or fill it out manually."
      />
      <div className="max-w-3xl mx-auto">
        <InvoiceForm />
      </div>
    </div>
  );
}
