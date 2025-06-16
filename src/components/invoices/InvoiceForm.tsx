
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Loader2, Wand2, Save, FileText, AlertCircle, CalendarIcon as Calendar } from "lucide-react";
import { generateInvoiceDetails, type GenerateInvoiceDetailsOutput } from '@/ai/flows/generate-invoice-details';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addInvoice, type NewInvoiceData, type InvoiceLineItem } from "@/lib/data-service";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; 
import { useRouter } from 'next/navigation';

const lineItemFormSchema = z.object({
  description: z.string().min(1, "Item description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be > 0").optional().default(1),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative").optional().default(0),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  hsnSacCode: z.string().optional(),
  gstRate: z.coerce.number().optional(),
});

const invoiceFormSchema = z.object({
  invoiceDescription: z.string().optional(), 
  invoiceNumber: z.string().min(1, { message: "Invoice number is required." }),
  customerName: z.string().min(1, { message: "Customer name is required." }),
  totalAmount: z.coerce.number().min(0.01, { message: "Total amount must be greater than 0." }),
  invoiceDate: z.date({ required_error: "Invoice date is required."}),
  dueDate: z.date().optional(),
  itemsSummary: z.string().optional(),
  lineItems: z.array(lineItemFormSchema).optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function InvoiceForm() {
  const { currentCompanyId } = useAuth();
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceDescription: "",
      invoiceNumber: "",
      customerName: "",
      totalAmount: 0,
      invoiceDate: new Date(),
      itemsSummary: "",
      lineItems: [],
    },
  });

  const handleAiParse = async () => {
    const description = form.getValues("invoiceDescription");
    if (!description || description.trim().length < 10) {
      toast({ variant: "destructive", title: "Input too short", description: "Please provide a more detailed description for AI parsing." });
      return;
    }
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "No Company ID selected." });
      return;
    }

    setIsParsing(true);
    setAiError(null);
    try {
      const result: GenerateInvoiceDetailsOutput = await generateInvoiceDetails({ description });
      
      if (result.customerName) form.setValue("customerName", result.customerName, { shouldValidate: true });
      if (result.totalAmount) form.setValue("totalAmount", result.totalAmount, { shouldValidate: true });
      
      if (result.lineItems && result.lineItems.length > 0) {
        form.setValue("lineItems", result.lineItems as InvoiceLineItem[] , { shouldValidate: true });
        // If line items are extracted, itemsSummary might become redundant or a high-level title
        // For now, we'll clear itemsSummary if line items are present to avoid confusion
        form.setValue("itemsSummary", ""); 
      } else if (result.itemsSummary) {
        form.setValue("itemsSummary", result.itemsSummary);
        form.setValue("lineItems", []); // Ensure lineItems is cleared if only summary is present
      }
      
      if (result.invoiceDate) {
        try {
            const parsedDate = new Date(result.invoiceDate + "T00:00:00"); 
            if (!isNaN(parsedDate.getTime())) {
                 form.setValue("invoiceDate", parsedDate, { shouldValidate: true });
            } else {
                form.setValue("invoiceDate", new Date(), { shouldValidate: true }); 
            }
        } catch (e) {
            form.setValue("invoiceDate", new Date(), { shouldValidate: true });
        }
      } else {
        form.setValue("invoiceDate", new Date(), { shouldValidate: true });
      }

      if (result.dueDate) {
         try {
            const parsedDueDate = new Date(result.dueDate + "T00:00:00");
            if (!isNaN(parsedDueDate.getTime())) {
                form.setValue("dueDate", parsedDueDate, { shouldValidate: true });
            } else {
                form.setValue("dueDate", undefined);
            }
        } catch (e) {
            form.setValue("dueDate", undefined);
        }
      } else {
        form.setValue("dueDate", undefined);
      }

      toast({ title: "AI Parsing Complete", description: "Review the extracted details and fill in the rest." });
    } catch (e: any) {
      setAiError("AI failed to parse the description. Please try rephrasing or fill manually.");
      toast({ variant: "destructive", title: "AI Parsing Error", description: e.message || "Unknown AI error." });
    } finally {
      setIsParsing(false);
    }
  };

  async function onSubmit(values: InvoiceFormValues) {
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "No Company ID selected. Cannot save invoice." });
      return;
    }
    setIsSaving(true);

    let subTotal = 0;
    let totalGst = 0;
    let finalTotalAmount = 0;

    const processedLineItems = values.lineItems?.map(item => {
      const itemAmount = (item.quantity || 1) * (item.unitPrice || 0);
      const itemGstAmount = item.gstRate ? itemAmount * (item.gstRate / 100) : 0;
      subTotal += itemAmount;
      totalGst += itemGstAmount;
      return { ...item, amount: itemAmount, gstAmount: itemGstAmount };
    });

    if (processedLineItems && processedLineItems.length > 0) {
      finalTotalAmount = subTotal + totalGst;
    } else {
      // If no line items, use the top-level totalAmount, assume it's inclusive of tax for now
      // Or, if itemsSummary is used, subTotal might be derived from totalAmount if GST isn't specified
      subTotal = values.totalAmount; // Simplification: treat totalAmount as subTotal if no lines
      totalGst = 0; // Cannot determine GST without more info or line items
      finalTotalAmount = values.totalAmount;
    }


    try {
      const newInvoice: NewInvoiceData = {
        invoiceNumber: values.invoiceNumber,
        customerName: values.customerName,
        invoiceDate: format(values.invoiceDate, "yyyy-MM-dd"),
        dueDate: values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : undefined,
        lineItems: processedLineItems,
        itemsSummary: (processedLineItems && processedLineItems.length > 0) ? undefined : values.itemsSummary,
        subTotal: subTotal, 
        totalGstAmount: totalGst, 
        totalAmount: finalTotalAmount,
        status: 'draft',
        notes: "", 
      };
      await addInvoice(currentCompanyId, newInvoice);
      toast({ title: "Invoice Saved!", description: `Invoice #${values.invoiceNumber} has been saved as a draft.` });
      form.reset();
      router.push('/invoices'); 
    } catch (e: any) {
      toast({ variant: "destructive", title: "Saving Error", description: e.message || "Could not save the invoice." });
    } finally {
      setIsSaving(false);
    }
  }
  
  const isLoading = isParsing || isSaving;

  if (!currentCompanyId) {
    return (
      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Company ID Missing</AlertTitle>
            <AlertDescription>
              Please select or enter a Company ID on the main login page to create invoices.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">New Invoice ({currentCompanyId})</CardTitle>
        <CardDescription>Describe the invoice for AI to parse, or fill in the details manually. AI can now attempt to extract line items.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="invoiceDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe Invoice for AI (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Invoice Tech Solutions Inc. for 20 hours of software development at 75 USD/hr and 2 server licenses at 100 USD each, due in 15 days. Project: Alpha Site Rebuild.'"
                      className="min-h-[80px] resize-none"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" onClick={handleAiParse} disabled={isLoading || !form.getValues("invoiceDescription")} variant="outline" className="w-full sm:w-auto">
              {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Details with AI
            </Button>

            {aiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>AI Parsing Issue</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t mt-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl><Input placeholder="INV-001" {...field} disabled={isLoading} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl><Input placeholder="Client Company Name" {...field} disabled={isLoading} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Invoice Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            disabled={isLoading}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isLoading}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date (Optional)</FormLabel>
                     <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            disabled={isLoading}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                           disabled={(date) => date < (form.getValues("invoiceDate") || new Date("1900-01-01")) || isLoading}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Total Amount (Calculated if line items present, otherwise pre-tax)</FormLabel>
                    <FormControl><Input type="number" placeholder="0.00" {...field} disabled={isLoading || (form.getValues("lineItems") && form.getValues("lineItems")!.length > 0) } /></FormControl>
                    <FormMessage />
                    { (form.getValues("lineItems") && form.getValues("lineItems")!.length > 0) && <p className="text-xs text-muted-foreground">Calculated from line items.</p>}
                  </FormItem>
                )}
              />
              
              {/* Display Line Items if AI extracted them (read-only for now) */}
              {form.watch("lineItems") && form.watch("lineItems")!.length > 0 && (
                <div className="md:col-span-2 space-y-2">
                  <FormLabel>Line Items (Extracted by AI)</FormLabel>
                  <Card className="p-2 bg-muted/50">
                    <CardContent className="p-0 space-y-1 text-xs">
                      {form.watch("lineItems")!.map((item, index) => (
                        <div key={index} className="p-1.5 border-b last:border-b-0">
                          <p><strong>{item.description}</strong></p>
                          <p>Qty: {item.quantity || 1}, Rate: {item.unitPrice || item.amount}, Amount: {item.amount}</p>
                          {item.hsnSacCode && <p>HSN/SAC: {item.hsnSacCode}</p>}
                          {item.gstRate && <p>GST: {item.gstRate}%</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Fallback to Items Summary if no line items or AI couldn't extract them */}
              {!(form.watch("lineItems") && form.watch("lineItems")!.length > 0) && (
                 <FormField
                    control={form.control}
                    name="itemsSummary"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Items/Services Summary (if no line items)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Software development services, 5 Widgets" {...field} disabled={isLoading} className="min-h-[60px]"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !currentCompanyId}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Invoice as Draft
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
