'use client';

import { useState } from 'react';

export function SuccessScreen({
  characterName,
  submissionId,
}: {
  characterName: string;
  submissionId: string;
}) {
  const [pending, setPending] = useState(false);

  async function again() {
    if (pending) return;
    setPending(true);
    await fetch('/api/receipt', { method: 'DELETE' }).catch(() => null);
    window.location.assign('/');
  }

  return (
    <main id="main" className="success">
      <p className="pixel-label kicker">Missão concluída</p>
      <h1 className="game-title">Personagem recebido!</h1>
      <p className="lede">
        Seu personagem foi enviado com sucesso! Agora é só aguardar. Quem sabe ele não aparece em um dos próximos
        episódios?
      </p>
      <p className="note">O envio não garante participação.</p>
      <p className="pixel-label">{characterName}</p>
      <p className="receipt-code pixel-label">{submissionId}</p>
      <button type="button" className="game-button yellow back-link" onClick={again} disabled={pending}>
        Enviar outro personagem
      </button>
    </main>
  );
}
