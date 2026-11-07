import type React from 'react';
import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { AlertIcon } from '../components/ui/Icons';
import { Button } from '../components/ui/States';
import { toError } from '../components/ui/ErrorBoundary';
import { NotFoundPage } from './NotFoundPage';

/**
 * After a new deploy, an open tab can request code-split chunks that no longer exist. Browsers word
 * this differently, so match the known messages.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = toError(error).message;
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed/i.test(message);
}

const RELOAD_FLAG = 'readie.reloadedForNewVersion';

function Panel({ title, children, actions }: { readonly title: string; readonly children: React.ReactNode; readonly actions: React.ReactNode }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-card bg-white p-6 text-center shadow-card sm:p-8">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <AlertIcon width={20} />
      </div>
      <h1 className="text-title text-slate-900">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>
    </div>
  );
}

const reload = (): void => window.location.reload();

/** Route-level error element: keeps the app header, explains the problem, and offers a way out. */
export function RouteError() {
  const error = useRouteError();
  const chunk = isChunkLoadError(error);

  // A stale chunk after a deploy: reload once automatically to pick up the new version.
  useEffect(() => {
    if (!chunk) return;
    try {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, '1');
    } catch {
      return;
    }
    reload();
  }, [chunk]);

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage embedded />;
  if (chunk) {
    return (
      <Panel title="A new version is available" actions={<Button variant="primary" onClick={reload}>Reload</Button>}>
        The portal was updated while this tab was open. Reload to continue.
      </Panel>
    );
  }
  return (
    <Panel
      title="Something went wrong"
      actions={
        <>
          <Button variant="primary" onClick={reload}>
            Reload page
          </Button>
          <Link className="text-sm font-semibold text-brand-700 hover:underline" to="/">
            Go to campaigns
          </Link>
        </>
      }
    >
      This page hit an unexpected error. Your data is safe; reloading usually fixes it.
      {import.meta.env.DEV ? <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-700">{toError(error).message}</pre> : null}
    </Panel>
  );
}

/** Last-resort fallback for errors outside the router (rendered without the app shell). */
export function AppCrash({ error }: { readonly error: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Panel title="The portal couldn’t start" actions={<Button variant="primary" onClick={reload}>Reload</Button>}>
        Something unexpected stopped the portal from loading.
        {import.meta.env.DEV ? <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-700">{error.message}</pre> : null}
      </Panel>
    </div>
  );
}
