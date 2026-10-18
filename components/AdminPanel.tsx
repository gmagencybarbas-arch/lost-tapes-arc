'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteSettings } from '@/lib/siteSettings';

export function AdminPanel({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch('/api/admin/stats')
      .then(async (response) => {
        const data = (await response.json()) as { ok?: boolean; count?: number; error?: string };
        if (ignore) return;
        if (data.ok && typeof data.count === 'number') setCount(data.count);
        else setCountError(data.error || 'Não deu para contar os envios.');
      })
      .catch(() => {
        if (!ignore) setCountError('Não deu para contar os envios agora.');
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function save(next: SiteSettings, done: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; settings?: SiteSettings };
      if (!response.ok || !data.ok || !data.settings) {
        setError(data.error || 'Não foi possível salvar.');
        setPending(false);
        return;
      }
      setSettings(data.settings);
      setNotice(done);
      setPending(false);
      router.refresh();
    } catch {
      setError('Não foi possível salvar.');
      setPending(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <main id="main" className="hero admin-screen">
      <p className="eyebrow">Lead</p>
      <h1 className="wordmark admin-title">Admin</h1>
      <section className="admin-card">
        <p className="pixel-label">Envios</p>
        <p className="admin-count">{count === null ? '—' : count}</p>
        {countError ? <p className="hint">{countError}</p> : <p className="hint">Pastas criadas no Drive, uma por envio.</p>}
      </section>

      <form
        className="admin-card"
        onSubmit={(event) => {
          event.preventDefault();
          void save(settings, 'Cores salvas.');
        }}
      >
        <p className="pixel-label">Cores</p>
        <div className="color-row">
          <ColorField
            label="Site"
            value={settings.accent}
            onChange={(accent) => setSettings({ ...settings, accent })}
          />
          <ColorField
            label="Botão claro"
            value={settings.buttonFrom}
            onChange={(buttonFrom) => setSettings({ ...settings, buttonFrom })}
          />
          <ColorField
            label="Botão vermelho"
            value={settings.buttonTo}
            onChange={(buttonTo) => setSettings({ ...settings, buttonTo })}
          />
        </div>
        <span
          className="social preview-pill"
          style={
            /^#[0-9a-fA-F]{6}$/.test(settings.buttonFrom) && /^#[0-9a-fA-F]{6}$/.test(settings.buttonTo)
              ? { background: `linear-gradient(102deg, ${settings.buttonFrom}, ${settings.buttonTo})` }
              : undefined
          }
        >
          Prévia do botão
        </span>
        <label className="field">
          <span className="pixel-label">Instagram</span>
          <input
            className="control"
            value={settings.instagram}
            placeholder="https://instagram.com/..."
            onChange={(event) => setSettings({ ...settings, instagram: event.target.value })}
          />
        </label>
        <label className="field">
          <span className="pixel-label">TikTok</span>
          <input
            className="control"
            value={settings.tiktok}
            placeholder="https://www.tiktok.com/..."
            onChange={(event) => setSettings({ ...settings, tiktok: event.target.value })}
          />
        </label>
        <label className="field">
          <span className="pixel-label">YouTube</span>
          <input
            className="control"
            value={settings.youtube}
            placeholder="https://youtube.com/..."
            onChange={(event) => setSettings({ ...settings, youtube: event.target.value })}
          />
        </label>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? <p className="hint">{notice}</p> : null}
        <button className="game-button" type="submit" disabled={pending}>
          Salvar cores
        </button>
        <button
          className="game-button"
          type="button"
          disabled={pending}
          onClick={() => void save({ ...settings, active: !settings.active }, settings.active ? 'Home desativada.' : 'Home ativada.')}
        >
          {settings.active ? 'Desativar' : 'Ativar'}
        </button>
        <button className="ghost" type="button" onClick={() => void logout()}>
          Sair
        </button>
      </form>
    </main>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="color-field">
      <span className="pixel-label">{label}</span>
      <input type="color" value={value} aria-label={label} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
