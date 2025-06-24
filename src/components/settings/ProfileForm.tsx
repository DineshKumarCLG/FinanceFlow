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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import * as DataService from "@/lib/data-service";
import { useCompanyName } from "@/hooks/use-company-name";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email().optional(),
  businessName: z.string().min(2, "Business name must be at least 2 characters.").optional().or(z.literal('')),
  businessType: z.string().optional().or(z.literal('')),
  companyGstin: z.string().optional().refine(val => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val), {
    message: "Invalid GSTIN format (e.g., 29ABCDE1234F1Z5)",
  }).or(z.literal('')),
  gstRegion: z.enum(["india", "international_other", "none"]).optional(),
  companyAddress: z.string().optional().or(z.literal('')),
  companyEmail: z.string().email({ message: "Invalid email address."}).optional().or(z.literal('')),
  companyPhone: z.string().optional().or(z.literal('')),
  currency: z.string().optional().or(z.literal('')),
  bankDetails: z.string().optional().or(z.literal('')),
  authorizedSignatory: z.string().optional().or(z.literal('')),
  registeredAddress: z.string().optional().or(z.literal('')),
  corporateAddress: z.string().optional().or(z.literal('')),
  billingAddress: z.string().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const businessTypes = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "startup", label: "Startup" },
  { value: "freelancer", label: "Freelancer/Independent Contractor"},
  { value: "other", label: "Other" },
];

const gstRegionOptions = [
  { value: "india", label: "India (GST)" },
  { value: "international_other", label: "International (VAT/Other Sales Tax)" },
  { value: "none", label: "None / Not Applicable" },
];

const currencyOptions = [
    { value: "INR", label: "INR - Indian Rupee" },
    { value: "USD", label: "USD - United States Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound Sterling" },
    { value: "JPY", label: "JPY - Japanese Yen" },
    { value: "AUD", label: "AUD - Australian Dollar" },
    { value: "CAD", label: "CAD - Canadian Dollar" },
    { value: "SGD", label: "SGD - Singapore Dollar" },
];


