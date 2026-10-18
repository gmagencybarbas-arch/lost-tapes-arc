import { ClosedHome } from '@/components/ClosedHome';
import { HomeScreen } from '@/components/HomeScreen';
import { readSiteSettings } from '@/lib/siteSettings';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const settings = await readSiteSettings();
  if (!settings.active) return <ClosedHome settings={settings} />;
  return <HomeScreen />;
}
