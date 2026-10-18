import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { unstable_noStore as noStore } from 'next/cache';

export type SiteSettings = {
  active: boolean;
  accent: string;
  buttonFrom: string;
  buttonTo: string;
  instagram: string;
  tiktok: string;
  youtube: string;
};

const FILE = path.join(process.cwd(), 'data', 'site-settings.json');
const HEX = /^#[0-9a-fA-F]{6}$/;
const HOSTS: Record<'instagram' | 'tiktok' | 'youtube', string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
};

export const DEFAULT_SETTINGS: SiteSettings = {
  active: true,
  accent: '#ff003c',
  buttonFrom: '#ffe56a',
  buttonTo: '#ff4b2a',
  instagram: '',
  tiktok: '',
  youtube: '',
};

export function parseSettings(input: unknown): SiteSettings | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const accent = hex(record.accent);
  const buttonFrom = hex(record.buttonFrom);
  const buttonTo = hex(record.buttonTo);
  const instagram = socialLink(record.instagram, 'instagram');
  const tiktok = socialLink(record.tiktok, 'tiktok');
  const youtube = socialLink(record.youtube, 'youtube');
  if (!accent || !buttonFrom || !buttonTo) return null;
  if (instagram === null || tiktok === null || youtube === null) return null;
  if (typeof record.active !== 'boolean') return null;
  return { active: record.active, accent, buttonFrom, buttonTo, instagram, tiktok, youtube };
}

export function themeStyle(settings: SiteSettings): string {
  const accent = settings.accent;
  const deep = shade(accent, 0.38);
  return `:root{--red:${accent};--red-deep:${deep};--button-from:${settings.buttonFrom};--button-to:${settings.buttonTo};--line:color-mix(in srgb, ${accent} 72%, transparent)}`;
}

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

function hex(value: unknown): string | null {
  return typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : null;
}

function socialLink(value: unknown, kind: keyof typeof HOSTS): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || !HOSTS[kind].includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function shade(color: string, amount: number): string {
  const value = Number.parseInt(color.slice(1), 16);
  const mix = (channel: number) => Math.max(0, Math.min(255, Math.round(channel * (1 - amount))));
  const red = mix((value >> 16) & 255);
  const green = mix((value >> 8) & 255);
  const blue = mix(value & 255);
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
