import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  allowLoginAttempt,
  credentialsMatch,
  noteLoginFailure,
  signAdminSession,
} from '@/lib/adminAuth';
import { clientIp } from '@/lib/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!allowLoginAttempt(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas. Espere um pouco.' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const user = typeof record.user === 'string' ? record.user : '';
  const password = typeof record.password === 'string' ? record.password : '';

  if (!credentialsMatch(user, password)) {
    noteLoginFailure(ip);
    return NextResponse.json(
      { ok: false, error: 'Login ou senha não conferem.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(ADMIN_COOKIE, signAdminSession(), adminCookieOptions(request));
  return response;
}
