/**
 * TEMPORARY developer reference for the derivation rules (Requirement 16).
 * Dev builds only. Remove by deleting src/features/help/, its route in app/router.tsx
 * and the "Help" link in app/DevToolbar.tsx. Every example is computed live from derive.ts.
 */
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { ConfidenceGauge } from '../../components/ui/ConfidenceGauge';
import { PageHeader } from '../../components/ui/PageHeader';
import { Reveal } from '../../components/ui/Reveal';
import { StatusTag } from '../../components/ui/StatusTag';
import { parseRoomRecordings } from '../../domain/adapters';
import {
  CONFIDENCE_THRESHOLDS,
  deriveAudioAnomalyCount,
  deriveCompleteness,
  deriveGazeIndex,
  deriveIntegrityStatus,
  deriveLiveness,
  deriveVerificationStatus,
  speakerRole,
} from '../../domain/derive';
import type { RiskLevel } from '../../domain/types';
import { ROOMS, roomRecordings } from '../../mocks/fixtures';

const SECTIONS = [
  { id: 'differences', label: 'API vs. brief' },
  { id: 'verification', label: 'Verification status' },
  { id: 'integrity', label: 'Integrity status' },
  { id: 'gaze', label: 'Gaze tracking index' },
  { id: 'audio', label: 'Audio anomalies' },
  { id: 'frames', label: 'Flagged frames' },
  { id: 'liveness', label: 'Liveness' },
  { id: 'identity', label: 'Identity confidence' },
  { id: 'transcript', label: 'Transcript speakers' },
  { id: 'recordings', label: 'Recordings' },
] as const;

const DIFFERENCES: readonly { brief: string; api: string; we: string }[] = [
  {
    brief: 'A Verification Status of Completed, In progress or Failed for each candidate.',
    api: 'No status field. Only “analysis finished?”, a completion percentage and the list of uploaded videos.',
    we: 'Work it out from those three values (see Verification status).',
  },
  {
    brief: 'A Submission Timestamp.',
    api: 'The candidate’s creation time. Video timestamps use a different format and are sometimes missing.',
    we: 'Use the creation time, shown in your local time zone.',
  },
  {
    brief: 'A candidate name for every row.',
    api: 'The name is empty for most candidates.',
    we: 'Show “Unnamed candidate” and keep the email visible.',
  },
  {
    brief: 'One evaluation per room.',
    api: 'Up to 16 recordings per room, and only some of them have been analysed.',
    we: 'Show the newest analysed recording, with a picker for the others.',
  },
  {
    brief: 'A Phase 2 block called integrity_phase2.',
    api: 'It is called deepfake_phase2 and nests the transcript inside it.',
    we: 'Read it from where it actually is.',
  },
  {
    brief: 'Gaze Tracking Index, Audio Anomaly Count and Flagged Frames.',
    api: 'None of these exist. Phase 2 has four risk signals with confidence scores and observations.',
    we: 'Calculate all three from those signals (see their sections).',
  },
  {
    brief: 'A liveness detection result.',
    api: 'Not provided in the identity results.',
    we: 'Use the deepfake (synthetic video) check, which answers the same question.',
  },
  {
    brief: 'An overall Passed, Warning or Failed tag.',
    api: 'A free-text disposition such as PASS_WITH_LOW_RISK or REVIEW_REQUIRED.',
    we: 'Combine the disposition with the risk signals (see Integrity status).',
  },
];

function Section({ id, title, summary, children, index = 0 }: { readonly id: string; readonly title: string; readonly summary: ReactNode; readonly children: ReactNode; readonly index?: number }) {
  return (
    <Reveal index={index}>
      <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-card bg-white p-6 shadow-card sm:p-8">
        <h2 id={`${id}-title`} className="text-title text-slate-900">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">{summary}</p>
        <div className="mt-6 space-y-6">{children}</div>
      </section>
    </Reveal>
  );
}

