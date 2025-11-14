/**
 * Accessibility Utilities
 * Helpers for keyboard navigation, focus management, and ARIA
 */

/**
 * Focus management
 */
export function focusElement(selector: string): void {
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    element.focus();
  }
}

export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener("keydown", handleTabKey);

  // Focus first element
  if (firstFocusable) {
    firstFocusable.focus();
  }

  // Return cleanup function
  return () => {
    element.removeEventListener("keydown", handleTabKey);
  };
}

/**
 * Keyboard shortcuts
 */
export function registerKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options?: { preventDefault?: boolean; stopPropagation?: boolean }
): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const modifiers = {
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };

    // Check if all required keys are pressed
    const allKeysPressed = keys.every((k) => {
      const kLower = k.toLowerCase();
      if (kLower === "ctrl" || kLower === "cmd") return modifiers.ctrl;
      if (kLower === "shift") return modifiers.shift;
      if (kLower === "alt") return modifiers.alt;
      return key === kLower;
    });

    if (allKeysPressed) {
      if (options?.preventDefault) {
        e.preventDefault();
      }
      if (options?.stopPropagation) {
        e.stopPropagation();
      }
      callback();
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite"): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get accessible label
 */
export function getAccessibleLabel(
  label?: string,
  ariaLabel?: string,
  ariaLabelledBy?: string
): { "aria-label"?: string; "aria-labelledby"?: string } {
  if (ariaLabel) {
    return { "aria-label": ariaLabel };
  }
  if (ariaLabelledBy) {
    return { "aria-labelledby": ariaLabelledBy };
  }
  if (label) {
    return { "aria-label": label };
  }
  return {};
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    rect.width > 0 &&
    rect.height > 0 &&
    !element.hasAttribute("aria-hidden")
  );
}

/**
 * Skip to main content link
 */
export function createSkipToContentLink(): HTMLElement {
  const link = document.createElement("a");
  link.href = "#main-content";
  link.className = "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded";
  link.textContent = "Skip to main content";
  return link;
}

