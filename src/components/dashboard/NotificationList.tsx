
"use client";

import type { Notification } from "@/lib/data-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FilePlus, UserPlus, FileText, Info } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

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
              <div className="h-10 w-10 rounded-full bg-muted"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
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
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-md transition-colors">
            <Avatar className="h-10 w-10 border mt-1">
              <AvatarImage src={`https://placehold.co/40x40.png?text=${notification.type === 'user_joined' ? 'UJ' : 'AC'}`} alt="Notification icon" data-ai-hint="activity user" />
              <AvatarFallback>{getIconForNotificationType(notification.type)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-foreground">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
                {notification.timestamp ? formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
