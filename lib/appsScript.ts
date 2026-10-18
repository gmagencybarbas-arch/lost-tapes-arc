import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isDriveId, isSafeFileName } from './files';
import { isSubmissionId } from './submission';

const DEFAULT_REDIRECT_HOSTS = new Set(['script.google.com', 'script.googleusercontent.com']);

const SAFE_ERRORS = new Map<string, number>([
  ['Pedido vazio.', 400],
  ['Pedido inválido.', 400],
  ['Token do arquivo não configurado.', 503],
  ['Não autorizado.', 401],
  ['Formato não aceito. Use PNG, JPG ou WEBP.', 400],
  ['Arquivo ausente.', 400],
  ['A imagem passa de 10 MB.', 413],
  ['Arquivo inválido.', 400],
  ['O conteúdo não corresponde ao formato informado.', 400],
  ['Os termos não foram aceitos.', 400],
  ['A versão dos termos não confere. Leia a autorização de novo.', 400],
  ['Informe o nome do personagem.', 400],
  ['Informe o @ do criador.', 400],
  ['Escolha TikTok ou Instagram.', 400],
  ['Não foi possível guardar o personagem no arquivo.', 502],
]);

export const GAS_ERROR_MESSAGES = [...SAFE_ERRORS.keys()];

export type GasResult =
  | { ok: true; fileName: string; fileId: string; metadataFileId: string; submissionId: string }
  | { ok: false; error: string; status: number };

type RawResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
};

export type AppsScriptRequestOptions = {
  redirectHosts?: ReadonlySet<string>;
  signal?: AbortSignal;
};

function timeoutError(): Error {
  const error = new Error('A confirmação não chegou a tempo.');
  error.name = 'TimeoutError';
  return error;
}

function headerValue(headers: IncomingHttpHeaders, name: string): string | null {
  const value = headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function rawRequest(url: URL, method: 'GET' | 'POST', body?: string, signal?: AbortSignal): Promise<RawResponse> {
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')) {
    return Promise.reject(new Error('Conexão recusada fora do Apps Script.'));
  }

  const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      handler();
    };

    if (signal?.aborted) {
      finish(() => reject(timeoutError()));
      return;
    }

    const req = transport(
      url,
      {
        method,
        headers: body
          ? {
              'Content-Type': 'text/plain;charset=utf-8',
              'Content-Length': Buffer.byteLength(body),
            }
          : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let received = 0;
        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received > 1_000_000) {
            req.destroy(new Error('A resposta do Apps Script veio grande demais.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          finish(() =>
            resolve({
              status: res.statusCode ?? 0,
              headers: res.headers,
              body: Buffer.concat(chunks).toString('utf8'),
            }),
          );
        });
      },
    );

    req.on('error', (error) => finish(() => reject(error)));
    req.setTimeout(56_000, () => req.destroy(timeoutError()));

    const onAbort = () => req.destroy(timeoutError());
    signal?.addEventListener('abort', onAbort, { once: true });
    req.on('close', () => signal?.removeEventListener('abort', onAbort));

    if (body) req.write(body);
    req.end();
  });
}

export async function postToAppsScript(
  url: string,
  payload: unknown,
  options: AppsScriptRequestOptions = {},
): Promise<string> {
  const redirectHosts = options.redirectHosts ?? DEFAULT_REDIRECT_HOSTS;
  let currentUrl = new URL(url);
  let response = await rawRequest(currentUrl, 'POST', JSON.stringify(payload), options.signal);

  for (let hop = 0; hop < 3; hop += 1) {
    if (response.status < 300 || response.status >= 400) break;

    const location = headerValue(response.headers, 'location');
    if (!location) {
      throw new Error('O Apps Script redirecionou sem entregar a confirmação.');
    }

    const nextUrl = new URL(location, currentUrl);
    if (!redirectHosts.has(nextUrl.hostname)) {
      throw new Error('O Apps Script apontou a confirmação para fora do Google.');
    }

    currentUrl = nextUrl;
    response = await rawRequest(currentUrl, 'GET', undefined, options.signal);
  }

  if (response.status >= 300 && response.status < 400) {
    throw new Error('O Apps Script não concluiu o redirecionamento da confirmação.');
  }

  return response.body;
}

export function interpretCountBody(text: string): { ok: true; count: number } | { ok: false; error: string } {
  const trimmed = text.trim().replace(/^\)\]\}',?\s*/, '');
  if (!trimmed || trimmed.startsWith('<')) {
    return { ok: false, error: 'Não deu para contar os envios. Publique a nova versão do Apps Script.' };
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (
      parsed.ok === true &&
      typeof parsed.count === 'number' &&
      Number.isInteger(parsed.count) &&
      parsed.count >= 0 &&
      parsed.count < 1_000_000
    ) {
      return { ok: true, count: parsed.count };
    }
  } catch {
    return { ok: false, error: 'Não deu para contar os envios. Publique a nova versão do Apps Script.' };
  }
  return { ok: false, error: 'Não deu para contar os envios. Publique a nova versão do Apps Script.' };
}

export function interpretGasBody(text: string): GasResult {
  const trimmed = text.trim().replace(/^\)\]\}',?\s*/, '');
  if (!trimmed || trimmed.startsWith('<')) {
    return {
      ok: false,
      status: 502,
      error: 'O Apps Script não devolveu uma confirmação. Confira a implantação do web app.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      status: 502,
      error: 'O Apps Script não devolveu uma confirmação. Confira a implantação do web app.',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, status: 502, error: 'O arquivo não confirmou o recebimento do personagem.' };
  }

  const record = parsed as Record<string, unknown>;
  if (
    record.ok === true &&
    typeof record.fileId === 'string' &&
    typeof record.metadataFileId === 'string' &&
    typeof record.fileName === 'string' &&
    typeof record.submissionId === 'string' &&
    isDriveId(record.fileId) &&
    isDriveId(record.metadataFileId) &&
    record.fileId !== record.metadataFileId &&
    isSafeFileName(record.fileName) &&
    isSubmissionId(record.submissionId) &&
    record.fileName.startsWith(`${record.submissionId}.`)
  ) {
    return {
      ok: true,
      fileId: record.fileId,
      metadataFileId: record.metadataFileId,
      fileName: record.fileName,
      submissionId: record.submissionId,
    };
  }

  if (record.ok === false && typeof record.error === 'string') {
    const status = SAFE_ERRORS.get(record.error);
    if (status) return { ok: false, status, error: record.error };
  }

  return { ok: false, status: 502, error: 'O arquivo não confirmou o recebimento do personagem.' };
}
