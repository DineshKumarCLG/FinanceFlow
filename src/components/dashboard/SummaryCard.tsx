import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react"; 

interface SummaryCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  change?: string; // Optional, e.g., "+20.1%"
  changeType?: "positive" | "negative"; // Optional
  className?: string;
  isCurrency?: boolean; // New prop
}

export const SummaryCard = React.memo(function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType, 
  className,
  isCurrency = true // Default to true
}: SummaryCardProps) {
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const formattedValue = isCurrency 
    ? value.toLocaleString(clientLocale, { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toLocaleString(clientLocale);

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-2xl font-bold text-foreground">
          {formattedValue}
        </div>
        {change && (
          <p className={cn(
            "text-xs text-muted-foreground mt-1",
            changeType === "positive" && "text-green-600",
            changeType === "negative" && "text-red-600"
          )}>
            {change} from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
});
SummaryCard.displayName = 'SummaryCard';
