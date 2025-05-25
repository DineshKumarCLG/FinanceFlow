
"use client";

import { useState, useEffect } from 'react';
import { PageTitle } from "@/components/shared/PageTitle";
import { FileUploader } from "@/components/shared/FileUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileText, CheckCircle, AlertCircle, CornerDownLeft } from 'lucide-react';
import { extractAccountingData, type ExtractAccountingDataOutput, type ExtractAccountingDataInput } from '@/ai/flows/extract-accounting-data';
import { useToast } from '@/hooks/use-toast';
import { addJournalEntries } from '@/lib/data-service';

export default function UploadDocumentPage() {
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractAccountingDataOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const handleFileUpload = async (file: File, dataUri: string) => {
    setCurrentFile(file);
    setIsProcessingAi(true);
    setExtractedData(null);
    setError(null);

    try {
      const result = await extractAccountingData({ documentDataUri: dataUri });
      setExtractedData(result);
      if (result.entries.length === 0) {
        toast({ variant: "default", title: "Parsing Complete", description: "AI could not find any accounting entries in this document." });
      } else {
        toast({ title: "Document Processed", description: "Review the extracted entries below." });
      }
    } catch (e: any) {
      setError("Failed to process document. The AI couldn't extract data or an error occurred.");
      toast({ variant: "destructive", title: "Processing Error", description: e.message || "Unknown error during document processing."});
      console.error(e);
    } finally {
      setIsProcessingAi(false);
    }
  };
  
  const handleConfirmEntries = async () => {
    if (!extractedData || extractedData.entries.length === 0) return;
    setIsSaving(true);
    try {
      const entriesToSave = extractedData.entries.map(entry => ({
        date: entry.date,
        description: entry.description,
        debitAccount: entry.debitAccount,
        creditAccount: entry.creditAccount,
        amount: entry.amount,
      }));
      await addJournalEntries(entriesToSave);
      toast({ title: "Entries Saved!", description: "The extracted accounting entries have been recorded." });
      setExtractedData(null);
      setCurrentFile(null); 
    } catch (e: any) {
      toast({ variant: "destructive", title: "Saving Error", description: "Could not save the entries." });
      console.error("Saving error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isProcessingAi || isSaving;

  return (
    <div>
      <PageTitle
        title="Upload Document"
        description="Upload your receipts, bills, or invoices. Our AI will extract the accounting data."
      />
      <div className="max-w-2xl mx-auto space-y-6">
        <FileUploader onFileUpload={handleFileUpload} isProcessing={isProcessingAi} />

        {isProcessingAi && (
          <div className="flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>AI is analyzing your document... Please wait.</span>
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {extractedData && !error && !isProcessingAi && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-6 w-6 text-primary" /> Extracted Accounting Entries
              </CardTitle>
              <CardDescription>
                {currentFile?.name ? `From document: ${currentFile.name}. ` : ''}
                Review the AI-generated entries and confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {extractedData.entries.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>No Entries Found</AlertTitle>
                  <AlertDescription>The AI analyzed the document but did not find any recognizable accounting entries. You can try another document or add entries manually.</AlertDescription>
                </Alert>
              ) : (
                extractedData.entries.map((entry, index) => (
                  <Card key={index} className="bg-secondary/30 p-4">
                    <p><strong>Entry #{index + 1}</strong></p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
                      <div><strong>Date:</strong> {entry.date}</div>
                      <div><strong>Amount:</strong> {entry.amount.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}</div>
                      <div><strong>Debit:</strong> {entry.debitAccount}</div>
                      <div><strong>Credit:</strong> {entry.creditAccount}</div>
                      <div className="col-span-2"><strong>Description:</strong> {entry.description}</div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
            {extractedData.entries.length > 0 && (
              <CardFooter>
                <Button onClick={handleConfirmEntries} className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CornerDownLeft className="mr-2 h-4 w-4" />}
                   Confirm and Save All Entries
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
