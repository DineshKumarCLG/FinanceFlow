
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Paperclip } from "lucide-react"; // Added Paperclip
import React from "react";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  attachments?: { name: string, type: string, url?: string }[];
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = React.memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (message.role === "system") {
    return (
      <div className="text-center text-xs text-muted-foreground py-2 italic">
        {message.content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-2 px-1", // Reduced py
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border bg-muted"> {/* Added bg-muted for AI fallback */}
          <AvatarImage src="https://placehold.co/40x40/7C3AED/FFFFFF.png?text=AI" alt="AI Assistant" data-ai-hint="robot assistant" />
          <AvatarFallback><Bot className="h-4 w-4 text-primary" /></AvatarFallback> {/* Icon color for fallback */}
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-xl px-3.5 py-2.5 shadow-sm text-sm break-words", // Adjusted padding and max-width
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted text-card-foreground rounded-bl-none border border-border/50" // Use bg-muted for AI
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border/30 pt-1.5">
            {message.attachments.map((att, idx) => (
              <div key={idx} className={cn(
                "text-xs p-1.5 rounded-md flex items-center gap-1.5 text-opacity-80",
                isUser ? "bg-primary/80 text-primary-foreground" : "bg-background/50 text-muted-foreground"
              )}>
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" title={att.name}>{att.name}</span>
                {/* <span className="text-opacity-70">({att.type})</span> */}
              </div>
            ))}
          </div>
        )}
        {message.timestamp && (
           <p className={cn(
             "text-xs mt-1.5", // Adjusted margin
             isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left"
            )}>
             {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </p>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src="https://placehold.co/40x40/4CAF50/FFFFFF.png?text=U" alt="User" data-ai-hint="person user" />
          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';
