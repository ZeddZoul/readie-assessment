import { Navigate, type RouteObject } from 'react-router';
import { RouteError } from './errors';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    // Route modules are code-split; nothing to show before the first one loads.
    HydrateFallback: () => null,
    // Errors in the layout itself fall back to the full-page error.
    errorElement: <RouteError />,
    children: [
      {
        // Pathless wrapper: errors in a page render inside the layout, so the header stays usable.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Navigate to="/jobs/campaign/119" replace /> },
          // Code-split per route: the room page (tabs, gauges, transcript) loads only when a room opens.
          { path: 'jobs/campaign/:campaignId', lazy: () => import('../features/campaign/CampaignPage').then((m) => ({ Component: m.CampaignPage })) },
          { path: 'jobs/room/*', lazy: () => import('../features/room/RoomPage').then((m) => ({ Component: m.RoomPage })) },
        ],
      },
    ],
  },
  // Unknown addresses render outside the app shell: no header or campaign switcher on a page that isn't part of a campaign.
  { path: '*', element: <NotFoundPage /> },
];
