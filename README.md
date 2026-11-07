# Readie Audit Portal

React 19 + TypeScript dashboard for reviewing candidate assessment sessions (Readie hackathon, 2026-11-05).
Spec: [`.kiro/specs/candidate-audit-portal/`](.kiro/specs/candidate-audit-portal/) (requirements → design → tasks).

## Quick start (offline, mock data)

```bash
npm install
npm run dev          # http://localhost:5173 → redirects to /jobs/campaign/119
```

With no credentials configured the app runs in **mock mode**: an MSW service worker serves synthetic fixtures
with the same shape as the live API. Nothing leaves the machine.

Mock scenarios (dev toolbar, or `?mock=` on first load): `normal`, `slow`, `error-500`, `error-401`, `invalid-shape`.

## Live API

```bash
cp .env.example .env.local   # set VITE_API_MODE=live and choose a credential mode
npm run dev
```

The API answers CORS preflight (`OPTIONS`) with `403`, so the browser always calls `/api/*` on the same origin and a
proxy forwards the request path unchanged to the Readie host. Two credential modes:

| `VITE_API_CREDENTIALS` | Who adds the auth headers | Secrets in the JS bundle? |
|---|---|---|
| `client` (default) | The browser, from `VITE_API_AUTH_KEY` / `VITE_API_BASIC_TOKEN` | Yes: `VITE_*` values are inlined |
| `proxy` | The proxy, from server-only `API_AUTH_KEY` / `API_BASIC_TOKEN` | No |

| Variable | Purpose |
|---|---|
| `VITE_API_MODE` | `mock` or `live` (defaults to `mock` when no credentials are configured) |
| `VITE_API_BASE_PATH` | Same-origin path the client calls (default `/api`) |
| `VITE_API_CREDENTIALS` | `client` or `proxy` (see above) |
| `VITE_CAMPAIGNS` | Campaigns listed in the header switcher (comma-separated; any other ID can be typed) |
| `VITE_API_AUTH_KEY`, `VITE_API_BASIC_TOKEN` | Client credentials: sent as `MyAuthorizationx` and `Authorization: Basic …` |
| `API_PROXY_TARGET` | Server-only: `https://readie001.uc.r.appspot.com/auth/recording/jobs` |
| `API_AUTH_KEY`, `API_BASIC_TOKEN` | Server-only proxy credentials, injected on every proxied request |

## Production

```bash
VITE_API_MODE=live VITE_API_CREDENTIALS=proxy npm run build
npm run serve   # node server/serve.mjs on :8080, reads .env.local for API_* vars
```

`server/serve.mjs` has no dependencies. It serves `dist/` (every app route falls back to `index.html`, which matters
because room URLs contain dots), proxies `GET /api/*` without re-encoding the path, and injects the server-only
credentials, so a proxy-mode build contains no secrets. A mock-mode build is a plain static site and can be hosted
anywhere that rewrites unknown paths to `index.html`.

## Scripts

| Command | What it does |
|---|---|
| `npm run check` | typecheck + lint (no `any`, all `no-unsafe-*` as errors) + `any` grep + unit/property/component tests |
| `npm run test:e2e` | Playwright against a production build in mock mode (uses installed Chrome locally) |
| `npm run test:e2e:live` | Opt-in smoke test against the real API (start `npm run dev` in live mode first) |
| `npm run serve` | Production server for `dist/` with the API proxy |
| `npm run build` | typecheck + production build |

## How it works

- `src/lib/roomName.ts` is the only place room names are encoded (`encodeURIComponent`, once) or decoded. The room
  page reads the still-encoded pathname and decodes it once, so names with `@`, spaces, `/`, `#`, `?` survive
  clicks, pasted URLs and refreshes. A double-encoded name would make the API answer 400.
- `src/api/schemas.ts` validates every response with zod schemas checked against explicit `Raw*` interfaces;
  `src/domain/adapters.ts` maps them to view models; shape mismatches become an Error state.
- **Type safety:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `checkJs` for the server and
  scripts. `npm run check:types` walks every file with the TypeScript checker and fails on explicit or implicit `any`,
  type assertions (other than `as const`), non-null assertions and suppression comments. `JSON.parse` and
  `Response.json()` are declared to return `unknown` (`src/types/safe-builtins.d.ts`).
