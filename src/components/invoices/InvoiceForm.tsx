
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { useState, useEffect, useMemo } from "react";
import { Loader2, Wand2, Save, FileText, AlertCircle, CalendarIcon as Calendar, Edit, PlusCircle, Trash2 } from "lucide-react";
import { generateInvoiceDetails, type GenerateInvoiceDetailsOutput } from '@/ai/flows/generate-invoice-details';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addInvoice, updateInvoice, type NewInvoiceData, type UpdateInvoiceData, type InvoiceLineItem, type Invoice } from "@/lib/data-service";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const lineItemFormSchema = z.object({
  description: z.string().min(1, "Item description is required.").default(""),
  quantity: z.coerce.number().min(0.000001, "Quantity must be > 0.").default(1),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative.").default(0),
  amount: z.coerce.number().min(0, "Amount cannot be negative.").optional(),
  hsnSacCode: z.string().optional().default(""),
  gstRate: z.coerce.number().min(0).max(100).optional(),
});

const invoiceFormSchema = z.object({
  invoiceDescription: z.string().optional().default(""),
  invoiceNumber: z.string().min(1, { message: "Invoice number is required." }),

  customerName: z.string().min(1, { message: "Customer name is required." }),
  customerEmail: z.string().email({ message: "Invalid email address."}).optional().or(z.literal('')).default(""),
  billingAddress: z.string().optional().default(""),
  shippingAddress: z.string().optional().default(""),
  customerGstin: z.string().optional().refine(val => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val), {
    message: "Invalid GSTIN format.",
  }).default(""),

  invoiceDate: z.date({ required_error: "Invoice date is required."}),
  dueDate: z.date().optional(),
  paymentTerms: z.string().optional().default(""),

  itemsSummary: z.string().optional().default(""),
  lineItems: z.array(lineItemFormSchema).optional().default([]),

  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'void']).default('draft'),
  notes: z.string().optional().default(""),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  mode?: 'create' | 'edit';
  initialInvoiceData?: Invoice | null;
}

const defaultFormValues: InvoiceFormValues = {
  invoiceDescription: "",
  invoiceNumber: "",
  customerName: "",
  customerEmail: "",
  billingAddress: "",
  shippingAddress: "",
  customerGstin: "",
  invoiceDate: new Date(),
  dueDate: undefined,
  paymentTerms: "",
  itemsSummary: "",
  lineItems: [],
  status: 'draft',
  notes: "",
};

