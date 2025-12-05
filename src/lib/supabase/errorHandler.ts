/**
 * Global error handler for Supabase fetch errors
 * Suppresses "Failed to fetch" errors when Supabase is unavailable
 */

// Extend Window interface to include our error logging flag and availability status
declare global {
  interface Window {
    __supabaseErrorLogged?: boolean;
    __supabaseUnavailable?: boolean;
  }
}

export function setupSupabaseErrorHandler() {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections (like Supabase fetch failures)
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';
    const errorStack = error?.stack?.toLowerCase() || '';
    const errorString = String(error).toLowerCase();
    
    // Check if this is a network/fetch error related to Supabase
    // Also check the stack trace for Supabase auth-js library paths
    const isSupabaseError = 
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('networkerror') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('name_not_resolved') ||
      errorMessage.includes('err_name_not_resolved') ||
      errorMessage.includes('supabase unavailable') ||
      errorString.includes('failed to fetch') ||
      errorString.includes('err_name_not_resolved') ||
      (errorName === 'typeerror' && errorMessage.includes('fetch')) ||
      errorStack.includes('supabase') ||
      errorStack.includes('auth-js') ||
      errorStack.includes('gotrueclient') ||
      errorStack.includes('helpers.js') ||
      errorStack.includes('fetch.js') ||
      errorStack.includes('@supabase/auth-js') ||
      errorStack.includes('gotrueclient.js') ||
      errorStack.includes('refreshaccesstoken') ||
      errorStack.includes('_autoRefreshTokenTick');
    
    if (isSupabaseError) {
      // Suppress the error - it's already handled by our timeout/fallback logic
      // Only log once per error type to avoid spam
      if (!window.__supabaseErrorLogged) {
        console.warn('⚠️ Supabase connection error (handled gracefully, using local storage)');
        window.__supabaseErrorLogged = true;
        // Reset after 5 seconds to allow new error types
        setTimeout(() => {
          window.__supabaseErrorLogged = false;
        }, 5000);
      }
      event.preventDefault(); // Prevent default error logging
      return;
    }
    
    // For other errors, log them normally
    console.error('Unhandled promise rejection:', error);
  };

  // Handle fetch errors globally
  const handleError = (event: ErrorEvent) => {
    const errorMessage = event.message?.toLowerCase() || '';
    const errorFilename = event.filename?.toLowerCase() || '';
    const errorStack = event.error?.stack?.toLowerCase() || '';
    const errorName = event.error?.name?.toLowerCase() || '';
    
    // Suppress Supabase-related fetch errors
    const isSupabaseError = 
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('networkerror') ||
      errorMessage.includes('name_not_resolved') ||
      errorMessage.includes('err_name_not_resolved') ||
      (errorName === 'typeerror' && errorMessage.includes('fetch')) ||
      errorFilename.includes('supabase') ||
      errorFilename.includes('auth-js') ||
      errorStack.includes('supabase') ||
      errorStack.includes('auth-js') ||
      errorStack.includes('gotrueclient') ||
      errorStack.includes('helpers.js') ||
      errorStack.includes('fetch.js') ||
      errorStack.includes('@supabase/auth-js') ||
      errorStack.includes('gotrueclient.js') ||
      errorStack.includes('refreshaccesstoken') ||
      errorStack.includes('_autoRefreshTokenTick');
    
    if (isSupabaseError) {
      // Only log once to avoid spam
      if (!window.__supabaseErrorLogged) {
        console.warn('⚠️ Network error (Supabase unavailable, using local storage)');
        window.__supabaseErrorLogged = true;
        setTimeout(() => {
          window.__supabaseErrorLogged = false;
        }, 5000);
      }
      event.preventDefault(); // Prevent default error logging
      return;
    }
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleError);

  // Return cleanup function
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleError);
  };
}

