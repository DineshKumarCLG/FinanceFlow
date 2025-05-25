
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React from "react"; 

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative";
  className?: string;
}

export const SummaryCard = React.memo(function SummaryCard({ title, value, icon: Icon, change, changeType, className }: SummaryCardProps) {
  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {change && (
          <p className={cn(
            "text-xs text-muted-foreground mt-1",
            changeType === "positive" && "text-green-600", // Consider using accent color if it's green
            changeType === "negative" && "text-red-600"
          )}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
});
SummaryCard.displayName = 'SummaryCard';
