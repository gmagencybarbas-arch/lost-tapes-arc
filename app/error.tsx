'use client';

export default function ErrorScreen({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="success">
      <p className="pixel-label kicker">Sinal interrompido</p>
      <h1 className="game-title legal-title">O arquivo piscou.</h1>
      <p className="lede">A tela não abriu. O personagem só conta como enviado depois da confirmação.</p>
      <button type="button" className="game-button back-link" onClick={reset}>
        Tentar de novo
      </button>
    </main>
  );
}
