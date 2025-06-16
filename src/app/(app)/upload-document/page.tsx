
"use client";

import { useState, useEffect } from 'react';
import { PageTitle } from "@/components/shared/PageTitle";
import { FileUploader } from "@/components/shared/FileUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileText, CheckCircle, AlertCircle, CornerDownLeft, Info } from 'lucide-react';
import { extractAccountingData, type ExtractAccountingDataOutput, type ExtractAccountingDataInput } from '@/ai/flows/extract-accounting-data';
import { useToast } from '@/hooks/use-toast';
import { addJournalEntries, type JournalEntry } from '@/lib/data-service';
import { useAuth } from "@/contexts/AuthContext";

export default function UploadDocumentPage() {
  const { currentCompanyId } = useAuth();
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
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "No Company ID selected. Cannot process document." });
      setError("No Company ID selected. Please ensure you are logged in with a company.");
      return;
    }
    setCurrentFile(file);
    setIsProcessingAi(true);
    setExtractedData(null);
    setError(null);

    try {
      // Potentially pass gstRegionContext here if available from settings
      const aiInput: ExtractAccountingDataInput = { documentDataUri: dataUri };
      const result = await extractAccountingData(aiInput);
      setExtractedData(result);
      if (result.entries.length === 0) {
        toast({ variant: "default", title: "Parsing Complete", description: "AI could not find any accounting entries in this document." });
      } else {
        toast({ title: "Document Processed", description: "Review the extracted entries below." });
      }
    } catch (e: any) {
      console.error("[UploadDocumentPage] Error during AI processing:", e);
      let aiErrorMessage = "The AI failed to process the document. Please try a different document or check its quality/format.";
      if (e instanceof Error && e.message) {
        aiErrorMessage = `AI Error: ${e.message.substring(0, 100)}${e.message.length > 100 ? '...' : ''}`;
      } else if (typeof e === 'string' && e) {
        aiErrorMessage = `AI Error: ${e.substring(0, 100)}${e.length > 100 ? '...' : ''}`;
      }
      setError(aiErrorMessage);
      toast({ variant: "destructive", title: "AI Processing Failed", description: aiErrorMessage});
    } finally {
      setIsProcessingAi(false);
    }
  };
  
  const handleConfirmEntries = async () => {
    if (!extractedData || extractedData.entries.length === 0 || !currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "Missing data, entries, or Company ID. Cannot save." });
      return;
    }
    setIsSaving(true);
    try {
      const entriesToSave: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>[] = extractedData.entries.map(entry => ({
        date: entry.date,
        description: entry.description,
        debitAccount: entry.debitAccount,
        creditAccount: entry.creditAccount,
        amount: entry.amount, // Total Amount
        // GST Fields
        taxableAmount: entry.taxableAmount,
        gstType: entry.gstType,
        gstRate: entry.gstRate,
        igstAmount: entry.igstAmount,
        cgstAmount: entry.cgstAmount,
        sgstAmount: entry.sgstAmount,
        vatAmount: entry.vatAmount,
        hsnSacCode: entry.hsnSacCode,
        partyGstin: entry.partyGstin,
        isInterState: entry.isInterState,
        tags: [], // Initialize tags or allow AI to suggest later
      }));
      await addJournalEntries(currentCompanyId, entriesToSave);
      toast({ title: "Entries Saved!", description: "The extracted accounting entries have been recorded." });
      setExtractedData(null);
      setCurrentFile(null);
    } catch (e: any)      {
      console.error("[UploadDocumentPage] Error saving entries:", e);
      let savingErrorMessage = "Could not save the entries. Please try again.";
      if (e instanceof Error && e.message) {
        savingErrorMessage = `Saving Error: ${e.message.substring(0,100)}${e.message.length > 100 ? '...' : ''}`;
      } else if (typeof e === 'string' && e) {
        savingErrorMessage = `Saving Error: ${e.substring(0,100)}${e.length > 100 ? '...' : ''}`;
      }
      toast({ variant: "destructive", title: "Saving Error", description: savingErrorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isProcessingAi || isSaving;

  const formatCurrencyDisplay = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' });
  };

  if (!currentCompanyId && !isLoading) {
     return (
      <div>
        <PageTitle
          title="Upload Document"
          description="Upload your receipts, bills, or invoices. Our AI will extract the accounting data."
        />
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Company ID Missing</AlertTitle>
            <AlertDescription>
              Please ensure a Company ID is selected/entered on the main login page to upload documents.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        title={`Upload Document ${currentCompanyId ? `(${currentCompanyId})` : ''}`}
        description="Upload receipts, bills, or invoices. Our AI will extract accounting data, including GST details."
      />
      <div className="max-w-2xl mx-auto space-y-6">
        <FileUploader onFileUpload={handleFileUpload} isProcessing={isProcessingAi} />

        {isProcessingAi && (
          <div className="flex items-center justify-center text-muted-foreground p-4 border rounded-md bg-card">
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
                    <p className="font-semibold mb-2">Entry #{index + 1}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div><strong>Date:</strong> {entry.date}</div>
                      <div><strong>Total Amount:</strong> {formatCurrencyDisplay(entry.amount)}</div>
                      <div><strong>Debit:</strong> {entry.debitAccount}</div>
                      <div><strong>Credit:</strong> {entry.creditAccount}</div>
                      <div className="md:col-span-2"><strong>Description:</strong> {entry.description}</div>
                    </div>
                     {(entry.gstType && entry.gstType !== 'none') && (
                        <div className="mt-2 pt-2 border-t border-border/30 text-sm">
                          <p className="font-medium mb-1 flex items-center text-xs"><Info className="h-3 w-3 mr-1 text-primary"/>Tax Details:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-px">
                            <div><strong>Taxable:</strong> {formatCurrencyDisplay(entry.taxableAmount)}</div>
                            <div><strong>GST Type:</strong> <span className="uppercase">{entry.gstType}</span></div>
                            <div><strong>GST Rate:</strong> {entry.gstRate ? `${entry.gstRate}%` : 'N/A'}</div>
                            {entry.gstType === 'igst' && <div><strong>IGST:</strong> {formatCurrencyDisplay(entry.igstAmount)}</div>}
                            {entry.gstType === 'cgst-sgst' && (
                              <>
                                <div><strong>CGST:</strong> {formatCurrencyDisplay(entry.cgstAmount)}</div>
                                <div><strong>SGST:</strong> {formatCurrencyDisplay(entry.sgstAmount)}</div>
                              </>
                            )}
                            {entry.gstType === 'vat' && <div><strong>VAT:</strong> {formatCurrencyDisplay(entry.vatAmount)}</div>}
                            <div><strong>HSN/SAC:</strong> {entry.hsnSacCode || 'N/A'}</div>
                            <div><strong>Party GSTIN:</strong> {entry.partyGstin || 'N/A'}</div>
                             {entry.gstType !== 'vat' && entry.gstType !== 'none' && (
                                <div><strong>Inter-State:</strong> {entry.isInterState === undefined ? 'N/A' : entry.isInterState ? 'Yes' : 'No'}</div>
                            )}
                          </div>
                        </div>
                      )}
                  </Card>
                ))
              )}
            </CardContent>
            {extractedData.entries.length > 0 && (
              <CardFooter>
                <Button onClick={handleConfirmEntries} className="w-full" disabled={isSaving || !currentCompanyId}>
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
