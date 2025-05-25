
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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email().optional(), // Email comes from Firebase Auth, not directly editable here
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
  const { user, updateUserProfileName, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.displayName || "",
      email: user?.email || "",
      businessName: "KENESIS", // Default or fetch from user profile if stored
      businessType: "startup", // Default or fetch
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.displayName || "",
        email: user.email || "",
        // TODO: Fetch businessName and businessType from a user profile in Firestore if you store them
        businessName: form.getValues("businessName") || "KENESIS", // Keep existing if already set, else default
        businessType: form.getValues("businessType") || "startup",
      });
    }
  }, [user, form]);

  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true);
    try {
      if (data.name !== user?.displayName) {
        await updateUserProfileName(data.name);
      }
      // TODO: Add logic to save businessName and businessType to a Firestore user profile document
      // For now, we just log them and show a success toast for the name change.
      console.log("Profile data to save (potentially to Firestore):", { businessName: data.businessName, businessType: data.businessType });
      
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Manage your personal and business information for KENESIS.</CardDescription>
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
                    <Input placeholder="Your full name" {...field} />
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
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    {/* For KENESIS, this is likely fixed */}
                    <Input placeholder="Your business name" {...field} value="KENESIS" disabled />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
