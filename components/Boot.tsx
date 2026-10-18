'use client';

import { useEffect, useState } from 'react';

export function Boot() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in');

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('motion', !reduce);
    if (reduce || sessionStorage.getItem('arquivo-intro') === '1') {
      setPhase('gone');
      return;
    }

    const out = window.setTimeout(() => setPhase('out'), 1500);
    const gone = window.setTimeout(() => {
      sessionStorage.setItem('arquivo-intro', '1');
      setPhase('gone');
    }, 1960);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(gone);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className={`intro ${phase === 'out' ? 'is-out' : ''}`} role="status" aria-live="polite">
      <div className="loader-card">
        <p className="pixel-label">
          Loading<span className="blink">_</span>
        </p>
        <div className="hud" aria-hidden="true">
          <span className="intro-fill" />
        </div>
      </div>
    </div>
  );
}
