import React from "react";

/**
 * Chart Styling Utilities
 * Consistent chart styling and configuration
 */

export const chartColors = {
  primary: "#2563eb",
  secondary: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#06b6d4",
  purple: "#8b5cf6",
  pink: "#ec4899",
  
  // Color palettes
  palette1: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
  palette2: ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"],
  palette3: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"],
};

export const chartConfig = {
  // Default dimensions
  defaultWidth: 800,
  defaultHeight: 400,
  
  // Margins
  margin: {
    top: 20,
    right: 30,
    left: 20,
    bottom: 20,
  },
  
  // Animation
  animationDuration: 500,
  animationBegin: 0,
  
  // Grid
  grid: {
    stroke: "#e5e7eb",
    strokeDasharray: "3 3",
  },
  
  // Axes
  axis: {
    stroke: "#6b7280",
    fontSize: 12,
    tickSize: 6,
  },
  
  // Tooltip
  tooltip: {
    backgroundColor: "white",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  
  // Legend
  legend: {
    wrapperStyle: {
      paddingTop: "20px",
    },
    iconType: "line" as const,
  },
};

/**
 * Get color for index (cycles through palette)
 */
export function getColorForIndex(index: number, palette: string[] = chartColors.palette1): string {
  return palette[index % palette.length];
}

/**
 * Generate gradient definition for charts
 */
export function generateGradient(
  id: string,
  color: string,
  opacityStart: number = 0.3,
  opacityEnd: number = 0
): React.ReactNode {
  return React.createElement(
    "defs",
    null,
    React.createElement(
      "linearGradient",
      { id, x1: "0", y1: "0", x2: "0", y2: "1" },
      React.createElement("stop", {
        offset: "5%",
        stopColor: color,
        stopOpacity: opacityStart,
      }),
      React.createElement("stop", {
        offset: "95%",
        stopColor: color,
        stopOpacity: opacityEnd,
      })
    )
  );
}

/**
 * Format currency for chart labels
 */
export function formatChartCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format percentage for chart labels
 */
export function formatChartPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get responsive chart height
 */
export function getResponsiveChartHeight(deviceType: "mobile" | "tablet" | "desktop"): number {
  const heights = {
    mobile: 250,
    tablet: 350,
    desktop: 400,
  };
  return heights[deviceType];
}

