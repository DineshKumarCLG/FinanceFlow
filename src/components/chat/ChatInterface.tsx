
"use client";

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble, type Message } from "./MessageBubble";
import { Send, Paperclip, Mic, Loader2, XCircle } from "lucide-react";
import { chatWithAiAssistant } from '@/ai/flows/chat-with-ai-assistant';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from "@/lib/utils";

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
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: "Hello! I'm your AI Accounting Assistant. How can I help you today?", timestamp: new Date() }
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
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

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
            // console.info("Speech recognition: No speech detected."); // Optional: use console.info or remove logging for this case
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
      recognitionRef.current.stop();
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
      setAttachedFiles(prev => [...prev, ...files]);
      
      const previews = await Promise.all(files.map(fileToDataUri));
      setFilePreviews(prev => [...prev, ...previews]);
      
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

    const userMessageContent = input.trim();
    const userMessage: Message = {
      id: String(messages.length + 1),
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
      const conversationHistory = messages.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));
      const aiResponse = await chatWithAiAssistant({
        message: userMessageContent,
        conversationHistory,
        uploadedFiles: fileDataUris,
      });
      
      setMessages((prev) => [
        ...prev,
        { id: String(prev.length + 1), role: "assistant", content: aiResponse.response, timestamp: new Date() },
      ]);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({ variant: "destructive", title: "AI Error", description: error.message || "Failed to get response from AI." });
       setMessages((prev) => [
        ...prev,
        { id: String(prev.length + 1), role: "system", content: "Error: Could not connect to AI assistant.", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-xl">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-2">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && messages[messages.length-1]?.role === 'user' && (
             <div className="flex items-start gap-3 py-3 px-1 justify-start">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          )}
        </div>
      </ScrollArea>
      
      {filePreviews.length > 0 && (
        <div className="p-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Attachments:</p>
          <div className="flex gap-2 overflow-x-auto">
            {filePreviews.map((preview, index) => (
              <div key={index} className="relative group w-16 h-16 border rounded">
                {attachedFiles[index].type.startsWith("image/") ? (
                   <Image src={preview} alt={attachedFiles[index].name} layout="fill" objectFit="cover" className="rounded" data-ai-hint="file preview"/>
                ): (
                  <div className="w-full h-full flex items-center justify-center bg-muted rounded text-muted-foreground text-xs p-1 overflow-hidden">
                    {attachedFiles[index].name}
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeAttachedFile(index)}
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <CardContent className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or ask a question..."
            className="flex-1 resize-none min-h-[40px]"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Attach file">
            <Paperclip className="h-5 w-5" />
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"/>
          {isMicSupported && (
            <Button type="button" variant="ghost" size="icon" onClick={handleVoiceInput} disabled={isLoading} title="Use voice input">
              <Mic className={cn("h-5 w-5", isListening && "text-destructive animate-pulse")} />
            </Button>
          )}
          <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && attachedFiles.length === 0)} title="Send message">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
