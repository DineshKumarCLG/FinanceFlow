
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
import { useState, useEffect, ChangeEvent } from "react";
import { Loader2, AlertCircle, UploadCloud, Image as ImageIcon, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import * as DataService from "@/lib/data-service";
import { storage } from "@/lib/firebase"; // Import Firebase storage
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Image from "next/image"; // For preview

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email().optional(),
  businessName: z.string().min(2, "Business name must be at least 2 characters.").optional().or(z.literal('')),
  businessType: z.string().optional().or(z.literal('')),
  companyGstin: z.string().optional().refine(val => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val), {
    message: "Invalid GSTIN format (e.g., 29ABCDE1234F1Z5)",
  }).or(z.literal('')),
  gstRegion: z.enum(["india", "international_other", "none"]).optional(),
  logoUrl: z.string().url("Invalid URL for logo.").optional().or(z.literal('')),
  companyAddress: z.string().optional().or(z.literal('')),
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


export function ProfileForm() {
  const { user, updateUserProfileName, isLoading: authIsLoading, currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingSettings, setIsFetchingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      businessName: "",
      businessType: "",
      companyGstin: "",
      gstRegion: "none",
      logoUrl: "",
      companyAddress: "",
      registeredAddress: "",
      corporateAddress: "",
      billingAddress: "",
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
            logoUrl: companySettings?.logoUrl || "",
            companyAddress: companySettings?.companyAddress || "",
            registeredAddress: companySettings?.registeredAddress || "",
            corporateAddress: companySettings?.corporateAddress || "",
            billingAddress: companySettings?.billingAddress || "",
          });
          if (companySettings?.logoUrl) {
            setLogoPreviewUrl(companySettings.logoUrl);
          } else {
            setLogoPreviewUrl(null);
          }
        } catch (error) {
          console.error("Failed to load company settings:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load company settings." });
          form.reset({
            name: user.displayName || "",
            email: user.email || "",
            businessName: "",
            businessType: "",
            companyGstin: "",
            gstRegion: "none",
            logoUrl: "",
            companyAddress: "",
            registeredAddress: "",
            corporateAddress: "",
            billingAddress: "",
          });
          setLogoPreviewUrl(null);
        } finally {
          setIsFetchingSettings(false);
        }
      } else if (user) { // User exists but no companyId
        form.reset({
          name: user.displayName || "",
          email: user.email || "",
          businessName: "",
          businessType: "",
          companyGstin: "",
          gstRegion: "none",
          logoUrl: "",
          companyAddress: "",
          registeredAddress: "",
          corporateAddress: "",
          billingAddress: "",
        });
        setLogoPreviewUrl(null);
      }
    }
    loadProfileAndSettings();
  }, [user, currentCompanyId]); 

  const handleLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentCompanyId) {
      setSelectedLogoFile(file);
      setIsUploadingLogo(true);
      toast({title: "Uploading Logo...", description: "Please wait."});
      try {
        // Attempt to delete existing logo first to avoid multiple logo files if name is same (though less likely with unique names)
        const currentLogoUrlInForm = form.getValues("logoUrl");
        if (currentLogoUrlInForm && currentLogoUrlInForm.includes("firebasestorage.googleapis.com")) {
            try {
                const oldLogoRef = ref(storage, currentLogoUrlInForm);
                await deleteObject(oldLogoRef);
                console.log("Previous logo deleted from storage during new upload.");
            } catch (deleteError: any) {
                if (deleteError.code !== 'storage/object-not-found') {
                    console.warn("Could not delete previous logo during new upload:", deleteError);
                }
            }
        }
        
        const fileExtension = file.name.split('.').pop();
        const logoFileName = `logo_${Date.now()}.${fileExtension}`; // More unique name
        const storageRef = ref(storage, `companyLogos/${currentCompanyId}/${logoFileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        form.setValue("logoUrl", downloadURL, { shouldValidate: true });
        setLogoPreviewUrl(downloadURL);
        toast({ title: "Logo Uploaded", description: "Logo updated successfully. Save changes to persist." });
      } catch (error: any) {
        console.error("Logo upload error:", error);
        toast({ variant: "destructive", title: "Logo Upload Failed", description: error.message || "Could not upload logo." });
      } finally {
        setIsUploadingLogo(false);
        if(event.target) event.target.value = ""; 
      }
    } else if (!currentCompanyId) {
        toast({variant: "destructive", title: "Company ID Missing", description: "Cannot upload logo without a Company ID."})
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentCompanyId) {
        toast({ variant: "destructive", title: "Error", description: "No Company ID, cannot remove logo." });
        return;
    }
    const currentLogoUrlValue = form.getValues("logoUrl");
    if (!currentLogoUrlValue) {
        toast({ variant: "default", title: "No Logo", description: "No logo is currently set to remove." });
        setLogoPreviewUrl(null);
        setSelectedLogoFile(null);
        form.setValue("logoUrl", "", {shouldValidate: true}); // Ensure form value is cleared
        return;
    }

    setIsUploadingLogo(true); // Re-use this state for "processing"
    toast({ title: "Removing Logo..." });
    try {
        if (currentLogoUrlValue.includes("firebasestorage.googleapis.com")) {
             const logoRef = ref(storage, currentLogoUrlValue);
             await deleteObject(logoRef);
        }
        form.setValue("logoUrl", "", { shouldValidate: true });
        setLogoPreviewUrl(null);
        setSelectedLogoFile(null);
        toast({ title: "Logo Removed", description: "Logo has been cleared. Save changes to persist." });
    } catch (error: any) {
        console.error("Error removing logo:", error);
        // If object not found, it's already gone or was never fully saved. Still clear from form.
        if (error.code === 'storage/object-not-found') {
            toast({ title: "Logo Cleared", description: "Logo was not found in storage or already removed. Cleared from form." });
        } else {
            toast({ variant: "destructive", title: "Removal Failed", description: "Could not remove logo from storage. " + error.message });
        }
        form.setValue("logoUrl", "", { shouldValidate: true }); // Still clear form value
        setLogoPreviewUrl(null);
        setSelectedLogoFile(null);
    } finally {
        setIsUploadingLogo(false);
    }
  };


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
        logoUrl: data.logoUrl || "", // Ensure logoUrl is always a string
        companyAddress: data.companyAddress || "",
        registeredAddress: data.registeredAddress || "",
        corporateAddress: data.corporateAddress || "",
        billingAddress: data.billingAddress || "",
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

  const isLoadingButton = authIsLoading || isFetchingSettings || isUploadingLogo || isSaving;
  const isSaveButtonDisabled = authIsLoading || isFetchingSettings || isSaving; // isUploadingLogo doesn't disable save button
  
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
        <CardTitle>User Profile & Company Settings {currentCompanyId ? `(${currentCompanyId})` : ''}</CardTitle>
        <CardDescription>Manage your personal information and company-specific details like GST, addresses, and logo.</CardDescription>
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
                    <Input placeholder="Your full name" {...field} value={field.value ?? ""} disabled={isLoadingButton} />
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
            
            <div className="space-y-2">
              <FormLabel>Company Logo</FormLabel>
              <div className="flex items-center gap-4">
                {logoPreviewUrl ? (
                  <Image 
                    key={logoPreviewUrl} 
                    src={logoPreviewUrl} 
                    alt="Company Logo Preview" 
                    width={80} 
                    height={80} 
                    className="rounded border object-contain bg-slate-100" 
                    data-ai-hint="company logo"
                  />
                ) : (
                  <div className="h-20 w-20 rounded border bg-muted flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('logo-upload-input')?.click()} disabled={isLoadingButton}>
                        <UploadCloud className="mr-2 h-4 w-4" /> {logoPreviewUrl ? "Change Logo" : "Upload Logo"}
                    </Button>
                    <Input id="logo-upload-input" type="file" className="hidden" onChange={handleLogoFileChange} accept="image/png, image/jpeg, image/svg+xml" disabled={isLoadingButton} />
                    {logoPreviewUrl && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10" disabled={isLoadingButton}>
                            <Trash2 className="mr-2 h-4 w-4"/>Remove Logo
                        </Button>
                    )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Recommended: Square or wide logo, max 1MB (PNG, JPG, SVG).</p>
              <FormField control={form.control} name="logoUrl" render={({ field }) => <Input type="hidden" {...field} />} />
               <FormMessage>{form.formState.errors.logoUrl?.message}</FormMessage>
            </div>


            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your business name" {...field} value={field.value ?? ""} disabled={isLoadingButton}/>
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
                  <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isLoadingButton}>
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
                    <Input placeholder="e.g., 29ABCDE1234F1Z5 or your VAT ID" {...field} value={field.value ?? ""} disabled={isLoadingButton}/>
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
                  <Select onValueChange={field.onChange} value={field.value ?? "none"} disabled={isLoadingButton}>
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
              name="companyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Company Address (for display)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main Street, City, State, Zip" {...field} value={field.value ?? ""} disabled={isLoadingButton} rows={3}/>
                  </FormControl>
                  <FormMessage />
                   <p className="text-xs text-muted-foreground">The main address shown on documents like invoices.</p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registeredAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registered Office Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Official registered address of the company" {...field} value={field.value ?? ""} disabled={isLoadingButton} rows={3}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="corporateAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corporate Office Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Primary corporate office, if different from registered" {...field} value={field.value ?? ""} disabled={isLoadingButton} rows={3}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company's Billing Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Address where your company receives bills" {...field} value={field.value ?? ""} disabled={isLoadingButton} rows={3}/>
                  </FormControl>
                  <FormMessage />
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

