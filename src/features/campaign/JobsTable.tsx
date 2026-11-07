import { Link } from 'react-router';
import { useRoomPrefetchIntent } from '../../api/queries';
import { Avatar } from '../../components/ui/Avatar';
import { ChevronRightIcon } from '../../components/ui/Icons';
import { StatusTag } from '../../components/ui/StatusTag';
import type { EvaluationJob } from '../../domain/types';
import { roomPath } from '../../lib/roomName';
import { formatDate, formatTime } from '../../lib/time';
import type { SortDirection } from './filterSortJobs';

export interface JobsListProps {
  readonly jobs: readonly EvaluationJob[];
  readonly sort: SortDirection;
}

const openLabel = (job: EvaluationJob): string => `Open room for ${job.candidateName ?? job.candidateEmail}`;

function NameText({ job }: { readonly job: EvaluationJob }) {
  return job.candidateName ? <>{job.candidateName}</> : <span className="font-normal text-slate-500 italic">Unnamed candidate</span>;
}

function RoomId({ value }: { readonly value: string }) {
  return (
    <span className="relative z-10 inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-1 align-middle font-mono text-[11px] text-slate-600" title={value}>
      {value}
    </span>
  );
}

/** Desktop table. Each row is one stretched link, so click, keyboard Enter and open-in-new-tab all work. */
export function JobsTable({ jobs, sort }: JobsListProps) {
  const intent = useRoomPrefetchIntent();
  return (
    <table className="w-full table-fixed text-left text-sm">
      <colgroup>
        <col className="w-[23%]" />
        <col className="w-[21%]" />
        <col className="w-[21%]" />
        <col className="w-[18%]" />
        <col className="w-[13%]" />
        <col className="w-[4%]" />
      </colgroup>
      <thead>
        <tr className="border-b border-slate-200/80 text-xs text-slate-500">
          <th scope="col" className="px-4 py-3 font-medium">Candidate Name</th>
          <th scope="col" className="px-4 py-3 font-medium">Email</th>
          <th scope="col" className="px-4 py-3 font-medium">Room Identifier</th>
          <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap" aria-sort={sort === 'asc' ? 'ascending' : 'descending'}>
            Submission Timestamp
          </th>
          <th scope="col" className="px-4 py-3 font-medium">Verification Status</th>
          <th scope="col" className="px-2 py-3">
            <span className="sr-only">Open</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {jobs.map((job) => (
          <tr key={job.roomName} className="group relative transition-colors duration-150 hover:bg-brand-50/40 focus-within:bg-brand-50/40" data-testid="job-row">
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Avatar name={job.candidateName} email={job.candidateEmail} />
                <Link
                  to={roomPath(job.roomName)}
                  className="min-w-0 truncate font-semibold text-slate-900 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand-600"
                  aria-label={openLabel(job)}
                  {...intent(job.roomName)}
                >
                  <NameText job={job} />
                </Link>
              </div>
            </td>
            <td className="truncate px-4 py-3.5 text-slate-600">{job.candidateEmail}</td>
            <td className="px-4 py-3.5">
              <RoomId value={job.roomName} />
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <time className="relative z-10 flex flex-col" dateTime={job.submittedAt.toISOString()} title={job.submittedAtIso}>
                <span className="text-slate-900">{formatDate(job.submittedAt)}</span>
                <span className="text-xs text-slate-500">{formatTime(job.submittedAt)}</span>
              </time>
            </td>
            <td className="px-4 py-3.5">
              <StatusTag kind="verification" value={job.verificationStatus} />
            </td>
            <td className="px-2 py-3.5 text-slate-400 transition-colors duration-150 group-hover:text-brand-600">
              <ChevronRightIcon />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Narrow-screen list: same data and links as the table, laid out as cards so no column is clipped. */
export function JobsCards({ jobs }: JobsListProps) {
  const intent = useRoomPrefetchIntent();
  return (
    <ul className="divide-y divide-slate-100">
      {jobs.map((job) => (
        <li key={job.roomName} className="group relative px-4 py-4 transition-colors duration-150 hover:bg-brand-50/40 focus-within:bg-brand-50/40" data-testid="job-row">
          <div className="flex items-start gap-3">
            <Avatar name={job.candidateName} email={job.candidateEmail} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to={roomPath(job.roomName)}
                  className="min-w-0 truncate font-semibold text-slate-900 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand-600"
                  aria-label={openLabel(job)}
                  {...intent(job.roomName)}
                >
                  <NameText job={job} />
                </Link>
                <StatusTag kind="verification" value={job.verificationStatus} />
              </div>
              <p className="truncate text-sm text-slate-600">{job.candidateEmail}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <RoomId value={job.roomName} />
                <time className="text-xs text-slate-500" dateTime={job.submittedAt.toISOString()} title={job.submittedAtIso}>
                  {formatDate(job.submittedAt)} · {formatTime(job.submittedAt)}
                </time>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
