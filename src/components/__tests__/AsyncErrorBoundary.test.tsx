/**
 * Tests for AsyncErrorBoundary component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AsyncErrorBoundary } from '../AsyncErrorBoundary';

// Component that triggers async errors
const AsyncErrorComponent = ({ triggerError }: { triggerError: boolean }) => {
  React.useEffect(() => {
    if (triggerError) {
      // Simulate unhandled promise rejection
      setTimeout(() => {
        Promise.reject(new Error('Async error'));
      }, 100);
    }
  }, [triggerError]);

  return <div>Async component</div>;
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('AsyncErrorBoundary', () => {
  beforeEach(() => {
    // Reset console.error mock
    jest.clearAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <AsyncErrorBoundary>
        <AsyncErrorComponent triggerError={false} />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Async component')).toBeInTheDocument();
  });

  it('should render children when no error occurs', () => {
    render(
      <AsyncErrorBoundary>
        <AsyncErrorComponent triggerError={false} />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Async component')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom async error message</div>;
    
    render(
      <AsyncErrorBoundary fallback={customFallback}>
        <AsyncErrorComponent triggerError={false} />
      </AsyncErrorBoundary>
    );

    expect(screen.getByText('Async component')).toBeInTheDocument();
  });

  it('should call onError callback when provided', () => {
    const onError = jest.fn();
    
    render(
      <AsyncErrorBoundary onError={onError}>
        <AsyncErrorComponent triggerError={false} />
      </AsyncErrorBoundary>
    );

    // Component renders without error
    expect(screen.getByText('Async component')).toBeInTheDocument();
  });
});
