import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigError, getConfig } from './config/env';
import './index.css';

async function bootstrap(): Promise<void> {
  const el = document.getElementById('root');
  if (!el) throw new Error('#root not found');
  const root = createRoot(el);

  let mode: 'mock' | 'live';
  try {
    mode = getConfig().mode;
  } catch (e) {
    const message = e instanceof ConfigError ? e.message : String(e);
    root.render(
      <div role="alert" className="mx-auto mt-16 max-w-xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
        <h1 className="text-lg font-bold">Configuration error</h1>
        <p className="mt-2 text-sm">{message}</p>
        <p className="mt-2 text-sm">Copy .env.example to .env.local and fill it in, or set VITE_API_MODE=mock.</p>
      </div>,
    );
    return;
  }

  if (mode === 'mock') {
    const { initScenario } = await import('./mocks/scenario');
    initScenario(window.location.search);
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
  }

  const { App } = await import('./app/App');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
