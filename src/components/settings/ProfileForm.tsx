
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email().optional(),
  // currentCompanyIdDisplay: z.string().optional(), // For display only
  // Business name and type might be company-specific, not user-specific in a multi-company setup
  // Or they could be user's default business info if they manage multiple companies.
  // For now, let's keep them as user-level settings.
  businessName: z.string().min(2, "Business name must be at least 2 characters.").optional(),
  businessType: z.string().optional(),
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

export function ProfileForm() {
  const { user, updateUserProfileName, isLoading: authIsLoading, currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.displayName || "",
      email: user?.email || "",
      businessName: "", // This should ideally be fetched from a user profile if stored
      businessType: "", // This too
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.displayName || "",
        email: user.email || "",
        // Fetch businessName and businessType from a user profile in Firestore if you store them
        // For now, if they are empty in the form, keep them empty or set a default
        businessName: form.getValues("businessName") || (currentCompanyId === "KENESIS" ? "KENESIS" : ""),
        businessType: form.getValues("businessType") || (currentCompanyId === "KENESIS" ? "startup" : ""),
      });
    }
  }, [user, form, currentCompanyId]);

  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true);
    try {
      if (data.name !== user?.displayName) {
        await updateUserProfileName(data.name);
      }
      // TODO: Add logic to save businessName and businessType to a Firestore user profile document,
      // potentially scoped by companyId or as general user info.
      console.log("Profile data to save (potentially to Firestore):", { businessName: data.businessName, businessType: data.businessType, forCompany: currentCompanyId });
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = authIsLoading || isSaving;
  
  if (!currentCompanyId && !authIsLoading) {
    return (
       <Card>
        <CardHeader>
            <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Company Selected</AlertTitle>
                <AlertDescription>
                Please select or enter a Company ID on the main page to manage profile settings.
                </AlertDescription>
            </Alert>
        </CardContent>
       </Card>
    );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile {currentCompanyId ? `(Company: ${currentCompanyId})` : ''}</CardTitle>
        <CardDescription>Manage your personal and business information.</CardDescription>
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
                    <Input placeholder="Your full name" {...field} disabled={isLoading} />
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
                    <Input type="email" placeholder="your@email.com" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">Email is managed by your Google account.</p>
                </FormItem>
              )}
            />
             {/* Display Current Company ID - Not editable here */}
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
                  <FormLabel>Business Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Your business name" {...field} disabled={isLoading || (currentCompanyId === "KENESIS" && field.value === "KENESIS")}/>
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
                  <FormLabel>Business Type (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
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
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
