export type ServerConfig = {
  url: string;
  token: string;
};

export function assertAppsScriptUrl(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com') {
    throw new Error('APPS_SCRIPT_URL precisa ser https://script.google.com/macros/.../exec');
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (!/^\/macros\/(?:u\/\d+\/)?s\/[a-zA-Z0-9_-]+\/exec$/.test(path)) {
    throw new Error('APPS_SCRIPT_URL precisa apontar para a implantação /exec.');
  }

  url.search = '';
  url.hash = '';
  return url.toString();
}

export function readServerConfig(): ServerConfig | { error: string } {
  const url = process.env.APPS_SCRIPT_URL?.trim() ?? '';
  const token = process.env.APPS_SCRIPT_TOKEN?.trim() ?? '';

  if (!url || !token) {
    return { error: 'O arquivo ainda não está configurado no servidor.' };
  }

  if (token.length < 24) {
    return { error: 'O token do servidor está curto demais para proteger os envios.' };
  }

  try {
    return { url: assertAppsScriptUrl(url), token };
  } catch (error) {
    console.error('[upload] APPS_SCRIPT_URL invalida', error instanceof Error ? error.message : 'url');
    return { error: 'O endereço do Apps Script no servidor é inválido.' };
  }
}
