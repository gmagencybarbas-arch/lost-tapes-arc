import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, Outfit } from 'next/font/google';
import { Haunt } from '@/components/Haunt';
import { MotionFlag } from '@/components/MotionFlag';
import { readSiteSettings, themeStyle } from '@/lib/siteSettings';
import './globals.css';

const display = Bodoni_Moda({
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Outfit({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Lost Tapes - ARC',
    template: '%s · Lost Tapes - ARC',
  },
  description: 'Envie sua arte, seu personagem pode fazer parte do universo ARC.',
};

export const viewport: Viewport = {
  themeColor: '#170000',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await readSiteSettings();
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${sans.variable}`}>
        <style>{themeStyle(settings)}</style>
        <MotionFlag />
        <a className="skip-link" href="#main">
          Pular para o conteúdo
        </a>
        <div className="world">
          <div className="frame">
            <div className="mist" aria-hidden="true" />
            <Haunt />
            <svg className="sigil" viewBox="0 0 240 420" fill="none" aria-hidden="true">
              <circle cx="120" cy="150" r="92" stroke="currentColor" strokeWidth="1" />
              <circle cx="120" cy="150" r="58" stroke="currentColor" strokeWidth="1" />
              <path d="M120 48 L196 188 H44 Z" stroke="currentColor" strokeWidth="1" />
              <path d="M28 300 H212 M120 250 V390" stroke="currentColor" strokeWidth="1" />
            </svg>
            <div className="frame-body">{children}</div>
            <footer className="site-foot">
              <a href="/termos">Termos</a>
              <a href="/privacidade">Privacidade</a>
              <a href="/admin">Admin</a>
              <span>O sorteio não garante aparição</span>
            </footer>
          </div>
        </div>
        <noscript>
          <style>{'.reveal{opacity:1;transform:none}'}</style>
          <p className="whisper" style={{ textAlign: 'center', padding: 16 }}>
            Ative o JavaScript para abrir a ficha e transmitir o personagem.
          </p>
        </noscript>
      </body>
    </html>
  );
}
