
import Link from 'next/link';
import Image from 'next/image';
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
      imageUrl: "/assets/images/balance_sheet_illustration.png",
    },
    {
      title: "Trial Balance",
      description: "Review a summary of all ledger accounts and their debit or credit balances. Ensure your books are balanced.",
      href: "/trial-balance",
      icon: ListChecks,
      imageUrl: "/assets/images/trial_balance_illustration.png",
    },
    {
      title: "Profit & Loss Statement",
      description: "Analyze your company's revenues and expenses over a period. Track profitability. (Available on Dashboard)",
      href: "/dashboard?tab=reports#reports",
      icon: PieChart,
      imageUrl: "/assets/images/profit_loss_illustration.png",
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
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-4 relative overflow-hidden">
                {statement.imageUrl ? (
                  <Image
                    src={statement.imageUrl}
                    alt={`${statement.title} illustration`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                  />
                ) : (
                  // Fallback for safety, if an imageUrl was somehow missing
                  <div className="w-full h-full flex items-center justify-center bg-muted-foreground/10 text-muted-foreground">
                    Image not available
                  </div>
                )}
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
