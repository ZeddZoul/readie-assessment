import clsx from 'clsx';
import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY_MS = 350;
const GAP = 8;
const EDGE = 8;

/** Keyboard focus only (not mouse clicks); engines without :focus-visible support fall back to showing. */
function isKeyboardFocus(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

interface TriggerProps {
  'aria-describedby'?: string;
}

export interface TooltipProps {
  readonly content: string;
  /** Keyboard shortcut shown as a key chip, e.g. "/" or "J". */
  readonly shortcut?: string;
  /**
   * Link the tooltip to the control with aria-describedby. Turn off when the tooltip only repeats
   * the control's accessible name (icon buttons with an aria-label), so screen readers don't hear it twice.
   */
  readonly describe?: boolean;
  readonly children: ReactElement<TriggerProps>;
  /** Extra classes for the wrapper (e.g. flex-1 when the trigger is a flex child). */
  readonly className?: string;
}

/**
 * Accessible tooltip: shows after a short hover delay or immediately on keyboard focus; hides on
 * pointer-out, blur, click, scroll and Escape. Rendered in a portal with fixed positioning so it is
 * never clipped by overflow-hidden containers, and clamped to the viewport. Touch input is ignored
 * (every control also has an accessible name).
 */
export function Tooltip({ content, shortcut, describe = true, children, className }: TooltipProps) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean }>({ top: 0, left: 0, above: false });

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const hide = useCallback(() => {
    clear();
    setOpen(false);
  }, []);

  useEffect(() => clear, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
    };
  }, [open, hide]);

  // Position below the trigger (above if there's no room), centred, clamped to the viewport.
  useLayoutEffect(() => {
    if (!open || !anchor.current || !tip.current) return;
    const a = anchor.current.getBoundingClientRect();
    const t = tip.current.getBoundingClientRect();
    const above = a.bottom + GAP + t.height > window.innerHeight - EDGE;
    const left = Math.min(Math.max(a.left + a.width / 2 - t.width / 2, EDGE), window.innerWidth - t.width - EDGE);
    setPos({ top: above ? a.top - GAP - t.height : a.bottom + GAP, left, above });
  }, [open]);

  // Linked only while open (focus opens it immediately), so the description is never computed from hidden text.
  const trigger = describe && open ? cloneElement(children, { 'aria-describedby': id }) : children;

  return (
    <>
      <span
        ref={anchor}
        className={clsx('inline-flex', className)}
        onPointerEnter={(e) => {
          if (e.pointerType === 'touch') return;
          clear();
          timer.current = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
        }}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocus={(e) => {
          if (e.target instanceof Element && isKeyboardFocus(e.target)) setOpen(true);
        }}
        onBlur={hide}
      >
        {trigger}
      </span>
      {open
        ? createPortal(
        <div
          ref={tip}
          id={id}
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className={clsx(
            'pointer-events-none fixed z-[60] flex max-w-xs items-center gap-2 rounded-lg bg-slate-900/90 px-2.5 py-1.5 text-xs font-medium text-white shadow-raised backdrop-blur-md',
            'motion-safe:animate-[tooltip-in_120ms_var(--ease-out-soft)]',
          )}
        >
          {/* One plain-text description for assistive tech; the visual pieces are hidden from it. */}
          <span className="sr-only">{shortcut ? `${content} (shortcut ${shortcut})` : content}</span>
          <span aria-hidden="true">{content}</span>
          {shortcut ? (
            <kbd aria-hidden="true" className="rounded bg-white/20 px-1.5 py-px font-mono text-[11px] font-semibold">
              {shortcut}
            </kbd>
          ) : null}
        </div>,
        document.body,
          )
        : null}
    </>
  );
}
