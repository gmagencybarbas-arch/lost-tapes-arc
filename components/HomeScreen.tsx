'use client';

import { useRef } from 'react';
import { CharacterForm } from './CharacterForm';

const STEPS = [
  ['I', 'Envie a arte', 'Nome, imagem e o @ de quem criou o personagem.'],
  ['II', 'Entre no sorteio', 'A ficha só entra depois da autorização de uso.'],
  ['III', 'Aguarde o resultado', 'Se for sorteado, o personagem pode aparecer num episódio.'],
];

export function HomeScreen() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <main id="main">
        <section className="hero">
          <p className="eyebrow">Lost Tapes</p>
          <h1 className="wordmark">
            Lost Tapes <span>- ARC</span>
          </h1>
          <p className="deck">Envie sua arte, seu personagem pode fazer parte do universo ARC.</p>
          <button type="button" className="lead" onClick={() => dialogRef.current?.showModal()}>
            <i aria-hidden="true" />
            Enviar sua arte
          </button>
          <p className="whisper">Um sorteio. Sem pagamento. Sem garantia de aparição.</p>
          <div className="marks" aria-hidden="true">
            <span>I</span>
            <span>II</span>
            <span>III</span>
          </div>
        </section>

        <section className="how" id="como-funciona">
          <p className="eyebrow">O sorteio</p>
          <h2>Como funciona</h2>
          <p className="how-lead">
            Cada envio válido entra num sorteio. Os personagens sorteados podem aparecer como figurantes no universo
            ARC. Não é compra de vaga: não há pagamento, e ser sorteado não é garantido.
          </p>
          <div className="how-grid">
            {STEPS.map(([index, title, copy]) => (
              <article className="how-card" key={index}>
                <b>{index}</b>
                <strong>{title}</strong>
                <span>{copy}</span>
              </article>
            ))}
          </div>
        </section>
      </main>

      <dialog ref={dialogRef} className="sheet" aria-labelledby="ficha-title">
        <div className="sheet-bar">
          <p id="ficha-title">Ficha do personagem</p>
          <button type="button" className="sheet-x" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
        </div>
        <CharacterForm />
      </dialog>
    </>
  );
}
