/**
 * Error Boundary Component for catching and handling React errors
 */
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
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
  errorInfo: ErrorInfo | null;
  requestId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, requestId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null, requestId: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // #region agent log
    const requestId = crypto.randomUUID();
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:34',message:'ErrorBoundary componentDidCatch entry',data:{requestId,errorMessage:error.message,errorName:error.name,hasErrorInfo:!!errorInfo,hasOnError:!!this.props.onError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:38',message:'ErrorBoundary before setState',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Update state with error info and request ID
    this.setState({
      error,
      errorInfo,
      requestId
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:47',message:'ErrorBoundary before onError callback',data:{requestId,hasOnError:!!this.props.onError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:50',message:'ErrorBoundary before reportError',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Report to error tracking service (if available)
    // Pass requestId directly since setState is async and state won't be updated yet
    this.reportError(error, errorInfo, requestId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:51',message:'ErrorBoundary componentDidCatch exit',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }

  private reportError(error: Error, errorInfo: ErrorInfo, requestId?: string) {
    // Use provided requestId, fallback to state, or generate new one
    const finalRequestId = requestId || this.state.requestId || crypto.randomUUID();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:71',message:'ErrorBoundary reportError entry',data:{requestId:finalRequestId,errorMessage:error.message,hasStack:!!error.stack,hasComponentStack:!!errorInfo.componentStack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // In a real app, you'd send this to your error tracking service
    // For now, we'll just log it with more context
    const errorReport = {
      requestId: finalRequestId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:86',message:'ErrorBoundary reportError before console.error',data:{requestId:finalRequestId,errorReportKeys:Object.keys(errorReport)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.group('🚨 Error Report');
    console.error('Request ID:', finalRequestId);
    console.error('Error:', errorReport);
    console.error('Full Error Object:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();
    
    // Also log to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__lastError = {
        requestId: finalRequestId,
        error: errorReport,
        timestamp: new Date().toISOString()
      };
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ErrorBoundary.tsx:90',message:'ErrorBoundary reportError after console.error',data:{requestId:finalRequestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, requestId: null });
  };

  private handleGoHome = () => {
    // Reset error state and navigate to home
    this.setState({ hasError: false, error: null, errorInfo: null, requestId: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-muted-foreground">
                <p className="mb-4">
                  We encountered an unexpected error. This has been automatically reported to our team.
                </p>
                <p className="text-sm">
                  Please try refreshing the page or going back to the home screen.
                </p>
              </div>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-muted p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Error Details (Development)
                  </summary>
                  <div className="space-y-2 text-sm">
                    {this.state.requestId && (
                      <div>
                        <strong>Request ID:</strong>
                        <pre className="bg-background p-2 rounded mt-1 overflow-auto font-mono text-xs">
                          {this.state.requestId}
                        </pre>
                      </div>
                    )}
                    <div>
                      <strong>Error:</strong>
                      <pre className="bg-background p-2 rounded mt-1 overflow-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="bg-background p-2 rounded mt-1 overflow-auto text-xs">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="bg-background p-2 rounded mt-1 overflow-auto text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-center text-xs text-muted-foreground">
                <p>
                  If this problem persists, please contact support with the error details above.
                </p>
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
 * Hook for programmatic error reporting
 */
export const useErrorHandler = () => {
  const reportError = (error: Error, context?: string) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    console.group('🚨 Programmatic Error Report');
    console.error('Error:', errorReport);
    console.groupEnd();
    
    // In production, send to error tracking service
    // Example: Sentry.captureException(error, { extra: { context } });
  };

  return { reportError };
};

/**
 * Higher-order component for wrapping components with error boundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
