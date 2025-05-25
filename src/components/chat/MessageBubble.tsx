import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import React from "react"; // Import React for React.memo

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  attachments?: { name: string, type: string, url?: string }[]; // For displaying uploaded files
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = React.memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3 px-1",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src="https://placehold.co/40x40/41B6E6/FFFFFF.png?text=AI" alt="AI Assistant" data-ai-hint="robot assistant" />
          <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-xl px-4 py-3 shadow-md text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none border"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
            {message.attachments.map((att, idx) => (
              <div key={idx} className="text-xs p-1.5 rounded bg-background/50">
                Attached: {att.name} ({att.type})
              </div>
            ))}
          </div>
        )}
        {message.timestamp && (
           <p className={cn("text-xs mt-1", isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground/70 text-left")}>
             {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </p>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="person user" />
          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble'; // Optional: for better debugging