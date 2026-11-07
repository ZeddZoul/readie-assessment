import * as Tabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useRoomEvaluation } from '../../api/queries';
import { AsyncBoundary } from '../../components/ui/AsyncBoundary';
import { LuChevronLeft } from 'react-icons/lu';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { Reveal } from '../../components/ui/Reveal';
import { Tooltip } from '../../components/ui/Tooltip';
import { RoomSkeleton } from '../../components/ui/Skeletons';
import { Button, EmptyState } from '../../components/ui/States';
import type { AnalysedRecording, RoomEvaluation } from '../../domain/types';
import { parseRoomName } from '../../lib/roomName';
import { ROOM_TABS, TAB_LABELS, TAB_SHORT_LABELS, isRoomTab, type RoomTab } from '../../state/tab';
import { useRoomNameParam, useRoomUrlState } from './hooks';
import { CandidatePager } from './CandidatePager';
import { RecordingSelect, RoomHeader } from './RoomHeader';
import { IdentityTab } from './tabs/IdentityTab';
import { IntegrityTab } from './tabs/IntegrityTab';
import { TranscriptTab } from './tabs/TranscriptTab';

export function RoomPage() {
  const decoded = useRoomNameParam();
  const roomName = decoded.ok ? decoded.value : null;
  const state = useRoomEvaluation(roomName);
  const campaignId = roomName ? parseRoomName(roomName).campaignId : null;

  if (!decoded.ok) {
    return (
      <EmptyState
        title="This room link is invalid"
        action={
          <Link className="font-semibold text-brand-700 hover:underline" to="/jobs/campaign/119">
            Go to campaign 119
          </Link>
        }
      >
        The room name in the URL could not be decoded.
      </EmptyState>
    );
  }

  return (
    <section className="space-y-6" aria-label="Room evaluation">
      <div className="flex items-center justify-between gap-3">
        <BackLink campaignId={campaignId ?? (state.status === 'success' ? state.data.campaignId : null)} />
        {campaignId !== null && roomName ? <CandidatePager campaignId={campaignId} roomName={roomName} /> : null}
      </div>
      <AsyncBoundary
        state={state}
        loading={<RoomSkeleton />}
        empty={(retry) => (
          <EmptyState
            title="No recordings found for this room"
            action={
              <Button variant="primary" onClick={retry}>
                Reload
              </Button>
            }
          >
            {roomName && parseRoomName(roomName).email ? `No interview has been recorded for ${parseRoomName(roomName).email ?? ''} yet.` : 'No interview has been recorded for this room yet.'}
          </EmptyState>
        )}
      >
        {(room) => <RoomView key={room.roomName} room={room} />}
      </AsyncBoundary>
    </section>
  );
}

function BackLink({ campaignId }: { readonly campaignId: number | null }) {
  if (campaignId === null) return null;
  return (
    <Link
      to={`/jobs/campaign/${campaignId}`}
      className="group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-slate-600 transition-colors duration-200 hover:text-brand-700"
    >
      <LuChevronLeft aria-hidden="true" size={17} className="-ml-1 text-slate-500 transition-colors duration-200 group-hover:text-brand-700" />
      Back to campaign {campaignId}
    </Link>
  );
}

function tabCount(tab: RoomTab, r: AnalysedRecording | null): number | null {
  if (!r) return null;
  switch (tab) {
    case 'transcript':
      return r.transcript.length;
    case 'identity':
      return r.identity ? r.identity.anomalies.length : null;
    case 'integrity':
      return r.integrity ? r.integrity.flaggedFrames.length : null;
  }
}

