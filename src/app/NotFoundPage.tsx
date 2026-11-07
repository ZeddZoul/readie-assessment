import type { ReactNode } from 'react';
import { LuArrowLeft, LuClock, LuFolder } from 'react-icons/lu';
import { Link, useNavigate } from 'react-router';
import { Reveal } from '../components/ui/Reveal';
import { CAMPAIGN_DIRECTORY, readRecentCampaigns } from '../lib/recentCampaigns';

const QUICK_LINKS = 6;

/** Standalone: its own full-screen <main>. Embedded (inside the app layout, which already has <main>): a plain block. */
function Shell({ embedded, children }: { readonly embedded: boolean; readonly children: ReactNode }) {
  return embedded ? <div className="py-10 sm:py-16">{children}</div> : <main className="flex min-h-screen items-center justify-center px-4 py-12">{children}</main>;
}

/** Custom 404: explains the page wasn't found and offers one-click ways back into the portal. */
export function NotFoundPage({ embedded = false }: { readonly embedded?: boolean }) {
  const navigate = useNavigate();
  const recents = readRecentCampaigns();
  const quick = [...recents, ...CAMPAIGN_DIRECTORY.filter((id) => !recents.includes(id))].slice(0, QUICK_LINKS);
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  return (
    <Shell embedded={embedded}>
      <Reveal>
        <section aria-labelledby="not-found-title" className="mx-auto max-w-xl text-center">
        <p aria-hidden="true" className="text-[clamp(4.5rem,3rem+8vw,8rem)] leading-none font-bold tracking-tighter text-slate-200 select-none">
          404
        </p>
        <h1 id="not-found-title" className="text-display mt-4 text-slate-900">
          This page doesn’t exist
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">We couldn’t find anything at this address. It may have been mistyped, or the link may be out of date.</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-700">
            Go to campaigns
          </Link>
          {canGoBack ? (
            <button
              type="button"
              onClick={() => void navigate(-1)}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors duration-200 hover:bg-slate-200/70"
            >
              <LuArrowLeft aria-hidden="true" size={15} /> Go back
            </button>
          ) : null}
        </div>

        {quick.length ? (
          <nav aria-label="Campaigns" className="mt-12">
            <h2 className="text-eyebrow text-slate-500">Or jump to a campaign</h2>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {quick.map((id) => (
                <li key={id}>
                  <Link
                    to={`/jobs/campaign/${id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-card transition-colors duration-200 hover:text-brand-700"
                  >
                    {recents.includes(id) ? <LuClock aria-hidden="true" size={14} className="text-slate-400" /> : <LuFolder aria-hidden="true" size={14} className="text-slate-400" />}
                    Campaign {id}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        </section>
      </Reveal>
    </Shell>
  );
}
