import { interpretCountBody, postToAppsScript } from './appsScript';
import { readServerConfig } from './config';

export async function countSubmissions(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const config = readServerConfig();
  if ('error' in config) return { ok: false, error: 'O Drive ainda não está configurado.' };
  try {
    const text = await postToAppsScript(
      config.url,
      { token: config.token, op: 'count' },
      { signal: AbortSignal.timeout(25_000) },
    );
    return interpretCountBody(text);
  } catch {
    return { ok: false, error: 'Não deu para contar os envios agora.' };
  }
}
