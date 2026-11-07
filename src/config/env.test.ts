import { ConfigError, MOCK_AUTH_KEY, loadConfig } from './env';

describe('loadConfig', () => {
  it('defaults to mock mode with placeholder credentials when nothing is set', () => {
    const c = loadConfig({});
    expect(c.mode).toBe('mock');
    expect(c.apiBasePath).toBe('/api');
    expect(c.authKey).toBe(MOCK_AUTH_KEY);
  });

  it('switches to live mode when both credentials are present and mode is unset', () => {
    const c = loadConfig({ VITE_API_AUTH_KEY: 'k', VITE_API_BASIC_TOKEN: 't' });
    expect(c).toEqual({ mode: 'live', apiBasePath: '/api', credentials: 'client', authKey: 'k', basicToken: 't' });
  });

  it('respects explicit mock mode even with credentials', () => {
    expect(loadConfig({ VITE_API_MODE: 'mock', VITE_API_AUTH_KEY: 'k', VITE_API_BASIC_TOKEN: 't' }).mode).toBe('mock');
  });

  it('fails fast naming the missing variable in live mode', () => {
    expect(() => loadConfig({ VITE_API_MODE: 'live', VITE_API_BASIC_TOKEN: 't' })).toThrow(/VITE_API_AUTH_KEY/);
    expect(() => loadConfig({ VITE_API_MODE: 'live', VITE_API_AUTH_KEY: 'k' })).toThrow(/VITE_API_BASIC_TOKEN/);
    expect(() => loadConfig({ VITE_API_MODE: 'live', VITE_API_AUTH_KEY: 'k' })).toThrow(ConfigError);
  });

  it('proxy credentials go live without client keys and keep secrets out of the bundle', () => {
    expect(loadConfig({ VITE_API_CREDENTIALS: 'proxy' })).toEqual({ mode: 'live', apiBasePath: '/api', credentials: 'proxy', authKey: null, basicToken: null });
    expect(loadConfig({ VITE_API_MODE: 'live', VITE_API_CREDENTIALS: 'proxy', VITE_API_AUTH_KEY: 'k' }).authKey).toBeNull();
    expect(() => loadConfig({ VITE_API_CREDENTIALS: 'server' })).toThrow(/VITE_API_CREDENTIALS/);
  });

  it('rejects an unknown mode', () => {
    expect(() => loadConfig({ VITE_API_MODE: 'staging' })).toThrow(/VITE_API_MODE/);
  });
});
