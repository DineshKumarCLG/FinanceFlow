import { AddEntryForm } from "@/components/ai/AddEntryForm";
import { PageTitle } from "@/components/shared/PageTitle";

export default function AddEntryPage() {
  return (
    <div>
      <PageTitle
        title="Create New Entry"
        description="Let our AI assistant help you record your financial transactions quickly and accurately."
      />
      <div className="max-w-2xl mx-auto">
        <AddEntryForm />
      </div>
    </div>
  );
}
