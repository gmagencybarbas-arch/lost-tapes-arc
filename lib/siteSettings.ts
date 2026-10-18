import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { unstable_noStore as noStore } from 'next/cache';
import { DEFAULT_SETTINGS, parseSettings, type SiteSettings } from './theme';

const FILE = path.join(process.cwd(), 'data', 'site-settings.json');

export async function readSiteSettings(): Promise<SiteSettings> {
  noStore();
  try {
    const parsed = parseSettings(JSON.parse(await readFile(FILE, 'utf8')));
    return parsed ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function writeSiteSettings(settings: SiteSettings): Promise<void> {
  const safe = parseSettings(settings);
  if (!safe) throw new Error('configuracao invalida');
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(safe, null, 2), 'utf8');
}
