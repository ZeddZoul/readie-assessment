import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { createQueryClient } from '../api/queries';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { AppCrash } from './errors';
import { routes } from './router';

const router = createBrowserRouter(routes);

export function App() {
  const [client] = useState(() => createQueryClient());
  return (
    <ErrorBoundary fallback={(error) => <AppCrash error={error} />}>
      <QueryClientProvider client={client}>
      {/* Honour prefers-reduced-motion for every Motion animation. */}
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
