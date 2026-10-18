'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || 'Login ou senha não conferem.');
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Não foi possível entrar agora.');
      setPending(false);
    }
  }

  return (
    <main id="main" className="hero admin-screen">
      <p className="eyebrow">Acesso</p>
      <h1 className="wordmark admin-title">Admin</h1>
      <form className="admin-card" onSubmit={onSubmit}>
        <label className="field">
          <span className="pixel-label">Login</span>
          <input
            className="control"
            name="user"
            autoComplete="username"
            value={user}
            onChange={(event) => setUser(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="pixel-label">Senha</span>
          <input
            className="control"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <button className="game-button" type="submit" disabled={pending}>
          {pending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
