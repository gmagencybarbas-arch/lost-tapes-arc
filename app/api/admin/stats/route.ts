import { NextResponse } from 'next/server';
import { countSubmissions } from '@/lib/driveCount';
import { readAdminSession } from '@/lib/adminSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await readAdminSession())) {
    return NextResponse.json(
      { ok: false, error: 'Entre no admin para ver os envios.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const count = await countSubmissions();
    return NextResponse.json(count, {
      status: count.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Não deu para contar os envios agora.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
