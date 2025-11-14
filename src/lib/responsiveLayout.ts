/**
 * Responsive Layout Utilities
 * Detect device type and optimize layouts
 */

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface ScreenSize {
  width: number;
  height: number;
  deviceType: DeviceType;
}

/**
 * Detect device type from window size
 */
export function detectDeviceType(width: number): DeviceType {
  if (width < 768) {
    return "mobile";
  } else if (width < 1024) {
    return "tablet";
  } else {
    return "desktop";
  }
}

/**
 * Get current screen size
 */
export function getScreenSize(): ScreenSize {
  if (typeof window === "undefined") {
    return {
      width: 1920,
      height: 1080,
      deviceType: "desktop",
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const deviceType = detectDeviceType(width);

  return { width, height, deviceType };
}

// Note: useScreenSize hook should be implemented in a component file
// This file contains utility functions only

/**
 * Check if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return detectDeviceType(window.innerWidth) === "mobile";
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  if (typeof window === "undefined") return false;
  return detectDeviceType(window.innerWidth) === "tablet";
}

/**
 * Check if device is desktop
 */
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return detectDeviceType(window.innerWidth) === "desktop";
}