export function ProfileForm() {
  const { currentCompanyId, user, isLoading: authIsLoading } = useAuth();
  const { companyName } = useCompanyName();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingSettings, setIsFetchingSettings] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      businessName: "",
      businessType: "",
      companyGstin: "",
      gstRegion: "none",
      companyAddress: "",
      registeredAddress: "",
      corporateAddress: "",
      billingAddress: "",
      companyEmail: "",
      companyPhone: "",
      currency: "INR",
      bankDetails: "",
      authorizedSignatory: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    async function loadProfileAndSettings() {
      if (user && currentCompanyId) {
        setIsFetchingSettings(true);
        try {
          const companySettings = await DataService.getCompanySettings(currentCompanyId);
          form.reset({
            name: user.displayName || "",
            email: user.email || "",
            businessName: companySettings?.businessName || "",
            businessType: companySettings?.businessType || "",
            companyGstin: companySettings?.companyGstin || "",
            gstRegion: companySettings?.gstRegion || "none",
            companyAddress: companySettings?.companyAddress || "",
            registeredAddress: companySettings?.registeredAddress || "",
            corporateAddress: companySettings?.corporateAddress || "",
            billingAddress: companySettings?.billingAddress || "",
            companyEmail: companySettings?.companyEmail || "",
            companyPhone: companySettings?.companyPhone || "",
            currency: companySettings?.currency || "INR",
            bankDetails: companySettings?.bankDetails || "",
            authorizedSignatory: companySettings?.authorizedSignatory || "",
          });
        } catch (error) {
          console.error("Failed to load company settings:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load company settings." });
          form.reset({
            name: user.displayName || "",
            email: user.email || "",
          });
        } finally {
          setIsFetchingSettings(false);
        }
      } else if (user) { 
        form.reset({
          name: user.displayName || "",
          email: user.email || "",
        });
      }
    }
    if (user) { 
      loadProfileAndSettings();
    }
  }, [user, currentCompanyId, form, toast]);

  async function onSubmit(data: ProfileFormValues) {
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "No Company ID selected. Cannot save settings." });
      return;
    }
    setIsSaving(true);
    try {
      if (user && data.name !== user.displayName) {
        await updateUserProfileName(data.name);
      }

      const companySettingsToSave: Partial<DataService.CompanySettings> = { 
        businessName: data.businessName || "",
        businessType: data.businessType || "",
        companyGstin: data.companyGstin || "",
        gstRegion: data.gstRegion || "none",
        companyAddress: data.companyAddress || "",
        registeredAddress: data.registeredAddress || "",
        corporateAddress: data.corporateAddress || "",
        billingAddress: data.billingAddress || "",
        companyEmail: data.companyEmail || "",
        companyPhone: data.companyPhone || "",
        currency: data.currency || "INR",
        bankDetails: data.bankDetails || "",
        authorizedSignatory: data.authorizedSignatory || "",
      };

      await DataService.saveCompanySettings(currentCompanyId, companySettingsToSave); 

      toast({
        title: "Settings Updated",
        description: "Your profile and company settings have been successfully saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update settings.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const isLoadingUiElements = authIsLoading || isFetchingSettings;
  const isSaveButtonDisabled = authIsLoading || isFetchingSettings || isSaving;

  if (!currentCompanyId && !authIsLoading && !isFetchingSettings) {
    return (
       <Card>
        <CardHeader>
            <CardTitle>User Profile & Company Settings</CardTitle>
        </CardHeader>
        <CardContent>
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Company Selected</AlertTitle>
                <AlertDescription>
                Please select or enter a Company ID on the main login page to manage profile and company settings.
                </AlertDescription>
            </Alert>
        </CardContent>
       </Card>
    );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile & Company Settings {companyName ? `(${companyName})` : ''}</CardTitle>
        <CardDescription>Manage your personal information and company-specific details like GST and addresses.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} value={field.value ?? ""} disabled={isLoadingUiElements} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} value={field.value ?? ""} disabled />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">Email is managed by your Google account.</p>
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Current Company ID</FormLabel>
              <Input value={currentCompanyId || "N/A"} disabled readOnly className="mt-1"/>
              <p className="text-xs text-muted-foreground">Company context for the current session. Change on login page.</p>
            </div>

            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your business name" {...field} value={field.value ?? ""} disabled={isLoadingUiElements}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isLoadingUiElements}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your business type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businessTypes.map(bt => (
                        <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyGstin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company GSTIN (India) / VAT ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 29ABCDE1234F1Z5 or your VAT ID" {...field} value={field.value ?? ""} disabled={isLoadingUiElements}/>
                  </FormControl>
                  <FormMessage />
                   <p className="text-xs text-muted-foreground">Enter your company's Goods and Services Tax Identification Number or VAT ID.</p>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="gstRegion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary GST / VAT Region</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "none"} disabled={isLoadingUiElements}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary tax region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gstRegionOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">This helps the AI understand the tax context.</p>
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Base Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "INR"} disabled={isLoadingUiElements}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select your base currency" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {currencyOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">The primary currency for your financial reports.</p>
                    </FormItem>
                )}
            />
             <FormField
              control={form.control}
              name="companyEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Email (for Invoices)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@yourbusiness.com" {...field} value={field.value ?? ""} disabled={isLoadingUiElements} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="companyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Phone (for Invoices)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1-234-567-8900" {...field} value={field.value ?? ""} disabled={isLoadingUiElements} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Company Address (for display)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main Street, City, State, Zip" {...field} value={field.value ?? ""} disabled={isLoadingUiElements} rows={3}/>
                  </FormControl>
                  <FormMessage />
                   <p className="text-xs text-muted-foreground">The main address shown on documents like invoices.</p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Details (for Invoices)</FormLabel>
                  <FormControl>
                    <Textarea placeholder={"Bank Name: Example Bank\nAccount Name: Your Business LLC\nAccount No: 123456789\nIFSC/SWIFT: EXAMPL001"} {...field} value={field.value ?? ""} disabled={isLoadingUiElements} rows={4}/>
                  </FormControl>
                  <FormMessage />
                   <p className="text-xs text-muted-foreground">These details will be shown on invoices for customers to make payments.</p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authorizedSignatory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authorized Signatory (for Invoices)</FormLabel>
                  <FormControl>
                    <Input placeholder="Name or Title" {...field} value={field.value ?? ""} disabled={isLoadingUiElements}/>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">Name or title to appear on the signature line of invoices.</p>
                </FormItem>
              )}
            />

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaveButtonDisabled}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}