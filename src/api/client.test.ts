import fc from 'fast-check';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { roomNameArb } from '../test/arbitraries';
import { apiGet } from './client';
import { getCampaignJobs, getRoomEvaluation } from './endpoints';
import { ApiRequestError } from './errors';

const cfg = { mode: 'live' as const, apiBasePath: 'http://localhost:3000/api', credentials: 'client' as const, authKey: 'k-123', basicToken: 'dG9rZW4=' };

describe('apiGet', () => {
  // Property 14 — Validates: Requirements 12.1
  it('Property 14: every request carries the three auth headers and a single-encoded room path', async () => {
    const seen: { headers: Headers; url: string }[] = [];
    server.use(
      http.get('http://localhost:3000/api/*', ({ request }) => {
        seen.push({ headers: request.headers, url: request.url });
        return HttpResponse.json([]);
      }),
    );
    await fc.assert(
      fc.asyncProperty(roomNameArb, fc.integer({ min: 1, max: 999 }), async (name, id) => {
        seen.length = 0;
        await apiGet(`/campaignHACKATHON/${id}`, (j) => ({ ok: true, value: j }), undefined, cfg);
        await apiGet(`/roomsHACKATHON/${encodeURIComponent(name)}`, (j) => ({ ok: true, value: j }), undefined, cfg);
        expect(seen).toHaveLength(2);
        for (const s of seen) {
          expect(s.headers.get('content-type')).toBe('application/json');
          expect(s.headers.get('myauthorizationx')).toBe('k-123');
          expect(s.headers.get('authorization')).toBe('Basic dG9rZW4=');
        }
      }),
      { numRuns: 50 },
    );
  });

  it('sends no auth headers from the browser in proxy-credentials mode', async () => {
    const captured: { headers: Headers | null } = { headers: null };
    server.use(
      http.get('http://localhost:3000/api/proxy-check', ({ request }) => {
        captured.headers = request.headers;
        return HttpResponse.json([]);
      }),
    );
    await apiGet('/proxy-check', (j) => ({ ok: true, value: j }), undefined, { ...cfg, credentials: 'proxy', authKey: null, basicToken: null });
    const headers = captured.headers;
    expect(headers).not.toBeNull();
    expect(headers?.get('authorization')).toBeNull();
    expect(headers?.get('myauthorizationx')).toBeNull();
    expect(headers?.get('content-type')).toBe('application/json');
  });

  it('maps HTTP, network and validation failures to typed errors', async () => {
    const parse = (j: unknown) => ({ ok: true as const, value: j });
    server.use(http.get('http://localhost:3000/api/http500', () => new HttpResponse('nope', { status: 500 })));
    server.use(http.get('http://localhost:3000/api/bad-json', () => new HttpResponse('{', { status: 200 })));
    server.use(http.get('http://localhost:3000/api/net', () => HttpResponse.error()));
    const kind = async (p: string) => {
      try {
        await apiGet(p, parse, undefined, cfg);
        return 'ok';
      } catch (e) {
        return e instanceof ApiRequestError ? e.apiError.kind : 'other';
      }
    };
    expect(await kind('/http500')).toBe('http');
    expect(await kind('/bad-json')).toBe('validation');
    expect(await kind('/net')).toBe('network');
  });
});

describe('endpoints against the mock layer', () => {
  it('loads a campaign and a room whose name contains a space', async () => {
    const jobs = await getCampaignJobs(119);
    expect(jobs).toHaveLength(4);
    const spaced = jobs.find((j) => j.roomName.includes(' '));
    expect(spaced).toBeDefined();
    const room = await getRoomEvaluation(spaced?.roomName ?? '');
    expect(room?.analysed).toHaveLength(1);
  });

  it('returns null for an unknown room and [] for an empty campaign', async () => {
    expect(await getRoomEvaluation('campaign_999interview~~nobody@example.test~~000')).toBeNull();
    expect(await getCampaignJobs(120)).toEqual([]);
  });
});