- `src/state/async-state.ts`: every call is `loading | error | empty | success`, rendered with an exhaustive switch.
  Loading states use skeletons shaped like the real layout.
- **URL state:** room in the path, `?tab=` for the tab and `?rec=` for a non-default recording (the newest is the
  default and is left out). Changes push history; invalid values are corrected with one replace. A shared link
  therefore reopens exactly the same room, tab and recording.

### Built for fewer clicks

- The room header shows the verdict (integrity status, identity match, flagged frames); each tile opens its tab.
- A candidate finder (click “2 of 4”, or press **/**) searches every candidate by name or email; prev / next (or **J** / **K**) steps through the current filter. Both keep the tab.
- Status cards on the campaign page double as the filter, and filters are remembered when returning from a room.
- Room data is prefetched on hover/focus; **/** focuses search; one-click **Copy link**.

### Scales with data

- **Campaign switcher:** a searchable popover instead of fixed buttons. It lists recents and the configured
  campaigns (`VITE_CAMPAIGNS`, since the API has no list endpoint), shows job title and candidate count when known,
  and opens any typed ID with Enter.
- **Pagination:** the candidate list renders 25 rows per page (the API has no server-side paging); the page is
  remembered with the filters.
- **Search** filters with `useDeferredValue`, so typing stays smooth on large lists.
- **Prefetch on intent:** hover must rest 150ms (focus and touch prefetch immediately), so sweeping across rows
  sends no requests.
- **Long transcripts:** only the first 12 entries animate in; the rest render statically (no observer per entry).
- **Code-splitting:** each route is its own chunk, so the room page's code loads only when a room opens.

### Tooltips

Controls whose meaning isn't obvious (campaign switcher, “2 of 4” finder, the `/` key, chevrons, Copy link, verdict
tiles, tab counts, recording picker, sort) show a short hint with any keyboard shortcut. Tooltips appear on hover or
keyboard focus, hide on Escape, ignore touch, and are rendered in a portal so they're never clipped.

### UI

Apple-style minimal design: system font (SF Pro on Apple platforms), Apple greys, dodger-blue accent used sparingly,
status shown as a coloured dot with plain text. Custom accessible dropdown (listbox pattern), Motion for small
transitions (static under `prefers-reduced-motion`), react-icons (Lucide) for icons.

### API vs brief

The live API differs from the brief. Fields the brief names but the API lacks are derived in `src/domain/derive.ts`
(rules D1–D12 in the design doc):

| Brief | API | Handling |
|---|---|---|
| Verification Status | no field; `analyticsCompleted`, `percentageAnalyticCompleted`, assessment videos | D1 |
| `integrity_phase2` | `analytic.deepfake_phase2` | mapped |
| Gaze index, audio anomalies, flagged frames | four risk signals + `suspiciousTimeRanges` | D4–D6 |
| Liveness | not in `identity_phase1` | D7 (from synthetic-video signal) |
| PASSED / WARNING / FAILED | `disposition` strings | D3 |
| One evaluation per room | 0–16 recordings, some unanalysed | newest analysed by default + selector |


## "Before you submit" checklist → tests

| Checklist item | Covered by |
|---|---|
| Table loads, filters, searches, sorts for 119/120/122/123 | `tests/e2e/campaign.spec.ts`, `CampaignPage.test.tsx`, Properties 5–6 |
| Room works from row click, pasted URL, refresh | `tests/e2e/room.spec.ts`, Properties 1–3 |
| All three tabs render, active tab in URL | `room.spec.ts`, `RoomPage.test.tsx`, Property 11 |
| Back / Forward | `room.spec.ts` |
| Loading / Error / Empty / Success for every call | `tests/e2e/states.spec.ts`, Property 13 |
| No `any` | ESLint rules + `npm run check:types` (TypeScript-checker scan of app, tests, configs, server and scripts: explicit and implicit `any`, assertions, suppressions) |
| Runs fully offline | mock mode default; e2e runs offline |
| Credentials in env vars | `src/config/env.ts`, `.env.example`, `.env*.local` git-ignored; proxy mode keeps them out of the bundle |
