import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { RECEIPT_COOKIE, receiptCookieOptions, verifyReceipt } from '@/lib/receipt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function currentReceipt() {
  const secret = process.env.APPS_SCRIPT_TOKEN?.trim();
  if (!secret) return null;
  const jar = await cookies();
  const token = jar.get(RECEIPT_COOKIE)?.value;
  if (!token) return null;
  return verifyReceipt(secret, token);
}

export async function GET() {
  const receipt = await currentReceipt();
  if (!receipt) {
    return NextResponse.json({ ok: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(
    { ok: true, fileName: receipt.fileName },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(RECEIPT_COOKIE, '', { ...receiptCookieOptions(request), maxAge: 0 });
  return response;
}
