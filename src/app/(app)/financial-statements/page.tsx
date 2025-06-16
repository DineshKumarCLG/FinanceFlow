
import Link from 'next/link';
import { PageTitle } from "@/components/shared/PageTitle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, ListChecks, PieChart, ArrowRight } from "lucide-react";

export default function FinancialStatementsPage() {
  const statements = [
    {
      title: "Balance Sheet",
      description: "View your company's assets, liabilities, and equity at a specific point in time. Understand your financial position.",
      href: "/balance-sheet",
      icon: Landmark,
      imageHint: "financial document business"
    },
    {
      title: "Trial Balance",
      description: "Review a summary of all ledger accounts and their debit or credit balances. Ensure your books are balanced.",
      href: "/trial-balance",
      icon: ListChecks,
      imageHint: "checklist report"
    },
    {
      title: "Profit & Loss Statement",
      description: "Analyze your company's revenues and expenses over a period. Track profitability. (Available on Dashboard)",
      href: "/dashboard?tab=reports#reports", // Updated href to target the reports tab
      icon: PieChart,
      imageHint: "chart graph"
    },
  ];

  return (
    <div className="space-y-8">
      <PageTitle
        title="Financial Statements Hub"
        description="Access key financial reports and statements for your business."
      />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {statements.map((statement) => (
          <Card key={statement.title} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <statement.icon className="h-8 w-8 text-primary" />
                <CardTitle className="text-xl">{statement.title}</CardTitle>
              </div>
              <CardDescription>{statement.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {/* Placeholder for a small visual or more info if needed */}
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-4">
                <img 
                  src={`https://placehold.co/600x338/E8F5E9/4CAF50.png`} 
                  alt={`${statement.title} placeholder`} 
                  className="w-full h-full object-cover rounded-md"
                  data-ai-hint={statement.imageHint} 
                />
              </div>
            </CardContent>
            <div className="p-6 pt-0">
              <Button asChild className="w-full">
                <Link href={statement.href}>
                  View Statement <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
