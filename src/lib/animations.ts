/**
 * Animation Utilities
 * Reusable animation constants and helpers
 */

export const animations = {
  // Durations
  fast: "150ms",
  base: "250ms",
  slow: "350ms",
  slower: "500ms",
  
  // Easing functions
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  
  // Transitions
  fade: "opacity",
  slide: "transform",
  scale: "transform",
  all: "all",
};

/**
 * Generate transition string
 */
export function createTransition(
  properties: string | string[],
  duration: string = animations.base,
  easing: string = animations.easeInOut
): string {
  const props = Array.isArray(properties) ? properties.join(", ") : properties;
  return `${props} ${duration} ${easing}`;
}

/**
 * Common animation classes
 */
export const animationClasses = {
  fadeIn: "animate-fade-in",
  fadeOut: "animate-fade-out",
  slideInUp: "animate-slide-in-up",
  slideInDown: "animate-slide-in-down",
  slideInLeft: "animate-slide-in-left",
  slideInRight: "animate-slide-in-right",
  scaleIn: "animate-scale-in",
  scaleOut: "animate-scale-out",
  spin: "animate-spin",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
};

/**
 * Keyframe animations for Tailwind
 */
export const keyframes = {
  fadeIn: {
    "0%": { opacity: "0" },
    "100%": { opacity: "1" },
  },
  fadeOut: {
    "0%": { opacity: "1" },
    "100%": { opacity: "0" },
  },
  slideInUp: {
    "0%": { transform: "translateY(100%)", opacity: "0" },
    "100%": { transform: "translateY(0)", opacity: "1" },
  },
  slideInDown: {
    "0%": { transform: "translateY(-100%)", opacity: "0" },
    "100%": { transform: "translateY(0)", opacity: "1" },
  },
  slideInLeft: {
    "0%": { transform: "translateX(-100%)", opacity: "0" },
    "100%": { transform: "translateX(0)", opacity: "1" },
  },
  slideInRight: {
    "0%": { transform: "translateX(100%)", opacity: "0" },
    "100%": { transform: "translateX(0)", opacity: "1" },
  },
  scaleIn: {
    "0%": { transform: "scale(0.95)", opacity: "0" },
    "100%": { transform: "scale(1)", opacity: "1" },
  },
  scaleOut: {
    "0%": { transform: "scale(1)", opacity: "1" },
    "100%": { transform: "scale(0.95)", opacity: "0" },
  },
};

