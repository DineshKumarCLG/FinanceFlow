import { PageTitle } from "@/components/shared/PageTitle";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function AIChatPage() {
  return (
    <div className="h-full flex flex-col">
      <PageTitle
        title="AI Accounting Assistant"
        description="Chat with your AI assistant to manage finances, ask questions, or get help with entries."
      />
      <div className="flex-grow">
        <ChatInterface />
      </div>
    </div>
  );
}
