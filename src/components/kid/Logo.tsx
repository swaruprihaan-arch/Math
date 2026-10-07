const LETTERS: [string, string, boolean][] = [
  ['M', '#d01012', false],
  ['A', '#f8c300', true],
  ['T', '#0057a6', false],
  ['H', '#00852b', false],
];

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <a
      className="logo"
      href="#/"
      onClick={onClick}
      aria-label="Math Lab home"
    >
      {LETTERS.map(([l, c, dark], i) => (
        <span key={i} className={`logo-brick${dark ? ' dark-ink' : ''}`} style={{ background: c }} aria-hidden="true">
          {l}
        </span>
      ))}
      <span className="logo-brick dark-ink" style={{ background: '#fe8a18', width: 64 }} aria-hidden="true">
        LAB
      </span>
    </a>
  );
}
