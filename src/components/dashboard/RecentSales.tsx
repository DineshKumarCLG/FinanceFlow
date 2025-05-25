
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react"; // Using User as a fallback icon

const recentSalesData = [
  {
    name: "Olivia Martin",
    email: "olivia.martin@email.com",
    amount: "+$1,999.00",
    avatar: "https://placehold.co/40x40/A1E8AF/000000.png?text=OM",
    avatarHint: "woman face",
  },
  {
    name: "Jackson Lee",
    email: "jackson.lee@email.com",
    amount: "+$39.00",
    avatar: "https://placehold.co/40x40/A8D8EA/000000.png?text=JL",
    avatarHint: "man face",
  },
  {
    name: "Isabella Nguyen",
    email: "isabella.nguyen@email.com",
    amount: "+$299.00",
    avatar: "https://placehold.co/40x40/F2C8ED/000000.png?text=IN",
    avatarHint: "woman face",
  },
  {
    name: "William Kim",
    email: "will@email.com",
    amount: "+$99.00",
    avatar: "https://placehold.co/40x40/F4D03F/000000.png?text=WK",
    avatarHint: "man face",
  },
  {
    name: "Sofia Davis",
    email: "sofia.davis@email.com",
    amount: "+$39.00",
    avatar: "https://placehold.co/40x40/AED6F1/000000.png?text=SD",
    avatarHint: "woman face",
  },
];

export function RecentSales() {
  return (
    <Card className="shadow-sm border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Sales</CardTitle>
        <CardDescription>You made 265 sales this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {recentSalesData.map((sale, index) => (
          <div key={index} className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={sale.avatar} alt={sale.name} data-ai-hint={sale.avatarHint}/>
              <AvatarFallback>
                {sale.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium leading-none text-foreground">{sale.name}</p>
              <p className="text-xs text-muted-foreground">{sale.email}</p>
            </div>
            <div className="text-sm font-semibold text-foreground">{sale.amount}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
