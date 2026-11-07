export type ApiMode = 'mock' | 'live';

/**
 * Where the auth headers come from:
 * - `client`: the browser sends them (values from VITE_* env, inlined into the bundle).
 * - `proxy`: the same-origin proxy injects them from server-only env, so no secret ships to the browser.
 */
export type CredentialMode = 'client' | 'proxy';

export interface AppConfig {
  readonly mode: ApiMode;
  readonly apiBasePath: string;
  readonly credentials: CredentialMode;
  /** Sent as `MyAuthorizationx` (client credentials only). */
  readonly authKey: string | null;
  /** base64 `user:password`, sent as `Authorization: Basic <token>` (client credentials only). */
  readonly basicToken: string | null;
}

export interface RawEnv {
  readonly VITE_API_MODE?: string | undefined;
  readonly VITE_API_BASE_PATH?: string | undefined;
  readonly VITE_API_CREDENTIALS?: string | undefined;
  readonly VITE_API_AUTH_KEY?: string | undefined;
  readonly VITE_API_BASIC_TOKEN?: string | undefined;
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** Placeholder credentials used in mock mode, so the mock layer can still check headers. */
export const MOCK_AUTH_KEY = 'mock-auth-key';
export const MOCK_BASIC_TOKEN = 'bW9jazptb2Nr'; // base64("mock:mock")

const clean = (v: string | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

export function loadConfig(env: RawEnv): AppConfig {
  const requested = clean(env.VITE_API_MODE)?.toLowerCase() ?? null;
  if (requested !== null && requested !== 'mock' && requested !== 'live') {
    throw new ConfigError(`VITE_API_MODE must be "mock" or "live" (got "${requested}")`);
  }
  const credentialsRaw = clean(env.VITE_API_CREDENTIALS)?.toLowerCase() ?? 'client';
  if (credentialsRaw !== 'client' && credentialsRaw !== 'proxy') {
    throw new ConfigError(`VITE_API_CREDENTIALS must be "client" or "proxy" (got "${credentialsRaw}")`);
  }
  const credentials: CredentialMode = credentialsRaw;
  const authKey = clean(env.VITE_API_AUTH_KEY);
  const basicToken = clean(env.VITE_API_BASIC_TOKEN);
  const apiBasePath = clean(env.VITE_API_BASE_PATH) ?? '/api';
  const canGoLive = credentials === 'proxy' || (authKey !== null && basicToken !== null);
  const mode: ApiMode = requested ?? (canGoLive ? 'live' : 'mock');

  if (mode === 'mock') {
    // The mock layer checks headers like the real API, so the browser always sends placeholders.
    return { mode, apiBasePath, credentials: 'client', authKey: authKey ?? MOCK_AUTH_KEY, basicToken: basicToken ?? MOCK_BASIC_TOKEN };
  }
  if (credentials === 'proxy') return { mode, apiBasePath, credentials, authKey: null, basicToken: null };
  if (authKey === null) throw new ConfigError('Missing environment variable VITE_API_AUTH_KEY (required in live mode with client credentials)');
  if (basicToken === null) throw new ConfigError('Missing environment variable VITE_API_BASIC_TOKEN (required in live mode with client credentials)');
  return { mode, apiBasePath, credentials, authKey, basicToken };
}

let cached: AppConfig | null = null;

/** Lazily loads and caches config from `import.meta.env`. Throws ConfigError on bad live config. */
export function getConfig(): AppConfig {
  cached ??= loadConfig(import.meta.env);
  return cached;
}
