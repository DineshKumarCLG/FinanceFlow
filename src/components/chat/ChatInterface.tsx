
"use client";

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Added ScrollBar
import { MessageBubble, type Message } from "./MessageBubble";
import { Send, Paperclip, Mic, Loader2, XCircle, Bot } from "lucide-react"; // Added Bot for loading
import { chatWithAiAssistant } from '@/ai/flows/chat-with-ai-assistant';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter } from "@/components/ui/card"; // Removed CardHeader
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from '../ui/avatar';

// Helper to convert file to data URI
const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function ChatInterface() {
  const { user: currentUser, currentCompanyId } = useAuth(); // Get currentUser
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: "Hello! I'm your AI Accounting Assistant. How can I help you today? You can ask me to create invoices, add entries, or analyze documents.", timestamp: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isMicSupported, setIsMicSupported] = useState(false);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if(SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          setInput(prev => prev + event.results[0][0].transcript);
          setIsListening(false);
        };
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === "no-speech") {
            toast({ variant: "default", title: "Voice Input", description: "No speech detected. Please try speaking again." });
          } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            console.warn("Speech recognition permission error:", event.error);
            toast({ variant: "destructive", title: "Voice Error", description: "Microphone access denied. Please enable it in your browser settings." });
          } else {
            console.error("Speech recognition error:", event.error);
            toast({ variant: "destructive", title: "Voice Error", description: "Could not recognize speech." });
          }
          setIsListening(false);
        };
        recognitionRef.current.onend = () => setIsListening(false);
        setIsMicSupported(true);
      } else {
        setIsMicSupported(false);
      }
    } else {
      setIsMicSupported(false);
    }
  }, [toast]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({ variant: "destructive", title: "Voice Input Not Supported", description: "Your browser doesn't support voice input." });
      return;
    }
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Error stopping speech recognition (might already be stopped):", e);
      }
      setIsListening(false); 
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        console.error("Error starting speech recognition:", e);
        toast({ variant: "destructive", title: "Voice Error", description: "Could not start voice input. Is microphone access allowed?"});
        setIsListening(false);
      }
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setAttachedFiles(prev => [...prev, ...files].slice(0, 5)); 
      
      const previews = await Promise.all(files.map(fileToDataUri));
      setFilePreviews(prev => [...prev, ...previews].slice(0, 5));
      
      if (event.target) event.target.value = ""; 
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && attachedFiles.length === 0) return;

    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Company ID Missing", description: "Please select a company before chatting with the AI." });
      return;
    }
    if (!currentUser) {
      toast({ variant: "destructive", title: "User Not Authenticated", description: "Please ensure you are logged in." });
      return;
    }


    const userMessageContent = input.trim();
    const userMessage: Message = {
      id: String(Date.now()), 
      role: "user",
      content: userMessageContent,
      timestamp: new Date(),
      attachments: attachedFiles.map(f => ({ name: f.name, type: f.type }))
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const fileDataUris = await Promise.all(attachedFiles.map(fileToDataUri));
    setAttachedFiles([]);
    setFilePreviews([]);

    try {
      const conversationHistoryForFlow = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
      }));

      const aiResponse = await chatWithAiAssistant({
        message: userMessageContent,
        conversationHistory: conversationHistoryForFlow,
        uploadedFiles: fileDataUris,
        companyId: currentCompanyId,
      });
      
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: "assistant", content: aiResponse.response, timestamp: new Date() },
      ]);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to get response from AI." });
       setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: "system", content: "Error: Could not connect to AI assistant.", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-xl bg-background">
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          <div className="space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && messages[messages.length-1]?.role === 'user' && (
               <div className="flex items-start gap-3 py-3 px-1 justify-start">
                  <Avatar className="h-8 w-8 border border-border bg-muted">
                    <AvatarFallback><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                  </Avatar>
                  <div className="rounded-xl px-4 py-3 shadow-md text-sm bg-muted text-card-foreground rounded-bl-none border max-w-[70%]">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
               </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      {filePreviews.length > 0 && (
        <div className="p-2 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1.5 px-2">Attachments ({filePreviews.length}/5):</p>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2 px-2">
              {filePreviews.map((preview, index) => (
                <div key={index} className="relative group w-14 h-14 border rounded-md bg-background shadow-sm shrink-0 overflow-hidden">
                  {attachedFiles[index].type.startsWith("image/") ? (
                     <Image src={preview} alt={attachedFiles[index].name} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="file preview"/>
                  ): (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-md text-muted-foreground text-[10px] p-1 leading-tight text-center">
                      <Paperclip className="h-4 w-4 mb-0.5"/>
                      <span className="truncate w-full">{attachedFiles[index].name}</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                    onClick={() => removeAttachedFile(index)}
                    title="Remove file"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      <CardFooter className="p-3 border-t border-border bg-background">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 w-full">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 resize-none min-h-[40px] max-h-[120px] bg-card border-input focus-visible:ring-primary"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading || !currentCompanyId}
          />
          <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !currentCompanyId || attachedFiles.length >= 5} title="Attach file">
            <Paperclip className="h-5 w-5" />
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv" disabled={attachedFiles.length >=5}/>
          {isMicSupported && (
            <Button type="button" variant="outline" size="icon" onClick={handleVoiceInput} disabled={isLoading || !currentCompanyId} title="Use voice input">
              <Mic className={cn("h-5 w-5", isListening && "text-destructive animate-pulse")} />
            </Button>
          )}
          <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90" disabled={isLoading || (!input.trim() && attachedFiles.length === 0) || !currentCompanyId} title="Send message">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
         {!currentCompanyId && (
            <p className="text-xs text-destructive mt-1 text-center w-full">
                Select a Company ID to enable the AI Assistant.
            </p>
        )}
      </CardFooter>
    </Card>
  );
}
