/**
 * Service Worker Registration
 * PWA offline support and caching
 */

const CACHE_NAME = "analysis-buddy-v2-v1";
const OFFLINE_URL = "/offline";

/**
 * Register service worker
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("Service Worker not supported");
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered:", registration);
        
        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New service worker available
                console.log("New service worker available");
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });

  // Listen for service worker messages
  navigator.serviceWorker.addEventListener("message", (event) => {
    console.log("Service Worker message:", event.data);
  });

  // Check for updates periodically
  setInterval(() => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
  }, 60000); // Check every minute
}

/**
 * Unregister service worker
 */
export function unregisterServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.log("Notifications not supported");
    return "denied";
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Show notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        ...options,
      });
    });
  } else {
    new Notification(title, {
      icon: "/icon-192x192.png",
      ...options,
    });
  }
}

/**
 * Schedule push notification
 */
export function scheduleNotification(
  title: string,
  body: string,
  delay: number, // milliseconds
  data?: unknown
): void {
  setTimeout(() => {
    showNotification(title, {
      body,
      data,
      tag: `notification-${Date.now()}`,
    });
  }, delay);
}

