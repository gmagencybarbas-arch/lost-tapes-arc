'use client';

import { useEffect, useRef } from 'react';

export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) document.documentElement.classList.add('motion');
    if (reduce) {
      node.classList.add('is-in');
      return;
    }

    const fallback = window.setTimeout(() => node.classList.add('is-in'), 1400);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        window.setTimeout(() => node.classList.add('is-in'), 30);
        io.disconnect();
      },
      { threshold: 0.16 },
    );
    io.observe(node);
    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
