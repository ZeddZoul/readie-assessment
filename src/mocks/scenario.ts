export const MOCK_SCENARIOS = ['normal', 'slow', 'error-500', 'error-401', 'invalid-shape'] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

const KEY = 'readie.mockScenario';
let current: MockScenario = 'normal';

const isScenario = (v: string | null): v is MockScenario => v !== null && (MOCK_SCENARIOS as readonly string[]).includes(v);

function readStorage(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Reads `?mock=` first, then the session's last choice. */
export function initScenario(search: string): MockScenario {
  const fromUrl = new URLSearchParams(search).get('mock');
  if (isScenario(fromUrl)) setScenario(fromUrl);
  else {
    const stored = readStorage();
    current = isScenario(stored) ? stored : 'normal';
  }
  return current;
}

export function getScenario(): MockScenario {
  return current;
}

export function setScenario(s: MockScenario): void {
  current = s;
  try {
    sessionStorage.setItem(KEY, s);
  } catch {
    // storage unavailable: keep in memory only
  }
}
