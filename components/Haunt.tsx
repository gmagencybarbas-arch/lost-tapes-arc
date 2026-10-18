const MARKS = [
  ['a', 'M32 6 A26 26 0 1 1 31.9 6 M32 14 V50 M18 32 H46'],
  ['b', 'M8 52 L32 8 L56 52 Z M20 40 H44'],
  ['c', 'M32 8 L52 32 L32 56 L12 32 Z M32 24 V40 M24 32 H40'],
  ['d', 'M10 18 H28 M10 18 V46 M54 18 H36 M54 18 V46 M10 46 H28 M54 46 H36'],
  ['e', 'M8 32 H56 M32 8 V56 M18 18 L46 46 M46 18 L18 46'],
  ['f', 'M12 44 C12 18 52 18 52 44 M22 44 V28 H42 V44'],
  ['g', 'M8 20 H56 M8 32 H40 M8 44 H56'],
  ['h', 'M32 10 V54 M14 22 H50 M18 42 H46 M32 22 V42'],
];

export function Haunt() {
  return (
    <div className="haunt" aria-hidden="true">
      {MARKS.map(([id, d], index) => (
        <svg key={id} className={`glyph g${index + 1}${index > 4 ? ' wide' : ''}`} viewBox="0 0 64 64">
          <path d={d} />
        </svg>
      ))}
      <span className="mote m1" />
      <span className="mote m2" />
      <span className="mote m3" />
      <span className="mote m4" />
      <span className="mote m5 wide" />
      <span className="mote m6 wide" />
      <span className="scrap s1">██</span>
      <span className="scrap s2">ARC–07</span>
      <span className="scrap s3">[  ]</span>
      <i className="tear t1" />
      <i className="tear t2" />
    </div>
  );
}
