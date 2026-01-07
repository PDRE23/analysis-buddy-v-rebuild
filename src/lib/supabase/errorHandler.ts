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
    // #region agent log
    const requestId = crypto.randomUUID();
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:18',message:'Supabase errorHandler handleUnhandledRejection entry',data:{requestId,hasReason:!!event.reason,reasonType:typeof event.reason,isError:event.reason instanceof Error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const error = event.reason;
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';
    const errorStack = error?.stack?.toLowerCase() || '';
    const errorString = String(error).toLowerCase();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:27',message:'Supabase errorHandler before isSupabaseError check',data:{requestId,errorMessage,errorName,hasErrorStack:!!errorStack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:48',message:'Supabase errorHandler after isSupabaseError check',data:{requestId,isSupabaseError,errorLogged:window.__supabaseErrorLogged},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:60',message:'Supabase errorHandler suppressing Supabase error',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      event.preventDefault(); // Prevent default error logging
      return;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:64',message:'Supabase errorHandler logging non-Supabase error',data:{requestId,errorMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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