export function InvoiceForm({ mode = 'create', initialInvoiceData }: InvoiceFormProps) {
  const { user: currentUser, currentCompanyId } = useAuth(); // Get currentUser
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
    defaultValues: initialInvoiceData
      ? {
          invoiceDescription: initialInvoiceData.itemsSummary || initialInvoiceData.lineItems?.map(li => `${li.description} (Qty: ${li.quantity || 1}, Rate: ${li.unitPrice || 0})`).join('\n') || "",
          invoiceNumber: initialInvoiceData.invoiceNumber || "",
          customerName: initialInvoiceData.customerName || "",
          customerEmail: initialInvoiceData.customerEmail || "",
          billingAddress: initialInvoiceData.billingAddress || "",
          shippingAddress: initialInvoiceData.shippingAddress || "",
          customerGstin: initialInvoiceData.customerGstin || "",
          invoiceDate: initialInvoiceData.invoiceDate ? parseISO(initialInvoiceData.invoiceDate) : new Date(),
          dueDate: initialInvoiceData.dueDate ? parseISO(initialInvoiceData.dueDate) : undefined,
          paymentTerms: initialInvoiceData.paymentTerms || "",
          itemsSummary: initialInvoiceData.itemsSummary || "",
          lineItems: (initialInvoiceData.lineItems?.map(item => ({
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            amount: item.amount || 0, 
            hsnSacCode: item.hsnSacCode || "",
            gstRate: item.gstRate === undefined ? undefined : Number(item.gstRate),
          }))) || [],
          status: initialInvoiceData.status || 'draft',
          notes: initialInvoiceData.notes || "",
        }
      : defaultFormValues,
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  useEffect(() => {
    if (mode === 'edit' && initialInvoiceData) {
      const resetData = {
        invoiceDescription: initialInvoiceData.itemsSummary || initialInvoiceData.lineItems?.map(li => `${li.description} (Qty: ${li.quantity || 1}, Rate: ${li.unitPrice || 0})`).join('\n') || "",
        invoiceNumber: initialInvoiceData.invoiceNumber || "",
        customerName: initialInvoiceData.customerName || "",
        customerEmail: initialInvoiceData.customerEmail || "",
        billingAddress: initialInvoiceData.billingAddress || "",
        shippingAddress: initialInvoiceData.shippingAddress || "",
        customerGstin: initialInvoiceData.customerGstin || "",
        invoiceDate: initialInvoiceData.invoiceDate ? parseISO(initialInvoiceData.invoiceDate) : new Date(),
        dueDate: initialInvoiceData.dueDate ? parseISO(initialInvoiceData.dueDate) : undefined,
        paymentTerms: initialInvoiceData.paymentTerms || "",
        itemsSummary: initialInvoiceData.itemsSummary || "",
        lineItems: (initialInvoiceData.lineItems?.map(item => ({
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            amount: item.amount || 0,
            hsnSacCode: item.hsnSacCode || "",
            gstRate: item.gstRate === undefined ? undefined : Number(item.gstRate),
        }))) || [],
        status: initialInvoiceData.status || 'draft',
        notes: initialInvoiceData.notes || "",
      };
      form.reset(resetData);
    } else if (mode === 'create') {
       form.reset(defaultFormValues);
    }
  }, [mode, initialInvoiceData, form]); 


  const watchedLineItems = form.watch("lineItems");
  const totals = useMemo(() => {
    let subTotal = 0;
    let totalGst = 0;
    if (watchedLineItems) {
      watchedLineItems.forEach(item => {
        const taxableAmount = (item.quantity || 1) * (item.unitPrice || 0);
        subTotal += taxableAmount;
        if (item.gstRate) {
          totalGst += taxableAmount * (item.gstRate / 100);
        }
      });
    }
    return {
      subTotal: parseFloat(subTotal.toFixed(2)),
      totalGst: parseFloat(totalGst.toFixed(2)),
      grandTotal: parseFloat((subTotal + totalGst).toFixed(2)),
    };
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

      form.setValue("customerName", result.customerName || form.getValues("customerName") || "", { shouldValidate: true });
      form.setValue("customerEmail", result.customerEmail || form.getValues("customerEmail") || "", { shouldValidate: true });
      form.setValue("billingAddress", result.billingAddress || form.getValues("billingAddress") || "", { shouldValidate: true });
      form.setValue("shippingAddress", result.shippingAddress || form.getValues("shippingAddress") || "", { shouldValidate: true });
      
      if (mode === 'create') { 
        form.setValue("invoiceNumber", result.invoiceNumber || "", { shouldValidate: true });
      }

      form.setValue("paymentTerms", result.paymentTerms || form.getValues("paymentTerms") || "", { shouldValidate: true });
      form.setValue("notes", result.notes || form.getValues("notes") || "", { shouldValidate: true });


      if (result.lineItems && result.lineItems.length > 0) {
        const aiLineItems = result.lineItems.map(li => ({
          description: li.description || "",
          quantity: li.quantity || 1,
          unitPrice: li.unitPrice || 0,
          amount: parseFloat(((li.quantity || 1) * (li.unitPrice || 0)).toFixed(2)),
          hsnSacCode: li.hsnSacCode || "",
          gstRate: li.gstRate,
        }));
        form.setValue("lineItems", aiLineItems , { shouldValidate: true });
        form.setValue("itemsSummary", "");
      } else if (result.itemsSummary) {
        form.setValue("itemsSummary", result.itemsSummary || "");
        form.setValue("lineItems", []);
      }

      const todayForForm = new Date();
      todayForForm.setHours(0,0,0,0);

      if (result.invoiceDate) {
        try {
            const parsedDate = parseISO(result.invoiceDate);
            if (!isNaN(parsedDate.getTime())) {
                 form.setValue("invoiceDate", parsedDate, { shouldValidate: true });
            } else {
                form.setValue("invoiceDate", form.getValues("invoiceDate") || todayForForm, { shouldValidate: true });
            }
        } catch (e) {
            form.setValue("invoiceDate", form.getValues("invoiceDate") || todayForForm, { shouldValidate: true });
        }
      } else if (mode === 'create'){ 
        form.setValue("invoiceDate", todayForForm, { shouldValidate: true });
      }

      if (result.dueDate) {
         try {
            const parsedDueDate = parseISO(result.dueDate);
            if (!isNaN(parsedDueDate.getTime())) {
                form.setValue("dueDate", parsedDueDate, { shouldValidate: true });
            } else {
                form.setValue("dueDate", form.getValues("dueDate") || undefined);
            }
        } catch (e) {
            form.setValue("dueDate", form.getValues("dueDate") || undefined);
        }
      } else {
        form.setValue("dueDate", form.getValues("dueDate") || undefined);
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
    if (!currentCompanyId || !currentUser?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Company ID or User ID missing. Cannot save invoice." });
      return;
    }
    setIsSaving(true);

    const processedLineItems = values.lineItems?.map(item => {
      const taxableAmount = parseFloat(((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2));
      return {
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        amount: taxableAmount,
        hsnSacCode: item.hsnSacCode || undefined,
        gstRate: item.gstRate === undefined ? undefined : Number(item.gstRate),
      };
    }) || [];

    let currentSubTotal = 0;
    let currentTotalGstAmount = 0;
    processedLineItems.forEach(item => {
      currentSubTotal += item.amount;
      if (item.gstRate) {
        currentTotalGstAmount += item.amount * (Number(item.gstRate) / 100);
      }
    });
    currentSubTotal = parseFloat(currentSubTotal.toFixed(2));
    currentTotalGstAmount = parseFloat(currentTotalGstAmount.toFixed(2));
    const currentTotalAmount = parseFloat((currentSubTotal + currentTotalGstAmount).toFixed(2));

    if (processedLineItems.length === 0 && !values.itemsSummary) {
        toast({variant: "destructive", title: "Missing Items", description: "Please add line items or provide an items summary."});
        setIsSaving(false);
        return;
    }

    try {
      const invoiceData: Omit<NewInvoiceData, 'creatorUserId'> | Omit<UpdateInvoiceData, 'creatorUserId'> = {
        invoiceNumber: values.invoiceNumber,
        customerName: values.customerName,
        customerEmail: values.customerEmail || undefined,
        billingAddress: values.billingAddress || undefined,
        shippingAddress: values.shippingAddress || undefined,
        customerGstin: values.customerGstin || undefined,
        invoiceDate: format(values.invoiceDate, "yyyy-MM-dd"),
        dueDate: values.dueDate ? format(values.dueDate, "yyyy-MM-dd") : undefined,
        paymentTerms: values.paymentTerms || undefined,
        lineItems: processedLineItems.length > 0 ? processedLineItems : undefined,
        itemsSummary: processedLineItems.length === 0 ? (values.itemsSummary || undefined) : undefined,
        subTotal: currentSubTotal,
        totalGstAmount: currentTotalGstAmount,
        totalAmount: currentTotalAmount,
        status: values.status || 'draft',
        notes: values.notes || undefined,
      };

      if (mode === 'create') {
        await addInvoice(currentCompanyId, currentUser.uid, invoiceData as NewInvoiceData);
        toast({ title: "Invoice Saved!", description: `Invoice #${values.invoiceNumber} has been saved.` });
      } else if (mode === 'edit' && initialInvoiceData?.id) {
        await updateInvoice(currentCompanyId, initialInvoiceData.id, currentUser.uid, invoiceData as UpdateInvoiceData);
        toast({ title: "Invoice Updated!", description: `Invoice #${values.invoiceNumber} has been updated.` });
      }

      form.reset(defaultFormValues);
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
        <CardTitle className="text-2xl">{mode === 'create' ? 'New Invoice' : `Edit Invoice ${initialInvoiceData?.invoiceNumber || ''}`} ({currentCompanyId})</CardTitle>
        <CardDescription>
          {mode === 'create'
            ? "Describe the invoice for AI to parse, or fill in the details manually."
            : "Edit the invoice details below. You can also update the description and re-parse with AI."
          }
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            
            <>
              <FormField
                control={form.control}
                name="invoiceDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe Invoice for AI (Populates fields below)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'Invoice Tech Solutions Inc. for 20 hours of software development at 75 USD/hr and 2 server licenses at 100 USD each, due in 15 days. Project: Alpha Site Rebuild. Email: contact@techsolutions.com. Bill to: 123 Main St, Anytown. Ship to: 789 Tech Park, Future City.'"
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
            </>

            {aiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>AI Parsing Issue</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
              </Alert>
            )}

            <h3 className="text-lg font-semibold pt-4 border-t mt-4">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl><Input placeholder="e.g., INV-2024-001" {...field} disabled={isLoading || (mode === 'edit' && !!initialInvoiceData?.invoiceNumber)} /></FormControl>
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
                 <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="void">Void</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <h3 className="text-lg font-semibold pt-4 border-t mt-4">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl><Input placeholder="Client Company Name" {...field} value={field.value ?? ""} disabled={isLoading} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Customer Email (Optional)</FormLabel>
                        <FormControl><Input type="email" placeholder="client@example.com" {...field} value={field.value ?? ""} disabled={isLoading} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="customerGstin"
                    render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Customer GSTIN (Optional)</FormLabel>
                        <FormControl><Input placeholder="Customer's GSTIN" {...field} value={field.value ?? ""} disabled={isLoading} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="billingAddress"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Billing Address (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="123 Main St, Anytown, USA" {...field} value={field.value ?? ""} disabled={isLoading} rows={3} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="shippingAddress"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Shipping Address (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="456 Oak Ave, Otherville, USA (If different)" {...field} value={field.value ?? ""} disabled={isLoading} rows={3} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            
            <h3 className="text-lg font-semibold pt-4 border-t mt-4">Items & Services</h3>
            <div className="space-y-3">
              {fields.map((item, index) => (
                <Card key={item.id} className="p-4 bg-muted/30 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-4"> 
                          <FormLabel className="text-xs">Description</FormLabel>
                          <FormControl><Input placeholder="Item or service description" {...field} value={field.value ?? ""} disabled={isLoading} /></FormControl>
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
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1" 
                              {...field} 
                              value={Number.isNaN(parseFloat(String(field.value))) ? '' : field.value ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? undefined : parseFloat(val));
                              }}
                              step="any" 
                              disabled={isLoading} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Unit Price (Pre-tax)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              {...field} 
                              value={Number.isNaN(parseFloat(String(field.value))) ? '' : field.value ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? undefined : parseFloat(val));
                              }}
                              step="any" 
                              disabled={isLoading} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                        control={form.control}
                        name={`lineItems.${index}.hsnSacCode`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs">HSN/SAC</FormLabel>
                            <FormControl><Input placeholder="HSN/SAC" {...field} value={field.value ?? ""} disabled={isLoading} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name={`lineItems.${index}.gstRate`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs">GST Rate %</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="e.g., 18" 
                                {...field} 
                                value={Number.isNaN(parseFloat(String(field.value))) ? '' : field.value ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? undefined : parseFloat(val));
                                }}
                                step="any" 
                                disabled={isLoading} 
                              />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 absolute top-2 right-2 h-7 w-7" disabled={isLoading} title="Remove Item">
                      <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0, amount: 0, hsnSacCode: "", gstRate: undefined })}
                disabled={isLoading}
                className="mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
              </Button>
               {fields.length === 0 && (
                  <FormField
                    control={form.control}
                    name="itemsSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Items/Services Summary (Use if not adding detailed line items)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Consulting services for Q3, Sale of 10 widgets" {...field} value={field.value ?? ""} disabled={isLoading} className="min-h-[60px]"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}
            </div>


            
            <div className="pt-6 border-t mt-6 space-y-2">
                <h3 className="text-md font-semibold">Invoice Totals</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Subtotal (Pre-tax):</span>
                    <span className="text-right font-medium">{totals.subTotal.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}</span>

                    <span className="text-muted-foreground">Total GST:</span>
                    <span className="text-right font-medium">{totals.totalGst.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}</span>

                    <span className="text-foreground font-bold text-base pt-1 border-t mt-1">Grand Total:</span>
                    <span className="text-right font-bold text-base pt-1 border-t mt-1">{totals.grandTotal.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' })}</span>
                </div>
            </div>

            <h3 className="text-lg font-semibold pt-4 border-t mt-4">Terms & Notes</h3>
             <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="e.g., Net 30 days, Due upon receipt" {...field} value={field.value ?? ""} disabled={isLoading} rows={2}/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes for the customer, bank details, etc." {...field} value={field.value ?? ""} disabled={isLoading} rows={3}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || !currentCompanyId}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {mode === 'create' ? 'Save Invoice' : 'Update Invoice'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
