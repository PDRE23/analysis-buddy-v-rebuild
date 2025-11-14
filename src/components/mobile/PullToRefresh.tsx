"use client";

/**
 * Pull to Refresh Component
 * Mobile pull-to-refresh gesture
 */

import React, { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const threshold = 80; // Minimum pull distance to trigger refresh

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Only trigger if at top of scroll
    if (container.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || startYRef.current === null || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startYRef.current;

    if (distance > 0) {
      // Apply resistance
      const resistance = 0.5;
      const adjustedDistance = Math.min(distance * resistance, threshold * 1.5);
      setPullDistance(adjustedDistance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || disabled || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error("Error refreshing:", error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    setIsPulling(false);
    startYRef.current = null;
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("relative overflow-auto", className)}
      style={{
        paddingTop: isRefreshing || pullDistance > 0 ? `${Math.max(0, pullDistance)}px` : "0",
      }}
    >
      {/* Pull Indicator */}
      {(isRefreshing || pullDistance > 0) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center"
          style={{
            height: `${Math.max(threshold, pullDistance)}px`,
            transform: `translateY(${-Math.max(threshold, pullDistance)}px)`,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <RefreshCw
              className={cn(
                "h-6 w-6 text-primary transition-transform",
                isRefreshing && "animate-spin"
              )}
              style={{
                transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
              }}
            />
            <span className="text-sm text-muted-foreground">
              {isRefreshing ? "Refreshing..." : pullDistance >= threshold ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn(
        "transition-opacity",
        (isRefreshing || pullDistance > 0) && "opacity-75"
      )}>
        {children}
      </div>
    </div>
  );
}

