'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { themeVars, type SiteSettings } from '@/lib/theme';

export function AdminPanel({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const vars = themeVars(settings);
    if (!vars) return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  }, [settings]);

  useEffect(() => {
    return () => {
      const root = document.documentElement;
      for (const name of Object.keys(themeVars(initial) ?? {})) root.style.removeProperty(name);
    };
  }, [initial]);

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

  async function toggleActive() {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    const active = !settings.active;
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || 'Não foi possível salvar.');
        setPending(false);
        return;
      }
      setSettings((current) => ({ ...current, active }));
      setNotice(active ? 'Home ativada.' : 'Home desativada.');
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
        <p className="hint">A tela muda na hora. Só fica para todo mundo depois de salvar.</p>
        <div className="color-row">
          <ColorField
            label="Fundo"
            value={settings.background}
            onChange={(background) => setSettings({ ...settings, background })}
          />
          <ColorField
            label="Degradê"
            value={settings.backgroundGlow}
            onChange={(backgroundGlow) => setSettings({ ...settings, backgroundGlow })}
          />
          <ColorField
            label="Texto"
            value={settings.text}
            onChange={(text) => setSettings({ ...settings, text })}
          />
          <ColorField
            label="Título"
            value={settings.title}
            onChange={(title) => setSettings({ ...settings, title })}
          />
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
        <span className="social preview-pill">Prévia do botão</span>
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
          onClick={() => void toggleActive()}
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
      <input
        type="color"
        value={value}
        aria-label={label}
        onInput={(event) => onChange(event.currentTarget.value)}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
