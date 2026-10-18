import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SuccessScreen } from '@/components/SuccessScreen';
import { RECEIPT_COOKIE, verifyReceipt } from '@/lib/receipt';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Personagem recebido',
};

export default async function ObrigadoPage() {
  const secret = process.env.APPS_SCRIPT_TOKEN?.trim();
  const jar = await cookies();
  const token = jar.get(RECEIPT_COOKIE)?.value;
  const receipt = secret && token ? verifyReceipt(secret, token) : null;

  if (!receipt) redirect('/');

  return <SuccessScreen characterName={receipt.characterName} submissionId={receipt.submissionId} />;
}
