
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

export interface UserSpending {
  userId: string; // creatorUserId from Firebase Auth
  displayName: string; // Could be userId or a portion for now
  totalSpent: number;
  avatarFallback: string;
}

interface UserSpendingListProps {
  spendingData: UserSpending[];
  isLoading?: boolean;
}

export function UserSpendingList({ spendingData = [], isLoading = false }: UserSpendingListProps) {
  const [clientLocale, setClientLocale] = useState('en-US');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">User Spending</CardTitle>
          <CardDescription>Loading spending data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (spendingData.length === 0 && !isLoading) {
    return (
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">User Spending</CardTitle>
          <CardDescription>No spending data available to display.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No transactions marked as spending by users yet.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-sm border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top User Spending</CardTitle>
        <CardDescription>Spending activity by users based on recorded transactions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {spendingData.map((user) => (
          <div key={user.userId} className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={`https://placehold.co/40x40.png?text=${user.avatarFallback}`} alt={user.displayName} data-ai-hint="person avatar" />
              <AvatarFallback>{user.avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none text-foreground truncate" title={user.userId}>
                User ...{user.userId.slice(-6)}
              </p>
            </div>
            <div className="text-sm font-semibold text-foreground">
              {user.totalSpent.toLocaleString(clientLocale, { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