/** Short crossfade when a tab panel (or the selected recording) changes; static under reduced motion. */
/** One tab failing to render (e.g. on unexpected data) must not take down the header or the other tabs. */
function TabBoundary({ resetKey, children }: { readonly resetKey: string; readonly children: ReactNode }) {
  return (
    <ErrorBoundary
      resetKey={resetKey}
      fallback={(_error, reset) => (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-card bg-white p-8 text-center shadow-card">
          <p className="font-semibold text-slate-900">This tab couldn’t be displayed</p>
          <p className="max-w-sm text-sm text-slate-600">Something in this recording’s data couldn’t be shown. The other tabs are unaffected.</p>
          <Button onClick={reset}>Try again</Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

function TabFade({ children }: { readonly children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

const COUNT_HINT: Readonly<Record<RoomTab, string>> = { transcript: 'transcript entries', identity: 'identity anomalies', integrity: 'flagged frames' };

function RoomView({ room }: { readonly room: RoomEvaluation }) {
  const { tab, setTab, selected, setRecording } = useRoomUrlState(room);

  return (
    <div className="space-y-6">
      <Reveal>
        <RoomHeader room={room} selected={selected} onOpenTab={setTab} />
      </Reveal>
      <Reveal index={1}>
        <Tabs.Root
          value={tab}
          onValueChange={(v) => {
            if (isRoomTab(v)) setTab(v);
          }}
          activationMode="manual"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs.List aria-label="Diagnostics" className="flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/70 ring-inset lg:w-auto">
              {ROOM_TABS.map((t) => {
                const count = tabCount(t, selected);
                return (
                  <Tooltip
                    key={t}
                    className="flex-1 lg:flex-none"
                    content={count === null ? TAB_LABELS[t] : `${count} ${COUNT_HINT[t]}`}
                    describe={count !== null}
                  >
                    <Tabs.Trigger
                      value={t}
                      aria-label={TAB_LABELS[t]}
                      className={clsx(
                        'group relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 sm:gap-2 sm:px-3.5 text-sm font-semibold whitespace-nowrap lg:flex-none',
                        'text-slate-600 transition-colors duration-200 ease-out-soft hover:text-slate-900 data-[state=active]:text-slate-900',
                      )}
                    >
                      {tab === t ? (
                        <motion.span
                          layoutId="room-tab-pill"
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg bg-white shadow-card ring-1 ring-slate-200/80"
                          transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                        />
                      ) : null}
                      <span className="relative sm:hidden">{TAB_SHORT_LABELS[t]}</span>
                      <span className="relative hidden sm:inline">{TAB_LABELS[t]}</span>
                      {count !== null ? (
                        <span
                          aria-hidden="true"
                          className="relative rounded-full bg-slate-200/80 px-1.5 py-px text-[11px] font-semibold text-slate-600 tabular-nums group-data-[state=active]:bg-brand-50 group-data-[state=active]:text-brand-700"
                        >
                          {count}
                        </span>
                      ) : null}
                    </Tabs.Trigger>
                  </Tooltip>
                );
              })}
            </Tabs.List>
            {room.analysed.length >= 2 && selected ? <RecordingSelect recordings={room.analysed} value={selected.id} onChange={setRecording} /> : null}
          </div>
          <Tabs.Content value="transcript" className="pt-6 outline-none">
            <TabFade key={selected?.id ?? 'none'}>
              <TabBoundary resetKey={selected?.id ?? 'none'}>
                <TranscriptTab recording={selected} />
              </TabBoundary>
            </TabFade>
          </Tabs.Content>
          <Tabs.Content value="identity" className="pt-6 outline-none">
            <TabFade key={selected?.id ?? 'none'}>
              <TabBoundary resetKey={selected?.id ?? 'none'}>
                <IdentityTab recording={selected} />
              </TabBoundary>
            </TabFade>
          </Tabs.Content>
          <Tabs.Content value="integrity" className="pt-6 outline-none">
            <TabFade key={selected?.id ?? 'none'}>
              <TabBoundary resetKey={selected?.id ?? 'none'}>
                <IntegrityTab recording={selected} />
              </TabBoundary>
            </TabFade>
          </Tabs.Content>
        </Tabs.Root>
      </Reveal>
    </div>
  );
}
