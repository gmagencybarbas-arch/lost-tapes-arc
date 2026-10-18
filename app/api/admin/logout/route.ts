import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions(request), maxAge: 0 });
  return response;
}
