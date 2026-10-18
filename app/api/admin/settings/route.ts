import { NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/adminSession';
import { parseSettings, readSiteSettings, writeSiteSettings, type SiteSettings } from '@/lib/siteSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function denied() {
  return NextResponse.json(
    { ok: false, error: 'Entre no admin para alterar o site.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET() {
  if (!(await readAdminSession())) return denied();
  const settings = await readSiteSettings();
  return NextResponse.json({ ok: true, settings }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!(await readAdminSession())) return denied();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const current = await readSiteSettings();
  const record = body && typeof body === 'object' ? (body as Partial<SiteSettings>) : {};
  const next = parseSettings({ ...current, ...record });
  if (!next) {
    return NextResponse.json(
      { ok: false, error: 'Cor ou link inválido. Use um hex e um https da rede certa.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  await writeSiteSettings(next);
  return NextResponse.json({ ok: true, settings: next }, { headers: { 'Cache-Control': 'no-store' } });
}
