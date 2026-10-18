import type { Metadata } from 'next';
import { AdminPanel } from '@/components/AdminPanel';
import { LoginForm } from '@/components/LoginForm';
import { readAdminSession } from '@/lib/adminSession';
import { readSiteSettings } from '@/lib/siteSettings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const signedIn = await readAdminSession();
  if (!signedIn) return <LoginForm />;
  const settings = await readSiteSettings();
  return <AdminPanel initial={settings} />;
}
