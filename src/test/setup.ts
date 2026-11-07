import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server';
import { setScenario } from '../mocks/scenario';
import { clearViewMemory } from '../features/campaign/viewMemory';

// jsdom's AbortSignal is not the native one undici's Request expects. React Router's data
// router builds a Request per navigation, so drop non-native signals in tests only.
const NativeRequest = globalThis.Request;
class TestRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init?.signal) {
      const { signal: _signal, ...rest } = init;
      super(input, rest);
    } else {
      super(input, init);
    }
  }
}
globalThis.Request = TestRequest;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // jsdom's AbortSignal is not the native one undici's Request expects. Strip it outside
  // MSW's fetch wrapper, in tests only (real browsers are unaffected).
  const mswFetch = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => mswFetch(input, init ? { ...init, signal: null } : init);
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  setScenario('normal');
  clearViewMemory();
  localStorage.clear();
});
afterAll(() => server.close());
