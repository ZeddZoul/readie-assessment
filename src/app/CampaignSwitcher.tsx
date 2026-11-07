import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { LuArrowRight, LuChevronsUpDown, LuClock, LuFolder } from 'react-icons/lu';
import { useNavigate } from 'react-router';
import { queryKeys } from '../api/queries';
import { ComboboxPopover, type ComboboxItem } from '../components/ui/ComboboxPopover';
import type { EvaluationJob } from '../domain/types';
import { CAMPAIGN_DIRECTORY, parseCampaignQuery, readRecentCampaigns, rememberCampaign } from '../lib/recentCampaigns';

type OptionKind = 'open' | 'recent' | 'campaign';
export interface CampaignOption {
  readonly id: number;
  readonly kind: OptionKind;
}

const RECENT_LIMIT = 3;
const BROWSE_LIMIT = 8;

/**
 * Pure option builder (exported for tests). Sections, in order:
 * "Open campaign N" for a typed ID that isn't listed, up to 3 matching recents, then the directory
 * (first 8 while browsing, every match while searching), with no campaign listed twice.
 */
export function buildCampaignOptions(query: string, recents: readonly number[], directory: readonly number[]): CampaignOption[] {
  const typed = parseCampaignQuery(query);
  const needle = query.trim().replace(/^#\s*/, '');
  if (needle !== '' && typed === null && !/^\d+$/.test(needle)) return [];
  const matches = (id: number) => String(id).includes(needle);
  const recent = recents.filter(matches).slice(0, RECENT_LIMIT);
  const browse = directory.filter((id) => matches(id) && !recent.includes(id)).slice(0, needle ? undefined : BROWSE_LIMIT);
  const listed = [...recent, ...browse];
  return [
    ...(typed !== null && !listed.includes(typed) ? [{ id: typed, kind: 'open' as const }] : []),
    ...recent.map((id) => ({ id, kind: 'recent' as const })),
    ...browse.map((id) => ({ id, kind: 'campaign' as const })),
  ];
}

const SECTION_LABEL: Readonly<Record<OptionKind, string | undefined>> = { open: undefined, recent: 'Recent', campaign: 'Campaigns' };

/**
 * Header campaign switcher. Scales to any number of campaigns: browse recents and the configured
 * directory, search them, or type any campaign ID and press Enter.
 */
export function CampaignSwitcher({ current }: { readonly current: number | null }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<number[]>(() => readRecentCampaigns());

  // Any campaign the auditor lands on (including via a pasted link) becomes a recent.
  useEffect(() => {
    if (current !== null) setRecents(rememberCampaign(current));
  }, [current]);

  const options = useMemo(() => buildCampaignOptions(query, recents, CAMPAIGN_DIRECTORY), [query, recents]);

  /** Job title and candidate count for campaigns already in the cache, so options aren't bare numbers. */
  const describe = (campaignId: number): string | null => {
    const jobs = client.getQueryData<readonly EvaluationJob[]>(queryKeys.campaign(campaignId));
    if (!jobs) return null;
    const title = jobs.find((j) => j.jobTitle)?.jobTitle;
    const count = `${jobs.length} candidate${jobs.length === 1 ? '' : 's'}`;
    return title ? `${title} · ${count}` : count;
  };

  const items: ComboboxItem[] = options.map((o) => {
    const detail = o.kind === 'open' ? null : describe(o.id);
    const Icon = o.kind === 'open' ? LuArrowRight : o.kind === 'recent' ? LuClock : LuFolder;
    const section = SECTION_LABEL[o.kind];
    return {
      value: String(o.id),
      ...(section ? { section } : {}),
      selected: o.id === current,
      content: (
        <>
          <Icon aria-hidden="true" size={15} className={o.kind === 'open' ? 'shrink-0 text-brand-600' : 'shrink-0 text-slate-400'} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={o.id === current ? 'font-semibold text-slate-900 tabular-nums' : 'text-slate-700 tabular-nums'}>
              {o.kind === 'open' ? `Open campaign ${o.id}` : `Campaign ${o.id}`}
            </span>
            {detail ? <span className="truncate text-xs text-slate-500">{detail}</span> : null}
          </span>
        </>
      ),
    };
  });

  const nonNumeric = query.trim() !== '' && parseCampaignQuery(query) === null;

  return (
    <ComboboxPopover
      triggerLabel={current === null ? 'Choose campaign' : `Campaign ${current}. Switch campaign`}
      triggerClassName="flex items-center gap-2 rounded-xl bg-slate-100 py-1.5 pr-2.5 pl-3 text-sm transition-colors duration-200 hover:bg-slate-200/70"
      triggerContent={
        <>
          <span className="text-eyebrow hidden text-slate-600 sm:inline">Campaign</span>
          <span className="font-semibold text-slate-900 tabular-nums">{current ?? 'Choose'}</span>
          <LuChevronsUpDown aria-hidden="true" size={14} className="text-slate-500" />
        </>
      }
      tooltip="Switch campaign"
      dialogLabel="Switch campaign"
      inputLabel="Find or enter a campaign ID"
      placeholder="Search campaigns"
      inputMode="numeric"
      query={query}
      onQueryChange={setQuery}
      items={items}
      onChoose={(value) => {
        const campaignId = Number(value);
        setRecents(rememberCampaign(campaignId));
        if (campaignId !== current) void navigate(`/jobs/campaign/${campaignId}`);
      }}
      empty={nonNumeric ? 'Campaign IDs are numbers, like 119.' : 'No matching campaigns.'}
      footer="Not listed? Type its ID and press Enter."
    />
  );
}
