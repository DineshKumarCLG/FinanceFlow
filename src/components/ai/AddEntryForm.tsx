
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { Loader2, Mic, Send, CornerDownLeft, FileText, AlertCircle } from "lucide-react";
import { parseAccountingEntry, type ParseAccountingEntryOutput } from "@/ai/flows/parse-accounting-entry";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addJournalEntry } from "@/lib/data-service";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

const formSchema = z.object({
  entryText: z.string().min(5, { message: "Please describe the transaction in a few words." }),
});

export function AddEntryForm() {
  const { currentCompanyId } = useAuth(); // Get currentCompanyId
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParseAccountingEntryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [clientLocale, setClientLocale] = useState('en-US');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryText: "",
    },
  });
  
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          form.setValue("entryText", transcript);
          setIsListening(false);
        };
        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          toast({ variant: "destructive", title: "Voice Error", description: "Could not recognize speech. Please try again or type your entry." });
          setIsListening(false);
        };
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [form, toast]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({ variant: "destructive", title: "Voice Input Not Supported", description: "Your browser does not support voice input." });
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "No Company ID selected. Cannot parse entry." });
      setError("No Company ID selected. Please ensure you are logged in with a company.");
      return;
    }
    setIsLoading(true);
    setParsedResult(null);
    setError(null);
    try {
      const result = await parseAccountingEntry({ entryText: values.entryText });
      setParsedResult(result);
      toast({ title: "Entry Parsed", description: "Review the details below and confirm." });
    } catch (e: any) {
      setError("Failed to parse entry. Please try rephrasing or check your input.");
      toast({ variant: "destructive", title: "Parsing Error", description: e.message || "An unknown error occurred." });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleConfirmEntry = async () => {
    if (!parsedResult || !currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "Missing parsed data or Company ID. Cannot save entry." });
      return;
    }
    
    setIsLoading(true);
    try {
      const entryToSave = {
        date: parsedResult.date,
        description: `${parsedResult.purpose} - ${parsedResult.description}`,
        debitAccount: parsedResult.debitAccount,
        creditAccount: parsedResult.creditAccount,
        amount: parsedResult.amount,
      };
      await addJournalEntry(currentCompanyId, entryToSave); // Pass companyId
      toast({ title: "Entry Saved!", description: "The accounting entry has been successfully recorded." });
      setParsedResult(null);
      form.reset();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Saving Error", description: "Could not save the entry." });
      console.error("Saving error:", e);
    } finally {
      setIsLoading(false);
    }
  }

  if (!currentCompanyId) {
    return (
      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Accounting Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Company ID Missing</AlertTitle>
            <AlertDescription>
              Please ensure a Company ID is selected/entered on the main login page to add entries.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Add New Accounting Entry ({currentCompanyId})</CardTitle>
        <CardDescription>Describe your transaction using text or voice. Our AI will parse it for you.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="entryText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Paid ₹2000 for office supplies on July 15th' or 'Received ₹10000 from Client X for project completion'"
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isLoading || !currentCompanyId} className="flex-grow">
                {isLoading && !parsedResult ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Parse Entry with AI
              </Button>
              {recognitionRef.current && (
                <Button type="button" variant="outline" onClick={handleVoiceInput} disabled={isLoading || !currentCompanyId}>
                  <Mic className={isListening ? "mr-2 h-4 w-4 text-destructive animate-pulse" : "mr-2 h-4 w-4"} />
                  {isListening ? "Listening..." : "Use Voice"}
                </Button>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {parsedResult && !error && (
              <Card className="bg-secondary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary"/> Parsed Entry Details</CardTitle>
                  <CardDescription>Please review the AI-generated entry and confirm.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><strong>Date:</strong> {parsedResult.date}</div>
                    <div><strong>Amount:</strong> {parsedResult.amount.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}</div>
                    <div><strong>Type:</strong> <span className="capitalize">{parsedResult.type}</span></div>
                    <div><strong>Purpose:</strong> {parsedResult.purpose}</div>
                    <div><strong>Debit Account:</strong> {parsedResult.debitAccount}</div>
                    <div><strong>Credit Account:</strong> {parsedResult.creditAccount}</div>
                  </div>
                  <div><strong>Description:</strong> {parsedResult.description}</div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleConfirmEntry} className="w-full" disabled={isLoading || !currentCompanyId}>
                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CornerDownLeft className="mr-2 h-4 w-4" />}
                    Confirm and Save Entry
                  </Button>
                </CardFooter>
              </Card>
            )}
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
