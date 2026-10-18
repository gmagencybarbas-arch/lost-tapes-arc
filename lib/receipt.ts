import { createHmac, timingSafeEqual } from 'node:crypto';
import { isDriveId, isSafeFileName } from './files';
import { isSubmissionId } from './submission';

export const RECEIPT_COOKIE = 'ficha_recebida';
const MAX_AGE_SECONDS = 30 * 60;

export type ReceiptClaims = {
  fileName: string;
  fileId: string;
  submissionId: string;
  characterName: string;
};

type ReceiptBody = ReceiptClaims & { exp: number };

export function signReceipt(secret: string, claims: ReceiptClaims, exp = Date.now() + MAX_AGE_SECONDS * 1000): string {
  const payload = Buffer.from(JSON.stringify({ ...claims, exp } satisfies ReceiptBody), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyReceipt(secret: string, token: string, now = Date.now()): ReceiptClaims | null {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<ReceiptBody>;
    if (!parsed || typeof parsed.fileName !== 'string' || typeof parsed.fileId !== 'string') return null;
    if (typeof parsed.submissionId !== 'string' || typeof parsed.characterName !== 'string') return null;
    if (typeof parsed.exp !== 'number' || parsed.exp <= now) return null;
    if (!isSafeFileName(parsed.fileName) || !isDriveId(parsed.fileId) || !isSubmissionId(parsed.submissionId)) {
      return null;
    }
    if (parsed.characterName.length < 2 || parsed.characterName.length > 48) return null;
    if (!parsed.fileName.startsWith(`${parsed.submissionId}.`)) return null;
    return {
      fileName: parsed.fileName,
      fileId: parsed.fileId,
      submissionId: parsed.submissionId,
      characterName: parsed.characterName,
    };
  } catch {
    return null;
  }
}

export function receiptCookieOptions(request: Request) {
  const forwarded = request.headers.get('x-forwarded-proto');
  const secure = forwarded
    ? forwarded.split(',')[0]?.trim() === 'https'
    : new URL(request.url).protocol === 'https:';

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}
