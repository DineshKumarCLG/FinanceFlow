import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, UploadCloud, MessageCircle } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      label: "Add Entry",
      href: "/add-entry",
      icon: PlusCircle,
      description: "Manually add a new transaction."
    },
    {
      label: "Upload Document",
      href: "/upload-document",
      icon: UploadCloud,
      description: "Upload receipts, invoices, etc."
    },
    {
      label: "Chat with AI",
      href: "/chat",
      icon: MessageCircle,
      description: "Ask your AI assistant questions."
    },
  ];

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4"> {/* Changed md:grid-cols-3 to default single column */}
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto p-4 flex flex-col items-start text-left justify-start gap-2 hover:bg-accent/50 w-full" // Added w-full
            asChild
          >
            <Link href={action.href}>
              <div className="flex items-center gap-3">
                <action.icon className="h-6 w-6 text-primary" />
                <span className="text-base font-semibold text-foreground">{action.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
