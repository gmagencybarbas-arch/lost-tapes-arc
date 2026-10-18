import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'arc_sessao';
const SESSION_SECRET = 'arc-lead-session-lion-v1-7c2e9a';
const MAX_AGE_SECONDS = 12 * 60 * 60;
const USER = 'lion';
const PASSWORD = 'dragon';

type SessionBody = { sub: 'lead'; exp: number };

const failures = new Map<string, number[]>();

export function credentialsMatch(user: string, password: string): boolean {
  return sameSecret(user, USER) && sameSecret(password, PASSWORD);
}

export function allowLoginAttempt(ip: string, now = Date.now()): boolean {
  const recent = (failures.get(ip) ?? []).filter((stamp) => now - stamp < 15 * 60 * 1000);
  failures.set(ip, recent);
  if (failures.size > 2000) failures.clear();
  return recent.length < 8;
}

export function noteLoginFailure(ip: string, now = Date.now()): void {
  const recent = (failures.get(ip) ?? []).filter((stamp) => now - stamp < 15 * 60 * 1000);
  recent.push(now);
  failures.set(ip, recent);
}

export function signAdminSession(exp = Date.now() + MAX_AGE_SECONDS * 1000): string {
  const payload = Buffer.from(JSON.stringify({ sub: 'lead', exp } satisfies SessionBody), 'utf8').toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdminSession(token: string, now = Date.now()): boolean {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SessionBody>;
    return parsed.sub === 'lead' && typeof parsed.exp === 'number' && parsed.exp > now;
  } catch {
    return false;
  }
}

export function adminCookieOptions(request: Request) {
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

function sameSecret(received: string, expected: string): boolean {
  const left = createHash('sha256').update(received).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}
