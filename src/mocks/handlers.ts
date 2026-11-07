import { delay, http, HttpResponse } from 'msw';
import { getConfig } from '../config/env';
import { campaignJobs, roomRecordings } from './fixtures';
import { getScenario } from './scenario';

function checkAuth(request: Request): Response | null {
  const cfg = getConfig();
  const key = request.headers.get('MyAuthorizationx');
  const auth = request.headers.get('Authorization');
  if (!key || !auth?.startsWith('Basic ')) {
    return HttpResponse.json({ status: 401, error: 'Unauthorized' }, { status: 401 });
  }
  if (key !== cfg.authKey || auth !== `Basic ${cfg.basicToken ?? ''}`) {
    return HttpResponse.json({ status: 401, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Applies the active scenario. Returns a response to short-circuit, or null to continue normally. */
async function applyScenario(): Promise<Response | null> {
  switch (getScenario()) {
    case 'slow':
      await delay(1500);
      return null;
    case 'error-500':
      await delay(150);
      return HttpResponse.json({ status: 500, error: 'Internal Server Error' }, { status: 500 });
    case 'error-401':
      return HttpResponse.json({ status: 401, error: 'Unauthorized' }, { status: 401 });
    case 'invalid-shape':
      return HttpResponse.json({ unexpected: true });
    case 'normal':
      await delay(120);
      return null;
  }
}

/** The room segment is read from the raw URL so encoded "/" (%2F) survives. */
function rawSegmentAfter(url: string, marker: string): string {
  const path = new URL(url).pathname;
  const i = path.indexOf(marker);
  return i === -1 ? '' : path.slice(i + marker.length);
}

export function createHandlers(basePath = getConfig().apiBasePath) {
  return [
    http.get(`${basePath}/campaignHACKATHON/:campaignId`, async ({ request, params }) => {
      const scenario = await applyScenario();
      if (scenario) return scenario;
      const denied = checkAuth(request);
      if (denied) return denied;
      const id = Number(params.campaignId);
      return HttpResponse.json(campaignJobs[id] ?? []);
    }),
    http.get(`${basePath}/roomsHACKATHON/*`, async ({ request }) => {
      const scenario = await applyScenario();
      if (scenario) return scenario;
      const denied = checkAuth(request);
      if (denied) return denied;
      const raw = rawSegmentAfter(request.url, '/roomsHACKATHON/');
      // The live API rejects encoded percent signs (a double-encoded name) with 400.
      if (raw.includes('%25')) return HttpResponse.json({ status: 400, error: 'Bad Request' }, { status: 400 });
      let name: string;
      try {
        name = decodeURIComponent(raw);
      } catch {
        return HttpResponse.json({ status: 400, error: 'Bad Request' }, { status: 400 });
      }
      return HttpResponse.json(roomRecordings[name] ?? []);
    }),
  ];
}
