export type SiteSettings = {
  active: boolean;
  accent: string;
  background: string;
  backgroundGlow: string;
  buttonFrom: string;
  buttonTo: string;
  text: string;
  title: string;
  instagram: string;
  tiktok: string;
  youtube: string;
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const HOSTS: Record<'instagram' | 'tiktok' | 'youtube', string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
};

export const DEFAULT_SETTINGS: SiteSettings = {
  active: true,
  accent: '#0057ff',
  background: '#050816',
  backgroundGlow: '#0057ff',
  buttonFrom: '#ffe56a',
  buttonTo: '#0057ff',
  text: '#fff4d4',
  title: '#0057ff',
  instagram: '',
  tiktok: '',
  youtube: '',
};

export function parseSettings(input: unknown): SiteSettings | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const accent = hex(record.accent);
  const background = hexOrDefault(record.background, DEFAULT_SETTINGS.background);
  const backgroundGlow = hexOrDefault(record.backgroundGlow, DEFAULT_SETTINGS.backgroundGlow);
  const buttonFrom = hex(record.buttonFrom);
  const buttonTo = hex(record.buttonTo);
  const text = hexOrDefault(record.text, DEFAULT_SETTINGS.text);
  const title = hexOrDefault(record.title, DEFAULT_SETTINGS.title);
  const instagram = socialLink(record.instagram, 'instagram');
  const tiktok = socialLink(record.tiktok, 'tiktok');
  const youtube = socialLink(record.youtube, 'youtube');
  if (!accent || !background || !backgroundGlow || !buttonFrom || !buttonTo || !text || !title) return null;
  if (instagram === null || tiktok === null || youtube === null) return null;
  if (typeof record.active !== 'boolean') return null;
  return {
    active: record.active,
    accent,
    background,
    backgroundGlow,
    buttonFrom,
    buttonTo,
    text,
    title,
    instagram,
    tiktok,
    youtube,
  };
}

export function themeVars(settings: SiteSettings): Record<string, string> | null {
  const colors = [
    settings.accent,
    settings.background,
    settings.backgroundGlow,
    settings.buttonFrom,
    settings.buttonTo,
    settings.text,
    settings.title,
  ];
  if (!colors.every((color) => HEX.test(color))) return null;
  return {
    '--red': settings.accent,
    '--red-deep': shade(settings.accent, 0.38),
    '--bg': shade(settings.background, 0.28),
    '--bg-deep': settings.background,
    '--bg-glow': settings.backgroundGlow,
    '--button-from': settings.buttonFrom,
    '--button-to': settings.buttonTo,
    '--cream': settings.text,
    '--title': settings.title,
    '--line': `color-mix(in srgb, ${settings.accent} 72%, transparent)`,
  };
}

export function themeStyle(settings: SiteSettings): string {
  const vars = themeVars(settings);
  if (!vars) return '';
  const body = Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
  return `:root{${body}}`;
}

function hex(value: unknown): string | null {
  return typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : null;
}

function hexOrDefault(value: unknown, fallback: string): string | null {
  if (value == null || value === '') return fallback;
  return hex(value);
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
