import type { SiteSettings } from '@/lib/theme';

const NETWORKS = [
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'],
] as const;

export function ClosedHome({ settings }: { settings: SiteSettings }) {
  return (
    <main id="main" className="hero closed-home">
      <p className="eyebrow">Lost Tapes</p>
      <h1 className="wordmark admin-title">O projeto já acabou</h1>
      <p className="deck">Acompanhe-nos nas redes sociais.</p>
      <div className="social-row">
        {NETWORKS.map(([key, label]) => {
          const href = settings[key];
          return href ? (
            <a key={key} className="social" href={href} target="_blank" rel="noreferrer">
              {label}
            </a>
          ) : (
            <span key={key} className="social">
              {label}
            </span>
          );
        })}
      </div>
      <p className="whisper">Te espero em breve.</p>
    </main>
  );
}
