"use client";

import type { Notification } from "@/lib/data-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FilePlus, UserPlus, FileText, Info } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import

interface NotificationListProps {
  notifications: Notification[];
  isLoading?: boolean;
}

const getIconForNotificationType = (type: Notification['type']) => {
  switch (type) {
    case 'new_entry':
      return <FilePlus className="h-5 w-5 text-blue-500" />;
    case 'user_joined':
      return <UserPlus className="h-5 w-5 text-green-500" />;
    case 'document_upload':
      return <FileText className="h-5 w-5 text-purple-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

export function NotificationList({ notifications = [], isLoading = false }: NotificationListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Loading latest updates...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No new notifications.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Recent activity in KENESIS accounting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {notifications.map((notification) => {
          let timeAgo = 'Just now';
          if (notification.timestamp && typeof notification.timestamp.toDate === 'function') {
            try {
              const date = notification.timestamp.toDate();
              // Check if the date is valid before formatting
              if (date && !isNaN(date.getTime())) {
                timeAgo = formatDistanceToNow(date, { addSuffix: true });
              } else {
                console.warn("Invalid date from notification timestamp:", notification.timestamp);
                timeAgo = 'Invalid date'; // Or some other placeholder
              }
            } catch (e) {
              console.error("Error formatting date for notification:", e, notification.timestamp);
              timeAgo = 'Error in date'; // Or some other placeholder
            }
          }

          return (
            <div key={notification.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-md transition-colors">
              <Avatar className="h-10 w-10 border mt-1">
                <AvatarImage src={`https://placehold.co/40x40.png?text=${notification.type === 'user_joined' ? 'UJ' : 'AC'}`} alt="Notification icon" data-ai-hint="activity user"/>
                <AvatarFallback>{getIconForNotificationType(notification.type)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
