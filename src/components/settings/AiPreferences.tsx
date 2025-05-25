"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function AiPreferences() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Placeholder state for AI preferences
  const [aiModel, setAiModel] = useState("gemini_pro");
  const [verbosity, setVerbosity] = useState([50]); // Value between 0-100
  const [tone, setTone] = useState("neutral");

  const handleSubmit = () => {
    setIsLoading(true);
    console.log("AI Preferences Saved:", { aiModel, verbosity: verbosity[0], tone });
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "AI Preferences Saved",
        description: "Your AI assistant settings have been updated.",
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Assistant Preferences</CardTitle>
        <CardDescription>Customize how your AI assistant interacts with you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="aiModel">AI Model</Label>
          <Select value={aiModel} onValueChange={setAiModel}>
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
            defaultValue={verbosity}
            max={100}
            step={10}
            onValueChange={setVerbosity}
            className="pt-2"
          />
          <p className="text-xs text-muted-foreground">Controls how detailed the AI's responses are. Higher means more detail.</p>
        </div>

        <div className="space-y-2">
          <Label>Communication Tone</Label>
          <RadioGroup defaultValue={tone} onValueChange={setTone} className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="formal" id="tone-formal" />
              <Label htmlFor="tone-formal">Formal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="neutral" id="tone-neutral" />
              <Label htmlFor="tone-neutral">Neutral</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="friendly" id="tone-friendly" />
              <Label htmlFor="tone-friendly">Friendly</Label>
            </div>
             <div className="flex items-center space-x-2">
              <RadioGroupItem value="concise" id="tone-concise" />
              <Label htmlFor="tone-concise">Concise</Label>
            </div>
          </RadioGroup>
           <p className="text-xs text-muted-foreground">Choose the assistant's communication style.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save AI Preferences
        </Button>
      </CardFooter>
    </Card>
  );
}
