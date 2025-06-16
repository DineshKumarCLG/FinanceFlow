
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as DataService from "@/lib/data-service";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Default values for AI preferences
const defaultAiModel = "gemini_pro";
const defaultVerbosity = 50;
const defaultTone = "neutral";

export function AiPreferences() {
  const { currentCompanyId } = useAuth();
  const { toast } = useToast();
  
  const [aiModel, setAiModel] = useState(defaultAiModel);
  const [verbosity, setVerbosity] = useState([defaultVerbosity]);
  const [tone, setTone] = useState(defaultTone);
  
  const [isFetchingSettings, setIsFetchingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadAiPreferences() {
      if (currentCompanyId) {
        setIsFetchingSettings(true);
        try {
          const prefs = await DataService.getAiPreferences(currentCompanyId);
          if (prefs) {
            setAiModel(prefs.aiModel || defaultAiModel);
            setVerbosity([prefs.verbosity === undefined ? defaultVerbosity : prefs.verbosity]);
            setTone(prefs.tone || defaultTone);
          } else {
            // No prefs found, set defaults
            setAiModel(defaultAiModel);
            setVerbosity([defaultVerbosity]);
            setTone(defaultTone);
          }
        } catch (error) {
          console.error("Failed to load AI preferences:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load AI preferences." });
        } finally {
          setIsFetchingSettings(false);
        }
      } else {
        // No company ID, reset to defaults
        setAiModel(defaultAiModel);
        setVerbosity([defaultVerbosity]);
        setTone(defaultTone);
      }
    }
    loadAiPreferences();
  }, [currentCompanyId, toast]);

  const handleSubmit = async () => {
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "No Company ID selected. Cannot save AI preferences." });
      return;
    }
    setIsSaving(true);
    
    const preferencesToSave: Partial<Omit<DataService.AiPreferencesSettings, 'id' | 'updatedAt'>> = {
      aiModel: aiModel,
      verbosity: verbosity[0],
      tone: tone,
    };

    try {
      await DataService.saveAiPreferences(currentCompanyId, preferencesToSave);
      toast({
        title: "AI Preferences Saved",
        description: "Your AI assistant settings have been updated.",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not save AI preferences." });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isFetchingSettings || isSaving;

  if (!currentCompanyId && !isFetchingSettings) {
    return (
       <Card>
        <CardHeader>
            <CardTitle>AI Assistant Preferences</CardTitle>
        </CardHeader>
        <CardContent>
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Company Selected</AlertTitle>
                <AlertDescription>
                Please select or enter a Company ID on the main login page to manage AI preferences.
                </AlertDescription>
            </Alert>
        </CardContent>
       </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Assistant Preferences {currentCompanyId ? `(${currentCompanyId})` : ''}</CardTitle>
        <CardDescription>Customize how your AI assistant interacts with you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="aiModel">AI Model</Label>
          <Select value={aiModel} onValueChange={setAiModel} disabled={isLoading}>
            <SelectTrigger id="aiModel">
              <SelectValue placeholder="Select AI Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini_flash">Gemini 2.0 Flash (Fast & Efficient)</SelectItem>
              <SelectItem value="gemini_pro">Gemini Pro (Balanced)</SelectItem>
              <SelectItem value="deepseek_coder">DeepSeek Coder (Specialized)</SelectItem>
            </SelectContent>
          </Select>
           <p className="text-xs text-muted-foreground">Select the underlying AI model. Different models may have varying performance and cost implications.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verbosity">Verbosity Level: {verbosity[0]}</Label>
          <Slider
            id="verbosity"
            value={verbosity}
            max={100}
            step={10}
            onValueChange={setVerbosity}
            className="pt-2"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">Controls how detailed the AI's responses are. Higher means more detail.</p>
        </div>

        <div className="space-y-2">
          <Label>Communication Tone</Label>
          <RadioGroup value={tone} onValueChange={setTone} className="flex flex-col sm:flex-row gap-4 pt-2" disabled={isLoading}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="formal" id="tone-formal" disabled={isLoading} />
              <Label htmlFor="tone-formal">Formal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="neutral" id="tone-neutral" disabled={isLoading} />
              <Label htmlFor="tone-neutral">Neutral</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="friendly" id="tone-friendly" disabled={isLoading} />
              <Label htmlFor="tone-friendly">Friendly</Label>
            </div>
             <div className="flex items-center space-x-2">
              <RadioGroupItem value="concise" id="tone-concise" disabled={isLoading} />
              <Label htmlFor="tone-concise">Concise</Label>
            </div>
          </RadioGroup>
           <p className="text-xs text-muted-foreground">Choose the assistant's communication style.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={isLoading || !currentCompanyId}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save AI Preferences
        </Button>
      </CardFooter>
    </Card>
  );
}
