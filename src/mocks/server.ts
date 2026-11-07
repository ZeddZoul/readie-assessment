import { setupServer } from 'msw/node';
import { createHandlers } from './handlers';

/** Node-side MSW server for Vitest (tests use an absolute base path, see vite.config.ts `test.env`). */
export const server = setupServer(...createHandlers());
