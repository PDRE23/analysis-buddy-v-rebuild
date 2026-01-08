/**
 * Error Boundary for handling async errors in React components
 */
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidMount() {
    // Set up global error handlers for async errors
    this.setupErrorHandlers();
  }

  componentWillUnmount() {
    // Clean up error handlers
    this.cleanupErrorHandlers();
  }

  private setupErrorHandlers = () => {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    // Handle global JavaScript errors
    window.addEventListener('error', this.handleGlobalError);
  };

  private cleanupErrorHandlers = () => {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleGlobalError);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    // #region agent log
    const requestId = crypto.randomUUID();
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AsyncErrorBoundary.tsx:51',message:'AsyncErrorBoundary handleUnhandledRejection entry',data:{requestId,reasonType:typeof event.reason,isError:event.reason instanceof Error,hasOnError:!!this.props.onError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error('Unhandled promise rejection:', event.reason);
    
    // Create an error object from the rejection
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AsyncErrorBoundary.tsx:59',message:'AsyncErrorBoundary before setState',data:{requestId,errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    this.setState({ hasError: true, error });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AsyncErrorBoundary.tsx:64',message:'AsyncErrorBoundary before onError callback',data:{requestId,hasOnError:!!this.props.onError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, { componentStack: 'Async Error Handler' });
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AsyncErrorBoundary.tsx:68',message:'AsyncErrorBoundary handleUnhandledRejection exit',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Prevent the default browser behavior
    event.preventDefault();
  };

  private handleGlobalError = (event: ErrorEvent) => {
    // #region agent log
    const requestId = crypto.randomUUID();
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AsyncErrorBoundary.tsx:70',message:'AsyncErrorBoundary handleGlobalError entry',data:{requestId,errorMessage:event.message,hasError:!!event.error,filename:event.filename,lineno:event.lineno},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.error('Global error:', event.error);
    
    const error = event.error instanceof Error 
      ? event.error 
      : new Error(event.message || 'Unknown error');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AsyncErrorBoundary.tsx:77',message:'AsyncErrorBoundary before setState in handleGlobalError',data:{requestId,errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    this.setState({ hasError: true, error });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AsyncErrorBoundary.tsx:82',message:'AsyncErrorBoundary before onError in handleGlobalError',data:{requestId,hasOnError:!!this.props.onError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, { componentStack: 'Global Error Handler' });
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AsyncErrorBoundary.tsx:85',message:'AsyncErrorBoundary handleGlobalError exit',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-lg text-destructive">
                Async Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-muted-foreground text-sm">
                <p>
                  An error occurred while processing your request. 
                  This might be a temporary issue.
                </p>
              </div>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-muted p-3 rounded text-xs">
                  <summary className="cursor-pointer font-medium mb-1">
                    Error Details
                  </summary>
                  <pre className="bg-background p-2 rounded mt-1 overflow-auto">
                    {this.state.error.message}
                  </pre>
                  {this.state.error.stack && (
                    <pre className="bg-background p-2 rounded mt-1 overflow-auto">
                      {this.state.error.stack}
                    </pre>
                  )}
                </details>
              )}

              <div className="flex justify-center">
                <Button onClick={this.handleRetry} size="sm" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling async errors in functional components
 */
export const useAsyncErrorHandler = () => {
  const handleAsyncError = (error: Error, context?: string) => {
    console.error('Async error:', error, context);
    
    // In a real app, you might want to:
    // 1. Send to error tracking service
    // 2. Show a toast notification
    // 3. Update global error state
    
    // For now, we'll just log it
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };
    
    console.group('🚨 Async Error Report');
    console.error('Error:', errorReport);
    console.groupEnd();
  };

  const handleAsyncFunction = async <T,>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleAsyncError(error as Error, context);
      return null;
    }
  };

  return { handleAsyncError, handleAsyncFunction };
};
