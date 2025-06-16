
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Loader2, Wand2, Save, FileText, AlertCircle, CalendarIcon as Calendar, Edit, PlusCircle, Trash2 } from "lucide-react";
import { generateInvoiceDetails, type GenerateInvoiceDetailsOutput } from '@/ai/flows/generate-invoice-details';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addInvoice, updateInvoice, type NewInvoiceData, type UpdateInvoiceData, type InvoiceLineItem, type Invoice } from "@/lib/data-service";
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
  amount: z.coerce.number().min(0, "Amount cannot be negative").optional(), // Made optional, will calculate
  hsnSacCode: z.string().optional(),
  gstRate: z.coerce.number().optional(),
});

const invoiceFormSchema = z.object({
  invoiceDescription: z.string().optional(), 
  invoiceNumber: z.string().min(1, { message: "Invoice number is required." }),
  customerName: z.string().min(1, { message: "Customer name is required." }),
  // totalAmount field is removed as it will be derived from line items or itemsSummary.
  invoiceDate: z.date({ required_error: "Invoice date is required."}),
  dueDate: z.date().optional(),
  itemsSummary: z.string().optional(),
  lineItems: z.array(lineItemFormSchema).optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).default('draft'), // Added status
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  mode: 'create' | 'edit';
  initialInvoiceData?: Invoice | null; // For edit mode
}

