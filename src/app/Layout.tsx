import { Link, Outlet, useLocation } from 'react-router';
import { LogoIcon } from '../components/ui/Icons';
import { getConfig } from '../config/env';
import { decodeRoomSegment, parseRoomName, roomSegmentFromPathname } from '../lib/roomName';
import { CampaignSwitcher } from './CampaignSwitcher';
import { DevToolbar } from './DevToolbar';

/** Campaign implied by the current URL: the campaign route itself, or the campaign a room belongs to. */
function useCurrentCampaign(): number | null {
  const { pathname } = useLocation();
  const m = /^\/jobs\/campaign\/(\d+)/.exec(pathname);
  if (m?.[1]) return Number(m[1]);
  const seg = roomSegmentFromPathname(pathname);
  if (seg === null) return null;
  const decoded = decodeRoomSegment(seg);
  return decoded.ok ? parseRoomName(decoded.value).campaignId : null;
}

export function Layout() {
  const mode = getConfig().mode;
  const current = useCurrentCampaign();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/72 backdrop-blur-xl backdrop-saturate-[1.8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <Link to="/" className="group flex items-center gap-2.5 rounded-lg" aria-label="Readie Audit Portal home">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm ring-1 ring-brand-600/50">
              <LogoIcon width={18} />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">Readie</span>
              <span className="hidden text-[15px] font-medium tracking-tight text-slate-500 min-[400px]:inline">Audit Portal</span>
            </span>
            {mode === 'mock' ? (
              <span className="ml-1 hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline" title="Data served by the offline mock layer">
                Mock data
              </span>
            ) : null}
          </Link>
          <CampaignSwitcher current={current} />
        </div>
        <DevToolbar />
      </header>
      <main className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 sm:pt-10 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
