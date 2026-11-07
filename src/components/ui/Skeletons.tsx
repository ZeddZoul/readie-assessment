import clsx from 'clsx';
import type { ReactNode } from 'react';

/** A single placeholder shape. Pulses only when motion is allowed. */
export function Bone({ className }: { readonly className?: string }) {
  return <span aria-hidden="true" className={clsx('block rounded-full bg-slate-200/70 motion-safe:animate-pulse', className)} />;
}

function Loading({ label, children, className }: { readonly label: string; readonly children: ReactNode; readonly className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={className}>
      {children}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

/** Mirrors the campaign page: four status cards, then the toolbar and rows of the candidate table. */
export function CampaignSkeleton({ rows = 4 }: { readonly rows?: number }) {
  return (
    <Loading label="Loading" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-card bg-white p-3.5 shadow-card sm:p-4">
            <Bone className="h-3 w-24" />
            <Bone className="mt-3 h-7 w-10 rounded-lg" />
            <Bone className="mt-3 h-1 w-full" />
            <Bone className="mt-3 hidden h-2.5 w-28 sm:block" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 p-4 md:flex-row md:items-center md:justify-between">
          <Bone className="h-9 w-full rounded-xl md:max-w-sm" />
          <div className="flex items-center justify-between gap-4">
            <Bone className="h-3 w-36" />
            <Bone className="h-8 w-40 rounded-xl" />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <Bone className="size-9 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
                <Bone className="h-3 w-32" />
                <Bone className="h-3 w-44" />
                <Bone className="hidden h-5 w-48 rounded-md lg:block" />
                <Bone className="hidden h-3 w-24 lg:block" />
              </div>
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

/** Mirrors the room page: header card with verdict tiles, the tab bar and the first panel. */
export function RoomSkeleton() {
  return (
    <Loading label="Loading room evaluation" className="space-y-6">
      <div className="rounded-card bg-white p-4 shadow-card sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <Bone className="size-11 shrink-0 sm:size-14" />
          <div className="min-w-0 flex-1">
            <Bone className="h-2.5 w-24" />
            <Bone className="mt-2.5 h-5 w-3/5 rounded-lg" />
            <Bone className="mt-2.5 h-2.5 w-4/5 max-w-sm" />
          </div>
          <Bone className="size-8 sm:h-8 sm:w-24" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 sm:gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 px-3 py-3">
              <Bone className="h-2.5 w-16" />
              <Bone className="mt-2.5 h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Bone className="h-10 w-full rounded-xl lg:w-96" />
        <Bone className="h-9 w-full rounded-xl sm:w-80" />
      </div>
      <div className="space-y-4">
        <div className="rounded-card bg-white p-5 shadow-card">
          <Bone className="h-3 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-card bg-white p-5 shadow-card">
              <Bone className="h-3 w-28" />
              <Bone className="mt-3 h-9 w-16 rounded-lg" />
              <Bone className="mt-4 h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

/** Same footprint as the candidate pager, so the row doesn't shift when it loads. */
export function PagerSkeleton() {
  return (
    <div role="status" aria-label="Loading candidates" className="flex items-center gap-3">
      <Bone className="h-3 w-10" />
      <Bone className="h-8 w-[74px]" />
    </div>
  );
}
