import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';

const STAGGER_MS = 40;
const MAX_STAGGER_STEPS = 8;

/**
 * One reveal primitive: rise and fade once when the element enters the viewport.
 * Siblings pass `index` for a small, capped stagger. Reduced motion is handled in CSS.
 * Pass `enabled: false` for items beyond the first screenful so long lists create no observers.
 */
export function useReveal<T extends HTMLElement>(index = 0, enabled = true): {
  ref: RefObject<T | null>;
  className: string;
  'data-visible': boolean;
  style: CSSProperties;
} {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(() => !enabled || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -4% 0px' },
    );
    io.observe(el);
    // Safety net: observers can stall in hidden/background tabs; never leave on-screen content invisible.
    const timer = window.setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) setVisible(true);
    }, 900);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [visible]);

  const delay = Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;
  const style: CSSProperties & { readonly '--reveal-delay': string } = { '--reveal-delay': `${delay}ms` };
  return { ref, className: 'reveal', 'data-visible': visible, style };
}

export function Reveal({ children, index = 0, className }: { readonly children: ReactNode; readonly index?: number; readonly className?: string }) {
  const r = useReveal<HTMLDivElement>(index);
  return (
    <div ref={r.ref} className={className ? `${r.className} ${className}` : r.className} data-visible={r['data-visible']} style={r.style}>
      {children}
    </div>
  );
}