export function InvoiceForm({ mode, initialInvoiceData }: InvoiceFormProps) {
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
      invoiceDate: new Date(),
      itemsSummary: "",
      lineItems: [],
      status: 'draft',
      notes: "",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Populate form if in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialInvoiceData) {
      form.reset({
        invoiceDescription: initialInvoiceData.itemsSummary || initialInvoiceData.lineItems?.map(li => `${li.description} (Qty: ${li.quantity}, Rate: ${li.unitPrice})`).join('\n') || "",
        invoiceNumber: initialInvoiceData.invoiceNumber,
        customerName: initialInvoiceData.customerName,
        invoiceDate: new Date(initialInvoiceData.invoiceDate + 'T00:00:00'), // Ensure proper date parsing
        dueDate: initialInvoiceData.dueDate ? new Date(initialInvoiceData.dueDate + 'T00:00:00') : undefined,
        itemsSummary: initialInvoiceData.itemsSummary,
        lineItems: initialInvoiceData.lineItems?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount, // Keep original amount for display, will re-calc on save
            hsnSacCode: item.hsnSacCode,
            gstRate: item.gstRate,
        })) || [],
        status: initialInvoiceData.status,
        notes: initialInvoiceData.notes,
      });
    } else {
      form.reset(); // Reset for create mode
    }
  }, [mode, initialInvoiceData, form]);


  // Calculate total amount for display based on line items
  const watchedLineItems = form.watch("lineItems");
  const calculatedTotalAmount = useMemo(() => {
    if (!watchedLineItems || watchedLineItems.length === 0) return 0;
    return watchedLineItems.reduce((sum, item) => {
      const itemAmount = (item.quantity || 1) * (item.unitPrice || 0);
      const itemGst = item.gstRate ? itemAmount * (item.gstRate / 100) : 0;
      return sum + itemAmount + itemGst;
    }, 0);
  }, [watchedLineItems]);


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
      
      if (result.lineItems && result.lineItems.length > 0) {
        const aiLineItems = result.lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity || 1,
          unitPrice: li.unitPrice || 0,
          amount: li.amount || ((li.quantity || 1) * (li.unitPrice || 0)), // Ensure amount is calculated
          hsnSacCode: li.hsnSacCode,
          gstRate: li.gstRate,
        }));
        form.setValue("lineItems", aiLineItems , { shouldValidate: true });
        form.setValue("itemsSummary", ""); 
      } else if (result.itemsSummary) {
        form.setValue("itemsSummary", result.itemsSummary);
        form.setValue("lineItems", []);
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
      return { ...item, amount: itemAmount, gstAmount: itemGstAmount }; // Ensure amount and gstAmount are part of the item
    });

    finalTotalAmount = subTotal + totalGst;
    
    if (!processedLineItems || processedLineItems.length === 0) {
        // If no line items, use itemsSummary. Total amount is harder to determine without line item breakdown.
        // We'll take itemsSummary and the AI might have provided a totalAmount, or user needs to input it.
        // For simplicity, if AI gave totalAmount and no line items, we use that.
        // This part might need more robust logic if AI doesn't give totalAmount or if summary is complex.
        // The original totalAmount field was removed from schema, so this needs careful handling.
        // Let's assume if there are no line items, the AI's totalAmount (if parsed) or a manual input is needed.
        // For now, if no line items, totalAmount relies on the sum of line items, which will be 0.
        // This implies line items are somewhat mandatory for accurate totals through this form.
        // Or, we re-introduce a totalAmount field for manual entry when no line items.
        // For this iteration, we'll prioritize line item calculation.
        if (values.itemsSummary && finalTotalAmount === 0) {
            toast({variant: "destructive", title: "Missing Amount", description: "Please add line items or ensure a total amount is calculable."});
            setIsSaving(false);
            return;
        }
    }


    try {
      const invoiceData: NewInvoiceData | UpdateInvoiceData = {
        invoiceNumber: values.invoiceNumber,
        customerName: values.customerName,
        invoiceDate: format(values.invoiceDate, "yyyy-MM-dd"),
        dueDate: values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : undefined,
        lineItems: processedLineItems,
        itemsSummary: (processedLineItems && processedLineItems.length > 0) ? undefined : values.itemsSummary,
        subTotal: subTotal, 
        totalGstAmount: totalGst, 
        totalAmount: finalTotalAmount,
        status: values.status || 'draft',
        notes: values.notes || "", 
      };

      if (mode === 'create') {
        await addInvoice(currentCompanyId, invoiceData as NewInvoiceData);
        toast({ title: "Invoice Saved!", description: `Invoice #${values.invoiceNumber} has been saved as a draft.` });
      } else if (mode === 'edit' && initialInvoiceData?.id) {
        await updateInvoice(currentCompanyId, initialInvoiceData.id, invoiceData as UpdateInvoiceData);
        toast({ title: "Invoice Updated!", description: `Invoice #${values.invoiceNumber} has been updated.` });
      }
      
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
          <CardTitle className="text-2xl">{mode === 'create' ? 'Create Invoice' : 'Edit Invoice'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Company ID Missing</AlertTitle>
            <AlertDescription>
              Please select or enter a Company ID on the main login page to manage invoices.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">{mode === 'create' ? 'New Invoice' : 'Edit Invoice'} ({currentCompanyId})</CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? "Describe the invoice for AI to parse, or fill in the details manually. AI can attempt to extract line items."
            : "Edit the invoice details below. You can also update the description and use AI to re-parse items."
          }
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="invoiceDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe Invoice for AI (Optional - will overwrite existing items if used)</FormLabel>
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
              Parse with AI & Populate Fields
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
            </div>
            
            {/* Line Items Section */}
            <div className="space-y-4 pt-4 border-t mt-4">
              <FormLabel>Line Items</FormLabel>
              {fields.map((item, index) => (
                <Card key={item.id} className="p-3 bg-muted/30 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                          <FormLabel className="text-xs">Description</FormLabel>
                          <FormControl><Input placeholder="Item description" {...field} disabled={isLoading} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Quantity</FormLabel>
                          <FormControl><Input type="number" placeholder="1" {...field} disabled={isLoading} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Unit Price</FormLabel>
                          <FormControl><Input type="number" placeholder="0.00" {...field} disabled={isLoading} onChange={(e) => field.onChange(parseFloat(e.target.value))} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 absolute top-1 right-1 h-6 w-6" disabled={isLoading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                     <FormField
                        control={form.control}
                        name={`lineItems.${index}.hsnSacCode`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs">HSN/SAC (Opt.)</FormLabel>
                            <FormControl><Input placeholder="HSN/SAC" {...field} disabled={isLoading} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name={`lineItems.${index}.gstRate`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs">GST Rate % (Opt.)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 18" {...field} disabled={isLoading} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                   </div>
                </Card>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0, amount: 0 })}
                disabled={isLoading}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
              </Button>
               {fields.length === 0 && (
                  <FormField
                    control={form.control}
                    name="itemsSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Items/Services Summary (if no line items above)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Software development services, 5 Widgets" {...field} disabled={isLoading} className="min-h-[60px]"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}
            </div>


            {/* Total Amount Display */}
            <div className="pt-4 border-t mt-4">
                <FormLabel>Calculated Total Invoice Amount</FormLabel>
                <Input 
                    type="text" 
                    value={calculatedTotalAmount.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })} 
                    readOnly 
                    disabled 
                    className="mt-1 bg-muted/50 font-semibold"
                />
            </div>
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                     <Input placeholder="draft" {...field} disabled={isLoading} />
                     {/* Consider using a Select component here for better UX if more statuses are actively managed by user */}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes for the customer..." {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !currentCompanyId}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {mode === 'create' ? 'Save Invoice as Draft' : 'Update Invoice'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// Helper hook, if needed elsewhere. For now, direct useMemo is fine.
// function useCalculatedTotal(lineItems: InvoiceLineItem[] = [], clientLocale: string = 'en-US') {
//   return useMemo(() => {
//     if (!lineItems || lineItems.length === 0) return 0;
//     const total = lineItems.reduce((sum, item) => {
//       const itemAmount = (item.quantity || 1) * (item.unitPrice || 0);
//       const itemGst = item.gstRate ? itemAmount * (item.gstRate / 100) : 0;
//       return sum + itemAmount + itemGst;
//     }, 0);
//     return total;
//   }, [lineItems, clientLocale]);
// }

// Placeholder for useCalculatedTotal in case it's beneficial
import { useMemo } from "react";


