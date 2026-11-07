import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { LuCheck, LuSearch } from 'react-icons/lu';
import { Tooltip } from './Tooltip';

export interface ComboboxItem {
  /** Value passed to onChoose. */
  readonly value: string;
  /** Section heading shown before the first item of each section. */
  readonly section?: string;
  readonly content: ReactNode;
  readonly selected?: boolean;
}

export interface ComboboxPopoverProps {
  /** Accessible name of the trigger button. */
  readonly triggerLabel: string;
  readonly triggerContent: ReactNode;
  readonly triggerClassName: string;
  readonly dialogLabel: string;
  readonly inputLabel: string;
  readonly placeholder: string;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly items: readonly ComboboxItem[];
  readonly onChoose: (value: string) => void;
  readonly empty?: ReactNode;
  readonly footer?: ReactNode;
  readonly align?: 'start' | 'end';
  readonly inputMode?: 'text' | 'numeric';
  /** Single key that opens the popover from anywhere (ignored while typing in a field). */
  readonly shortcut?: string;
  /** Hint shown when hovering or keyboard-focusing the trigger. */
  readonly tooltip?: string;
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Searchable popover menu: a trigger button opening a dialog with an ARIA 1.2 combobox
 * (input + listbox via aria-activedescendant). Arrow keys, Enter, Escape, Tab, click-outside,
 * optional global shortcut; focus returns to the trigger on close. Callers own query and items.
 */
export function ComboboxPopover({
  triggerLabel,
  triggerContent,
  triggerClassName,
  dialogLabel,
  inputLabel,
  placeholder,
  query,
  onQueryChange,
  items,
  onChoose,
  empty,
  footer,
  align = 'end',
  inputMode = 'text',
  shortcut,
  tooltip,
}: ComboboxPopoverProps) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, items.length - 1);
  const activeItem = items[activeIndex];
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  const close = useCallback(
    (refocus: boolean) => {
      setOpen(false);
      onQueryChange('');
      if (refocus) trigger.current?.focus();
    },
    [onQueryChange],
  );

  const openMenu = useCallback(() => {
    setActive(0);
    setOpen(true);
  }, []);

  const choose = (value: string) => {
    close(true);
    onChoose(value);
  };

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (root.current && e.target instanceof Node && !root.current.contains(e.target)) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, close]);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== shortcut || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      openMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut, openMenu]);

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${id}-opt-${activeIndex}`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, id]);

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(items.length - 1, i + 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        return;
      case 'Enter':
        e.preventDefault();
        if (activeItem) choose(activeItem.value);
        return;
      case 'Escape':
        e.preventDefault();
        close(true);
        return;
      case 'Tab':
        close(false);
    }
  };

  return (
    <div ref={root} className="relative">
      {tooltip ? (
        <Tooltip content={tooltip} describe={false} {...(shortcut ? { shortcut } : {})}>
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={triggerLabel}
          aria-keyshortcuts={shortcut}
          onClick={() => (open ? close(false) : openMenu())}
          className={triggerClassName}
        >
          {triggerContent}
        </button>
        </Tooltip>
      ) : (
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={triggerLabel}
          aria-keyshortcuts={shortcut}
          onClick={() => (open ? close(false) : openMenu())}
          className={triggerClassName}
        >
          {triggerContent}
        </button>
      )}

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={dialogLabel}
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={clsx(
              'absolute z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white/95 shadow-raised ring-1 ring-black/[0.06] backdrop-blur-xl',
              align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            )}
          >
            <div className="relative border-b border-slate-100 p-2">
              <LuSearch aria-hidden="true" size={15} className="pointer-events-none absolute top-1/2 left-4.5 -translate-y-1/2 text-slate-500" />
              <input
                ref={input}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeItem ? optionId(activeIndex) : undefined}
                aria-label={inputLabel}
                inputMode={inputMode}
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                  onQueryChange(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                className="w-full rounded-xl bg-slate-100 py-2 pr-3 pl-8 text-sm placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-auto p-1.5">
              <ul id={listId} role="listbox" aria-label={dialogLabel}>
                {items.map((item, i) => {
                  const startsSection = item.section !== undefined && items[i - 1]?.section !== item.section;
                  return (
                    <Fragment key={`${item.section ?? ''}:${item.value}`}>
                      {startsSection ? (
                        <li role="presentation" className="text-eyebrow px-2.5 pt-1.5 pb-1 text-slate-500">
                          {item.section}
                        </li>
                      ) : null}
                      <li
                        id={optionId(i)}
                        role="option"
                        aria-selected={item.selected ?? false}
                        onPointerMove={() => setActive(i)}
                        onClick={() => choose(item.value)}
                        className={clsx('flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm select-none', i === activeIndex && 'bg-slate-100')}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2.5">{item.content}</span>
                        {item.selected ? <LuCheck aria-hidden="true" size={15} className="shrink-0 text-brand-600" /> : null}
                      </li>
                    </Fragment>
                  );
                })}
              </ul>
              {items.length === 0 && empty ? <div className="px-2.5 py-3 text-sm text-slate-500">{empty}</div> : null}
            </div>
            {footer ? <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">{footer}</div> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
