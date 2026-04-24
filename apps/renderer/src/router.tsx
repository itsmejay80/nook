import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { AppShell } from './components/AppShell.js';
import { CanvasView } from './components/CanvasView.js';
import { SettingsPage } from './components/SettingsPage.js';

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CanvasView,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([homeRoute, settingsRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  history: createMemoryHistory({ initialEntries: ['/'] }),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
