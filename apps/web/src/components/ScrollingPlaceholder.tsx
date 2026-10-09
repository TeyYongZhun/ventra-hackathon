import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

// Placeholder drawn over an empty text box. If the hint is wider than the box, it scrolls
// right to left in a seamless loop (two copies side by side), so the whole hint can be read
// on a narrow phone. With reduced motion it stays still and ends in "…".
// The box itself keeps the hint as its accessible name; this overlay is hidden from readers.
const GAP = 48;
const SPEED = 40; // px per second

export function ScrollingPlaceholder({ text, style }: { text: string; style?: CSSProperties }) {
  const box = useRef<HTMLSpanElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      const room = box.current?.clientWidth ?? 0;
      const need = measure.current?.scrollWidth ?? 0;
      setOverflow(room > 0 && need > room ? need : 0);
    };
    update();
    if (typeof ResizeObserver === 'undefined' || !box.current) return;
    const observer = new ResizeObserver(update);
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [text]);

  const reduceMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrolls = overflow > 0 && !reduceMotion;
  const distance = overflow + GAP;

  return (
    <span ref={box} aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', ...style }}>
      {/* Off-screen copy to measure the hint's full width. */}
      <span ref={measure} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap' }}>{text}</span>
      {scrolls ? (
        <span className="placeholder-marquee" style={{ display: 'inline-flex', gap: GAP, ['--marquee-distance' as string]: `-${distance}px`, animationDuration: `${distance / SPEED}s` }}>
          <span>{text}</span>
          <span>{text}</span>
        </span>
      ) : (
        <span style={{ display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
      )}
    </span>
  );
}
