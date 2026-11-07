import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { LuCheck, LuChevronDown } from 'react-icons/lu';

export interface SelectOption<T extends string> {
  readonly value: T;
  readonly label: string;
  /** Optional element shown after the label (e.g. a status tag). */
  readonly trailing?: ReactNode;
}

export interface SelectProps<T extends string> {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly onChange: (value: T) => void;
  readonly align?: 'start' | 'end';
  readonly className?: string;
  readonly size?: 'sm' | 'md';
}

/**
 * Accessible custom select (WAI-ARIA listbox pattern): button + popup listbox with
 * aria-activedescendant, arrow keys, Home/End, type-ahead, Enter/Space, Escape and click-outside.
 */
export function Select<T extends string>({ label, hideLabel, value, options, onChange, align = 'start', className, size = 'md' }: SelectProps<T>) {
  const id = useId();
  const labelId = `${id}-label`;
  const buttonId = `${id}-button`;
  const listId = `${id}-list`;
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(selectedIndex);
  const selected = options[selectedIndex];

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  }, []);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    const o = options[index];
    if (o && o.value !== value) onChange(o.value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (root.current && e.target instanceof Node && !root.current.contains(e.target)) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const el = list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    // scrollIntoView is missing in some environments (e.g. jsdom); keep the active option visible where supported.
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt(e.key === 'ArrowUp' ? Math.max(0, selectedIndex - 1) : selectedIndex);
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        return;
      case 'Home':
        e.preventDefault();
        setActive(0);
        return;
      case 'End':
        e.preventDefault();
        setActive(last);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        return;
      case 'Escape':
        e.preventDefault();
        close(true);
        return;
      case 'Tab':
        close(false);
        return;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const now = Date.now();
          const t = typeahead.current;
          t.text = now - t.at > 600 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
          t.at = now;
          const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(t.text));
          if (hit !== -1) setActive(hit);
        }
    }
  };

  return (
    <div ref={root} className={clsx('relative', className)}>
      <span id={labelId} className={clsx(hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-slate-600')}>
        {label}
      </span>
      <button
        ref={button}
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${buttonId}`}
        onClick={() => (open ? close(false) : openAt(selectedIndex))}
        onKeyDown={onButtonKey}
        className={clsx(
          'flex w-full items-center justify-between gap-2 rounded-xl bg-white text-left font-semibold text-slate-900 shadow-card ring-1 ring-black/[0.06]',
          'transition-[box-shadow,background-color] duration-200 ease-out-soft hover:shadow-raised',
          size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-3.5 py-2 text-sm',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{selected?.label}</span>
        </span>
        <LuChevronDown aria-hidden="true" size={16} className={clsx('shrink-0 text-slate-500 transition-transform duration-200 ease-out-soft', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelId}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onListKey}
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={clsx(
              'absolute z-40 mt-2 max-h-72 min-w-full overflow-auto rounded-2xl bg-white/95 p-1.5 shadow-raised ring-1 ring-black/[0.06] backdrop-blur-xl outline-none',
              align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            )}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={clsx(
                    'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm whitespace-nowrap select-none',
                    i === active ? 'bg-slate-100' : '',
                    isSelected ? 'font-semibold text-slate-900' : 'text-slate-700',
                  )}
                >
                  <LuCheck aria-hidden="true" size={15} className={clsx('shrink-0 text-brand-600', isSelected ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1">{o.label}</span>
                  {o.trailing}
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
