'use client';

import { useEffect } from 'react';
import type { SendProgress } from '@/lib/sendCharacter';

export function LoadingModal({ phase, progress }: SendProgress) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const percent =
    phase === 'transmit' && progress != null ? Math.min(100, Math.max(0, Math.round(progress * 100))) : null;

  return (
    <div className="overlay" role="status" aria-live="assertive" aria-busy="true">
      <div className="loader-card panel">
        <p className="pixel-label">
          Transmitindo personagem...<span className="blink">_</span>
        </p>
        <div className="hud" aria-hidden="true">
          <span className={percent == null ? 'is-wait' : ''} style={percent == null ? undefined : { width: `${percent}%` }} />
        </div>
        <p className="hint">
          {percent == null ? 'Aguardando confirmação do arquivo.' : `${percent}% enviado ao servidor.`}
        </p>
      </div>
    </div>
  );
}
