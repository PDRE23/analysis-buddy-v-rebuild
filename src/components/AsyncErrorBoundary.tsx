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
    console.error('Unhandled promise rejection:', event.reason);
    
    // Create an error object from the rejection
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.setState({ hasError: true, error });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, { componentStack: 'Async Error Handler' });
    }
    
    // Prevent the default browser behavior
    event.preventDefault();
  };

  private handleGlobalError = (event: ErrorEvent) => {
    console.error('Global error:', event.error);
    
    const error = event.error instanceof Error 
      ? event.error 
      : new Error(event.message || 'Unknown error');
    
    this.setState({ hasError: true, error });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, { componentStack: 'Global Error Handler' });
    }
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
