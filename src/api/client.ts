import { ConfigError, getConfig, type AppConfig } from '../config/env';
import type { Result } from '../domain/types';
import { ApiRequestError, type ApiError } from './errors';

/** Auth headers go on every request: from the browser (client credentials) or added by the proxy (proxy credentials). */
export function buildHeaders(config: AppConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.credentials === 'client' && config.authKey !== null && config.basicToken !== null) {
    headers.MyAuthorizationx = config.authKey;
    headers.Authorization = `Basic ${config.basicToken}`;
  }
  return headers;
}

const fail = (e: ApiError): never => {
  throw new ApiRequestError(e);
};

/**
 * GETs `path` (relative to the configured base path) with the auth headers on every call,
 * then validates and maps the body with `parse`. Throws ApiRequestError with a typed ApiError.
 */
export async function apiGet<T>(
  path: string,
  parse: (json: unknown) => Result<T, ApiError>,
  signal?: AbortSignal,
  config?: AppConfig,
): Promise<T> {
  let cfg: AppConfig;
  try {
    cfg = config ?? getConfig();
  } catch (e) {
    return fail({ kind: 'config', message: e instanceof ConfigError ? e.message : String(e) });
  }

  let response: Response;
  try {
    response = await fetch(`${cfg.apiBasePath}${path}`, { method: 'GET', headers: buildHeaders(cfg), signal: signal ?? null });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return fail({ kind: 'network', message: e instanceof Error ? e.message : String(e) });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return fail({ kind: 'http', status: response.status, message: (response.statusText || text).slice(0, 200) });
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return fail({ kind: 'validation', issues: ['Response body is not valid JSON'] });
  }

  const result = parse(json);
  return result.ok ? result.value : fail(result.error);
}
