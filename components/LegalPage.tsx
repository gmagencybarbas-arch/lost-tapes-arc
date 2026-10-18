import Link from 'next/link';
import { Reveal } from './Reveal';

export function LegalPage({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="legal">
      <Reveal>
        <div className="hero-copy">
          <p className="pixel-label kicker">{kicker}</p>
          <h1 className="game-title legal-title">{title}</h1>
        </div>
      </Reveal>
      <Reveal delay={90}>
        <article className="panel legal-copy">{children}</article>
      </Reveal>
      <Link href="/" className="game-button back-link">
        Voltar ao arquivo
      </Link>
    </main>
  );
}
