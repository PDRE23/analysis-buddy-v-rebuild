"use client";

/**
 * Tablet Layout Component
 * Optimized split-view layouts for tablets
 */

import React from "react";
import { cn } from "@/lib/utils";
import { detectDeviceType } from "@/lib/responsiveLayout";

interface TabletLayoutProps {
  children: [React.ReactNode, React.ReactNode];
  className?: string;
  reverse?: boolean; // Reverse order on smaller screens
}

/**
 * Split View Layout for Tablets
 * Side-by-side layout optimized for 10-12" screens
 */
export function TabletSplitView({
  children,
  className,
  reverse = false,
}: TabletLayoutProps) {
  const [left, right] = children;
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const checkTablet = () => {
      if (typeof window !== "undefined") {
        setIsTablet(detectDeviceType(window.innerWidth) === "tablet");
      }
    };

    checkTablet();
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
  }, []);

  return (
    <div
      className={cn(
        "flex",
        isTablet ? "flex-row" : reverse ? "flex-col-reverse" : "flex-col",
        "gap-4",
        className
      )}
    >
      <div className={cn(isTablet ? "flex-1" : "w-full")}>{left}</div>
      <div className={cn(isTablet ? "flex-1" : "w-full")}>{right}</div>
    </div>
  );
}

/**
 * Three Column Layout for Large Tablets
 */
interface TabletThreeColumnProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}

export function TabletThreeColumn({
  left,
  center,
  right,
  className,
}: TabletThreeColumnProps) {
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const checkTablet = () => {
      if (typeof window !== "undefined") {
        const deviceType = detectDeviceType(window.innerWidth);
        setIsTablet(deviceType === "tablet" || deviceType === "desktop");
      }
    };

    checkTablet();
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
  }, []);

  if (!isTablet) {
    // Mobile: Stack vertically
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div>{left}</div>
        <div>{center}</div>
        <div>{right}</div>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-3 gap-4", className)}>
      <div className="flex-1">{left}</div>
      <div className="flex-1">{center}</div>
      <div className="flex-1">{right}</div>
    </div>
  );
}

/**
 * Responsive Grid Layout
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  className?: string;
}

export function ResponsiveGrid({
  children,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  className,
}: ResponsiveGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        `grid-cols-1 sm:grid-cols-${tabletColumns} lg:grid-cols-${desktopColumns}`,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Adaptive Sidebar Layout
 */
interface AdaptiveSidebarProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  sidebarPosition?: "left" | "right";
  className?: string;
}

export function AdaptiveSidebar({
  sidebar,
  main,
  sidebarPosition = "left",
  className,
}: AdaptiveSidebarProps) {
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const checkTablet = () => {
      if (typeof window !== "undefined") {
        setIsTablet(detectDeviceType(window.innerWidth) === "tablet");
      }
    };

    checkTablet();
    window.addEventListener("resize", checkTablet);
    return () => window.removeEventListener("resize", checkTablet);
  }, []);

  if (!isTablet) {
    // Mobile: Stack vertically
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div>{sidebar}</div>
        <div>{main}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-4",
        sidebarPosition === "right" ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      <div className="w-80 flex-shrink-0">{sidebar}</div>
      <div className="flex-1">{main}</div>
    </div>
  );
}

