import { Navigate, type RouteObject } from 'react-router';
import { EmptyState } from '../components/ui/States';
import { Layout } from './Layout';

function NotFound() {
  return <EmptyState title="Page not found">Pick a campaign above.</EmptyState>;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    // Route modules are code-split; nothing to show before the first one loads.
    HydrateFallback: () => null,
    children: [
      { index: true, element: <Navigate to="/jobs/campaign/119" replace /> },
      // Code-split per route: the room page (tabs, gauges, transcript) loads only when a room opens.
      { path: 'jobs/campaign/:campaignId', lazy: () => import('../features/campaign/CampaignPage').then((m) => ({ Component: m.CampaignPage })) },
      { path: 'jobs/room/*', lazy: () => import('../features/room/RoomPage').then((m) => ({ Component: m.RoomPage })) },
      { path: '*', element: <NotFound /> },
    ],
  },
];
