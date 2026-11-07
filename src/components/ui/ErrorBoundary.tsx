import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Anything can be thrown; normalise it to an Error so fallbacks can rely on `message`. */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : 'Unknown error');
}

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback: (error: Error, reset: () => void) => ReactNode;
  /** When this value changes (e.g. the selected tab or recording), a caught error is cleared and children re-render. */
  readonly resetKey?: string;
  readonly onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
  readonly key: string | undefined;
}

/**
 * Catches render errors below it and shows `fallback` instead of unmounting the whole app.
 * React only offers this as a class API (getDerivedStateFromError / componentDidCatch).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: toError(error) };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(toError(error), info);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}
