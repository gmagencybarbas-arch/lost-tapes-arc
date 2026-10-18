import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { interpretGasBody, postToAppsScript } from '@/lib/appsScript';
import { readServerConfig } from '@/lib/config';
import { inspectImage, MAX_UPLOAD_BYTES, sanitizeOriginalName } from '@/lib/files';
import { beginSubmission, clientIp } from '@/lib/guard';
import { TERMS_TEXT } from '@/lib/legal';
import { RECEIPT_COOKIE, receiptCookieOptions, signReceipt } from '@/lib/receipt';
import { readSiteSettings } from '@/lib/siteSettings';
import { validateSubmissionFields } from '@/lib/submission';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_REQUEST_BYTES = 12 * 1024 * 1024;

function fail(error: string, status: number) {
  return NextResponse.json(
    { ok: false, error },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

function textField(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}

export async function POST(request: Request) {
  if (request.headers.get('x-arquivo-request') !== '1') {
    return fail('Pedido recusado.', 403);
  }

  const settings = await readSiteSettings();
  if (!settings.active) {
    return fail('O projeto já acabou.', 403);
  }

  const config = readServerConfig();
  if ('error' in config) {
    return fail(config.error, 503);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return fail('A imagem passa de 10 MB. Escolha um arquivo menor.', 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Não foi possível ler o arquivo enviado.', 400);
  }

  const fields = validateSubmissionFields({
    characterName: textField(form, 'characterName'),
    socialNetwork: textField(form, 'socialNetwork'),
    handle: textField(form, 'handle'),
    accepted: textField(form, 'accepted'),
    termsVersion: textField(form, 'termsVersion'),
  });
  if (!fields.ok) return fail(fields.error, 400);

  const incoming = form.get('file');
  if (!(incoming instanceof File)) {
    return fail('Selecione a imagem do personagem antes de enviar.', 400);
  }

  const declaredSize = Number(form.get('byteSize'));
  const buffer = Buffer.from(await incoming.arrayBuffer());
  if (!Number.isInteger(declaredSize) || declaredSize !== buffer.length || buffer.length !== incoming.size) {
    return fail('O arquivo chegou incompleto. O personagem não foi enviado.', 400);
  }
  if (buffer.length <= 0) return fail('O arquivo está vazio.', 400);
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return fail('A imagem passa de 10 MB. Escolha um arquivo menor.', 413);
  }

  const mime = inspectImage(buffer);
  if (!mime) return fail('O conteúdo não corresponde a PNG, JPG ou WEBP.', 400);

  const fingerprint = createHash('sha256')
    .update(buffer)
    .update('|')
    .update(fields.value.handle.toLowerCase())
    .update('|')
    .update(fields.value.characterName.toLocaleLowerCase('pt-BR'))
    .digest('hex');
  const gate = beginSubmission(clientIp(request), fingerprint);
  if (!gate.ok) return fail(gate.error, 429);

  let saved = false;
  try {
    const submissionId = randomUUID();
    const acceptedAt = new Date().toISOString();
    const text = await postToAppsScript(
      config.url,
      {
        token: config.token,
        submissionId,
        characterName: fields.value.characterName,
        socialNetwork: fields.value.socialNetwork,
        handle: fields.value.handle,
        accepted: true,
        termsVersion: fields.value.termsVersion,
        termsText: TERMS_TEXT,
        acceptedAt,
        fileName: sanitizeOriginalName(incoming.name || 'imagem'),
        mimeType: mime,
        data: buffer.toString('base64'),
      },
      { signal: AbortSignal.timeout(55_000) },
    );
    const result = interpretGasBody(text);
    if (!result.ok || result.submissionId !== submissionId) {
      const status = result.ok ? 502 : result.status;
      const error = result.ok ? 'O arquivo não confirmou o recebimento do personagem.' : result.error;
      console.error('[upload] apps script recusou', {
        mime,
        bytes: buffer.length,
        status,
        error,
      });
      return fail(error, status);
    }

    saved = true;
    console.info('[upload] drive confirmou', { submissionId: result.submissionId, bytes: buffer.length });
    const response = NextResponse.json(
      { ok: true, fileName: result.fileName, submissionId: result.submissionId },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(
      RECEIPT_COOKIE,
      signReceipt(config.token, {
        fileName: result.fileName,
        fileId: result.fileId,
        submissionId: result.submissionId,
        characterName: fields.value.characterName,
      }),
      receiptCookieOptions(request),
    );
    return response;
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    console.error('[upload] sem confirmacao', timedOut ? 'timeout' : 'rede');
    if (timedOut) {
      return fail('A confirmação não chegou a tempo. Confira a pasta antes de reenviar.', 504);
    }
    return fail('Não houve confirmação do recebimento. O personagem não foi marcado como enviado.', 502);
  } finally {
    gate.finish(saved);
  }
}
