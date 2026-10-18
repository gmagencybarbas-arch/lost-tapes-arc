'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { formatBytes, validateClientFile } from '@/lib/files';
import { TERMS_VERSION } from '@/lib/legal';
import { sendCharacter, type SendProgress } from '@/lib/sendCharacter';
import { validateSubmissionFields, type SocialNetwork } from '@/lib/submission';
import { LoadingModal } from './LoadingModal';

const ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

export function CharacterForm() {
  const nameId = useId();
  const handleId = useId();
  const fileId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);

  const [characterName, setCharacterName] = useState('');
  const [socialNetwork, setSocialNetwork] = useState<SocialNetwork | ''>('');
  const [handle, setHandle] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hot, setHot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<SendProgress | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function takeFile(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      setPreview(null);
      return;
    }
    const problem = validateClientFile(next);
    if (problem) {
      setError(problem);
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;

    const fields = validateSubmissionFields({
      characterName,
      socialNetwork,
      handle,
      accepted,
      termsVersion: TERMS_VERSION,
    });
    if (!fields.ok) {
      setError(fields.error);
      return;
    }
    if (!file) {
      setError('Selecione a imagem do personagem antes de enviar.');
      return;
    }
    const fileProblem = validateClientFile(file);
    if (fileProblem) {
      setError(fileProblem);
      return;
    }

    sendingRef.current = true;
    setError(null);
    setSending({ phase: 'transmit', progress: null });
    try {
      await sendCharacter(
        {
          file,
          characterName: fields.value.characterName,
          socialNetwork: fields.value.socialNetwork,
          handle: fields.value.handle,
          accepted: true,
        },
        setSending,
      );
      window.location.assign('/obrigado');
    } catch (caught) {
      setSending(null);
      sendingRef.current = false;
      setError(caught instanceof Error ? caught.message : 'Não houve confirmação do recebimento.');
    }
  }

  return (
    <>
      <form id="ficha" className="panel" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <label className="field" htmlFor={nameId}>
            <span className="pixel-label">Nome do personagem</span>
            <input
              id={nameId}
              className="control"
              name="characterName"
              autoComplete="off"
              maxLength={48}
              value={characterName}
              onChange={(event) => setCharacterName(event.target.value)}
              placeholder="Como ele aparece na ficha"
              required
            />
          </label>

          <fieldset className="field">
            <legend className="pixel-label legend">Rede social</legend>
            <div className="choice-row">
              {(['instagram', 'tiktok'] as const).map((network) => (
                <label className="choice" key={network}>
                  <input
                    type="radio"
                    name="socialNetwork"
                    value={network}
                    checked={socialNetwork === network}
                    onChange={() => setSocialNetwork(network)}
                  />
                  <span>{network === 'instagram' ? 'Instagram' : 'TikTok'}</span>
                  <i aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field" htmlFor={handleId}>
            <span className="pixel-label">@ do criador</span>
            <input
              id={handleId}
              className="control"
              name="handle"
              autoComplete="off"
              maxLength={41}
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="@seunome"
              required
            />
          </label>

          <div className="field">
            <span className="pixel-label">Imagem do personagem</span>
            {file && preview ? (
              <div className="preview">
                <img src={preview} alt="" />
                <div>
                  <p>{file.name}</p>
                  <small className="hint">{formatBytes(file.size)} · PNG, JPG ou WEBP</small>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    takeFile(null);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                >
                  Trocar
                </button>
              </div>
            ) : (
              <label
                className={`drop ${hot ? 'is-hot' : ''}`}
                htmlFor={fileId}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHot(true);
                }}
                onDragLeave={() => setHot(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setHot(false);
                  takeFile(event.dataTransfer.files[0] ?? null);
                }}
              >
                <strong>Solte a imagem</strong>
                <small>ou escolha um PNG, JPG ou WEBP de até 10 MB</small>
              </label>
            )}
            <input
              ref={inputRef}
              id={fileId}
              className="sr-only"
              type="file"
              accept={ACCEPT}
              onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <label className="consent">
            <input
              type="checkbox"
              name="accepted"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              Concordo com o uso gratuito do personagem, sem necessidade de remuneração. Não há pagamento nem garantia
              de aparição, e o envio não transfere a criação. Li a <Link href="/termos">autorização de uso</Link> e a{' '}
              <Link href="/privacidade">política de privacidade</Link>.
            </span>
          </label>

          {error ? (
            <p className="alert" role="alert">
              {error}
            </p>
          ) : null}

          <button className="game-button" type="submit" disabled={sending !== null}>
            {sending ? 'Transmitindo...' : 'Enviar personagem'}
          </button>
        </div>
      </form>
      {sending ? <LoadingModal phase={sending.phase} progress={sending.progress} /> : null}
    </>
  );
}
