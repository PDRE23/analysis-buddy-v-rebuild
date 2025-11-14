"use client";

/**
 * Activity Feed Component
 * Live stream of team actions
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Edit, 
  Save, 
  UserPlus, 
  MessageSquare, 
  Calendar,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToEvents, type CollaborationEventData } from "@/lib/realtime";

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  resourceType: "deal" | "analysis" | "note";
  resourceId: string;
  resourceName: string;
  timestamp: Date;
  icon: React.ComponentType<{ className?: string }>;
}

interface ActivityFeedProps {
  resourceId?: string; // Filter by specific resource
  resourceType?: "deal" | "analysis" | "note";
  maxItems?: number;
  className?: string;
}

export function ActivityFeed({
  resourceId,
  resourceType,
  maxItems = 20,
  className,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Subscribe to collaboration events
    const unsubscribe = subscribeToEvents((event: CollaborationEventData) => {
      // Filter by resource if specified
      if (resourceId && event.resourceId !== resourceId) return;
      if (resourceType && event.resourceType !== resourceType) return;

      // Map event to activity
      const activity = mapEventToActivity(event);
      if (activity) {
        setActivities(prev => {
          const updated = [activity, ...prev].slice(0, maxItems);
          return updated;
        });
      }
    });

    // Load initial activities from localStorage (in production, this would be from API)
    loadInitialActivities();

    return () => {
      unsubscribe();
    };
  }, [resourceId, resourceType, maxItems]);

  const loadInitialActivities = () => {
    try {
      const stored = localStorage.getItem("activity-feed");
      if (stored) {
        const parsed = JSON.parse(stored).map((a: Activity) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
        setActivities(parsed.slice(0, maxItems));
      }
    } catch {
      // Ignore errors
    }
  };

  const saveActivity = (activity: Activity) => {
    try {
      const stored = localStorage.getItem("activity-feed");
      const activities = stored ? JSON.parse(stored) : [];
      activities.unshift(activity);
      // Keep only last 100 activities
      localStorage.setItem("activity-feed", JSON.stringify(activities.slice(0, 100)));
    } catch {
      // Ignore errors
    }
  };

  const mapEventToActivity = (event: CollaborationEventData): Activity | null => {
    const getIcon = (): React.ComponentType<{ className?: string }> => {
      switch (event.type) {
        case "user_joined":
          return UserPlus;
        case "content_change":
          return Edit;
        case "cursor_move":
          return FileText;
        default:
          return MessageSquare;
      }
    };

    const getAction = (): string => {
      switch (event.type) {
        case "user_joined":
          return "joined";
        case "user_left":
          return "left";
        case "content_change":
          return "made changes";
        case "cursor_move":
          return "is viewing";
        default:
          return "updated";
      }
    };

    return {
      id: `activity-${Date.now()}-${Math.random()}`,
      userId: event.userId,
      userName: `User ${event.userId.slice(0, 8)}`, // In production, fetch actual name
      action: getAction(),
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      resourceName: event.resourceId, // In production, fetch actual name
      timestamp: new Date(event.timestamp),
      icon: getIcon(),
    };
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card className={cn("rounded-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{activity.userName}</span>
                        <span className="text-sm text-muted-foreground">
                          {activity.action}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {activity.resourceType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground truncate">
                          {activity.resourceName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

