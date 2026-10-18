import Link from 'next/link';

export function Header() {
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Arquivo de Artes, início">
        <span className="brand-mark" aria-hidden="true">
          LT
        </span>
        <span className="brand-name">
          Arquivo
          <br />
          de Artes
        </span>
      </Link>
      <nav className="nav-links" aria-label="Seções">
        <a href="/#ficha">Ficha</a>
        <Link href="/termos">Termos</Link>
        <Link href="/privacidade">Privacidade</Link>
      </nav>
    </header>
  );
}