function Steps({ title = 'How it’s decided', items }: { readonly title?: string; readonly items: readonly ReactNode[] }) {
  return (
    <div>
      <h3 className="text-eyebrow text-slate-500">{title}</h3>
      <ol className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
            <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 tabular-nums">
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Examples({ rows }: { readonly rows: readonly { readonly when: ReactNode; readonly result: ReactNode }[] }) {
  return (
    <div>
      <h3 className="text-eyebrow text-slate-500">Examples</h3>
      <dl className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-slate-50">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <dt className="text-sm text-slate-700">{r.when}</dt>
            <dd className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{r.result}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const RISK_LABEL: Readonly<Record<RiskLevel, string>> = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', UNKNOWN: 'unknown' };

function GazeScale() {
  const bands = [
    { label: 'High risk', range: '0–33', className: 'bg-red-100 text-red-800' },
    { label: 'Medium', range: '50', className: 'bg-amber-100 text-amber-900' },
    { label: 'Low risk', range: '67–100', className: 'bg-emerald-100 text-emerald-800' },
  ];
  return (
    <div>
      <h3 className="text-eyebrow text-slate-500">The scale</h3>
      <div className="mt-3 grid grid-cols-3 gap-1.5 overflow-hidden rounded-2xl text-center text-sm">
        {bands.map((b) => (
          <div key={b.label} className={clsx('px-3 py-3', b.className)}>
            <div className="font-semibold">{b.range}</div>
            <div className="text-xs opacity-80">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HelpPage() {
  const ada = parseRoomRecordings(roomRecordings[ROOMS.ada], ROOMS.ada);
  const failing = ada.ok ? (ada.value?.analysed.at(-1) ?? null) : null;
  const frames = failing?.integrity?.flaggedFrames ?? [];
  const integrityRow = (label: string, input: Parameters<typeof deriveIntegrityStatus>[0]) => ({
    when: label,
    result: <StatusTag kind="integrity" value={deriveIntegrityStatus(input)} />,
  });
  const allLow = { overallRisk: 'LOW', signalRisks: ['LOW', 'LOW', 'LOW', 'LOW'], disposition: 'PASS_WITH_LOW_RISK', humanReviewRequired: false, suspiciousRangeCount: 0 } as const;

  return (
    <article className="space-y-8">
      <Reveal>
        <PageHeader
          eyebrow="Developer reference · temporary"
          title="How the portal reads the data"
          subtitle="The Readie API doesn’t return some of the values the brief asks for. This page explains what each screen shows, where it comes from, and how it’s worked out. Every example below is calculated live by the same code the app uses."
        />
      </Reveal>

      <nav aria-label="On this page" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-card transition-colors duration-200 hover:text-brand-700"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <Section id="differences" title="What the API gave us vs. what the brief asked for" summary="The live API was checked on 5 November 2026. Where it differs from the brief, this is how the portal fills the gap.">
        <div className="space-y-3">
          {DIFFERENCES.map((d) => (
            <div key={d.brief} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3 sm:gap-6">
              <div>
                <p className="text-eyebrow text-slate-500">The brief asks for</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{d.brief}</p>
              </div>
              <div>
                <p className="text-eyebrow text-slate-500">The API returns</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{d.api}</p>
              </div>
              <div>
                <p className="text-eyebrow text-brand-700">So we</p>
                <p className="mt-1 text-sm leading-relaxed font-medium text-slate-900">{d.we}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="verification" title="Verification status" summary="Shown in the campaign table. It tells you whether a candidate’s analysis is done, still running, or never got anything to analyse.">
        <Steps
          items={[
            <>If the analysis is marked finished, or has reached 100%, it’s <strong>Completed</strong>.</>,
            <>If it’s at 0% and the candidate never uploaded a video, there’s nothing to check, so it’s <strong>Failed</strong>.</>,
            <>Anything else is <strong>In progress</strong>.</>,
          ]}
        />
        <Examples
          rows={[
            { when: 'Analysis finished', result: <StatusTag kind="verification" value={deriveVerificationStatus({ analyticsCompleted: true, percent: 100, videoCount: 1 })} /> },
            { when: '18% done, no video yet', result: <StatusTag kind="verification" value={deriveVerificationStatus({ analyticsCompleted: false, percent: 18, videoCount: 0 })} /> },
            { when: '0% done, but a video was uploaded', result: <StatusTag kind="verification" value={deriveVerificationStatus({ analyticsCompleted: false, percent: 0, videoCount: 1 })} /> },
            { when: '0% done and no video', result: <StatusTag kind="verification" value={deriveVerificationStatus({ analyticsCompleted: false, percent: 0, videoCount: 0 })} /> },
          ]}
        />
      </Section>

      <Section id="integrity" title="Integrity status" summary="The headline Passed / Warning / Failed tag on the Integrity tab. It combines the AI’s own verdict with its four risk signals, and always picks the more cautious answer.">
        <Steps
          items={[
            <>If <strong>any</strong> risk signal is high, or the verdict says fail or reject, it’s <strong>Failed</strong>.</>,
            <>Otherwise, if a human review is requested, any signal is medium or unclear, or a suspicious moment was found, it’s a <strong>Warning</strong>.</>,
            <>Only when everything is low risk and nothing is flagged is it <strong>Passed</strong>.</>,
          ]}
        />
        <Examples
          rows={[
            integrityRow('Every signal low, verdict “pass with low risk”', allLow),
            integrityRow('Every signal low, but verdict asks for a review', { ...allLow, disposition: 'REVIEW_REQUIRED' }),
            integrityRow('One signal is medium risk', { ...allLow, signalRisks: ['LOW', 'MEDIUM', 'LOW', 'LOW'] }),
            integrityRow('One signal is high risk', { ...allLow, signalRisks: ['LOW', 'LOW', 'HIGH', 'LOW'] }),
          ]}
        />
      </Section>

      <Section id="gaze" title="Gaze tracking index" summary="A score out of 100 for how much the candidate kept their attention on screen. It comes from the “off-screen assistance” signal: the lower that risk, the higher the score.">
        <GazeScale />
        <Steps
          items={[
            <>Low off-screen risk scores between 67 and 100. The more confident the AI is, the closer to 100.</>,
            <>Medium risk scores exactly 50.</>,
            <>High risk scores between 0 and 33. The more confident the AI is, the closer to 0.</>,
            <>If the risk is unknown, the score shows as n/a rather than guessing.</>,
          ]}
        />
        <Examples
          rows={(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'] as const).map((r) => {
            const g = deriveGazeIndex({ risk: r, confidence: 0.85 });
            return { when: `Off-screen risk ${RISK_LABEL[r]}, AI 85% confident`, result: g === null ? 'n/a' : `${g} / 100` };
          })}
        />
      </Section>

      <Section id="audio" title="Audio anomaly count" summary="How many audio problems were spotted, such as lips not matching speech or a second voice in the room.">
        <Steps
          items={[
            <>If the audio/video consistency signal isn’t low risk, each of its observations counts (at least one).</>,
            <>Every suspicious moment that mentions audio, voice or speech adds one more.</>,
          ]}
        />
        <Examples
          rows={[
            { when: 'Audio signal low risk, nothing suspicious', result: deriveAudioAnomalyCount({ risk: 'LOW', observationCount: 3 }, []) },
            { when: 'Audio signal medium risk with 2 observations', result: deriveAudioAnomalyCount({ risk: 'MEDIUM', observationCount: 2 }, []) },
            {
              when: '…plus one suspicious moment: “second voice heard”',
              result: deriveAudioAnomalyCount({ risk: 'MEDIUM', observationCount: 2 }, [{ label: '00:50', timestampSec: 50, category: 'AUDIO', reason: 'Second voice heard' }]),
            },
          ]}
        />
      </Section>

      <Section id="frames" title="Flagged frames" summary="The moments in the video worth a closer look, listed in time order on the Integrity tab.">
        <Steps
          title="What gets flagged"
          items={[
            <>Observations from the person-continuity, off-screen and deepfake checks, but only when that check isn’t low risk (for example a second face, a second device, or someone swapping in).</>,
            <>Every suspicious time range the AI reported.</>,
            <>One extra entry when Phase 1 saw more than one person in the video.</>,
          ]}
        />
        {frames.length ? (
          <div>
            <h3 className="text-eyebrow text-slate-500">Example: a failing recording from the test data</h3>
            <ul className="mt-3 divide-y divide-slate-100 rounded-2xl bg-slate-50">
              {frames.map((f, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700">
                  <span className="w-12 shrink-0 font-mono text-xs text-slate-500 tabular-nums">{f.timestampLabel ?? '—'}</span>
                  <span>{f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section id="liveness" title="Liveness" summary="Whether a real, live person was on camera. The API has no liveness field, so the portal uses the deepfake check, which answers the same question.">
        <Examples
          rows={(['LOW', 'HIGH', 'UNKNOWN'] as const).map((r) => {
            const l = deriveLiveness({ risk: r, confidence: 0.9 });
            const label = l?.passed === null ? 'Undetermined' : l?.passed ? 'Live person' : 'Possible spoof';
            const tone = l?.passed === null ? 'neutral' : l?.passed ? 'good' : 'bad';
            return { when: `Deepfake risk ${RISK_LABEL[r]}`, result: <StatusTag kind="custom" value={label} tone={tone} /> };
          })}
        />
      </Section>

      <Section
        id="identity"
        title="Identity confidence"
        summary={`How sure the AI is that the interviewee matches the reference video. At ${Math.round(CONFIDENCE_THRESHOLDS.pass * 100)}% or more it’s strong; between ${Math.round(CONFIDENCE_THRESHOLDS.warn * 100)}% and ${Math.round(CONFIDENCE_THRESHOLDS.pass * 100)}% it needs review; below that it’s weak. A poor-quality video is also listed as an anomaly.`}
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <ConfidenceGauge label="Strong match" value={0.86} />
          <ConfidenceGauge label="Needs review" value={0.67} />
          <ConfidenceGauge label="Weak match" value={0.41} />
        </div>
      </Section>

      <Section id="transcript" title="Transcript speakers" summary="Who said what. The candidate sits on the left in grey. The interviewer (or AI) sits on the right in blue, and every other participant appears on the right as a white system-style note with their own name. Timestamps sit at the bottom of each message.">
        <Examples
          rows={['INTERVIEWER', 'AI', 'INTERVIEWEE', 'PARTICIPANT'].map((s) => {
            const role = speakerRole(s);
            return { when: `Speaker “${s.toLowerCase()}”`, result: role === 'interviewer' ? 'Interviewer · right, blue' : role === 'candidate' ? 'Candidate · left, grey' : 'Participant · right, system note' };
          })}
        />
      </Section>

      <Section id="recordings" title="Recordings and completeness" summary="A room can hold several recordings. Here’s which one you see and what “analysis complete” means.">
        <Steps
          title="The rules"
          items={[
            <>Only recordings the AI has analysed can be shown. The newest one opens by default, and the picker switches between them.</>,
            <>Times without a time zone come from the server in UTC, and are shown in your local time.</>,
            <>If any recording is fully analysed, the room is <strong>complete</strong>; if one is part-way, it’s <strong>partial</strong>; if none have started, it’s <strong>not analysed</strong>.</>,
          ]}
        />
        <Examples
          rows={[
            { when: 'One recording done, one not started', result: deriveCompleteness(['N', 'Y']) },
            { when: 'One part-way, one not started', result: deriveCompleteness(['N', 'P']) },
            { when: 'Nothing started', result: deriveCompleteness(['N']) },
          ]}
        />
      </Section>

      <p className="text-center text-xs text-slate-500">Source: src/domain/derive.ts · Remove this page by deleting src/features/help/.</p>
    </article>
  );
}
