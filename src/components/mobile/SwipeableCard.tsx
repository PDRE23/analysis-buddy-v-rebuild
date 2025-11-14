"use client";

/**
 * Swipeable Card Component
 * Touch-friendly swipe gestures for mobile
 */

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  showIndicators?: boolean;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  showIndicators = false,
  className,
}: SwipeableCardProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      return;
    }

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Horizontal swipe
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      } else if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    } else {
      // Vertical swipe
      if (isUpSwipe && onSwipeUp) {
        onSwipeUp();
      } else if (isDownSwipe && onSwipeDown) {
        onSwipeDown();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
  };

  // Calculate translate for visual feedback
  const getTranslate = () => {
    if (!touchStart || !touchEnd) return { x: 0, y: 0 };
    
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    
    // Apply resistance
    const resistance = 0.3;
    return {
      x: deltaX * resistance,
      y: deltaY * resistance,
    };
  };

  const translate = getTranslate();

  return (
    <div
      ref={cardRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={cn(
        "transition-transform duration-150 ease-out",
        isDragging && "select-none",
        className
      )}
      style={{
        transform: `translate(${translate.x}px, ${translate.y}px)`,
      }}
    >
      {children}
      
      {/* Swipe Indicators */}
      {showIndicators && isDragging && touchStart && touchEnd && (
        <>
          {Math.abs(touchEnd.x - touchStart.x) > 20 && (
            <div className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              {touchEnd.x > touchStart.x ? (
                <ChevronRight className="h-8 w-8 text-primary opacity-50" />
              ) : (
                <ChevronLeft className="h-8 w-8 text-primary opacity-50" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

