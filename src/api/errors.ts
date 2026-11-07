export type ApiError =
  | { readonly kind: 'network'; readonly message: string }
  | { readonly kind: 'http'; readonly status: number; readonly message: string }
  | { readonly kind: 'validation'; readonly issues: readonly string[] }
  | { readonly kind: 'config'; readonly message: string };

/** Thrown by the API client so TanStack Query sees an `Error` while the UI keeps the typed union. */
export class ApiRequestError extends Error {
  override name = 'ApiRequestError';
  constructor(readonly apiError: ApiError) {
    super(describeApiError(apiError));
  }
}

export function isAuthError(e: ApiError): boolean {
  return e.kind === 'http' && (e.status === 401 || e.status === 403);
}

/** Network errors and 5xx are worth retrying; 4xx, validation and config errors are not. */
export function isRetryable(e: ApiError): boolean {
  return e.kind === 'network' || (e.kind === 'http' && e.status >= 500);
}

export function describeApiError(e: ApiError): string {
  switch (e.kind) {
    case 'network':
      return `Could not reach the API: ${e.message}`;
    case 'http':
      if (isAuthError(e)) {
        return 'API credentials were rejected. Check VITE_API_AUTH_KEY and VITE_API_BASIC_TOKEN in your .env.local.';
      }
      return `The API responded with ${e.status}${e.message ? `: ${e.message}` : ''}`;
    case 'validation':
      return 'Unexpected response from the API.';
    case 'config':
      return e.message;
  }
}
