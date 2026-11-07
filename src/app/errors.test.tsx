import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createQueryClient } from '../api/queries';
import { renderApp } from '../test/renderApp';
import { isChunkLoadError, RouteError } from './errors';
import { Layout } from './Layout';

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/RoomPage-abc.js',
    'Importing a module script failed.',
    'error loading dynamically imported module',
    'Loading chunk 42 failed.',
  ])('recognises "%s"', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('ignores ordinary errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError('nope')).toBe(false);
  });
});

describe('route error boundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('shows a friendly error inside the layout, keeping the header usable', async () => {
    function Broken(): never {
      throw new Error('render failed');
    }
    const router = createMemoryRouter(
      [{ path: '/', element: <Layout />, errorElement: <RouteError />, children: [{ errorElement: <RouteError />, children: [{ path: 'broken', element: <Broken /> }] }] }],
      { initialEntries: ['/broken'] },
    );
    render(
      <QueryClientProvider client={createQueryClient({ retry: false })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Readie Audit Portal home' })).toBeInTheDocument();
  });
});

describe('custom 404 page', () => {
  it('offers ways back, including campaign quick links', async () => {
    renderApp('/jobs/campaigns-typo/119');
    expect(await screen.findByRole('heading', { name: /this page doesn’t exist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to campaigns' })).toHaveAttribute('href', '/');
    const quick = screen.getByRole('navigation', { name: 'Campaigns' });
    expect(quick).toHaveTextContent('Campaign 119');
  });
});
