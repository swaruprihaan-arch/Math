/**
 * RAW_INPUT → normalized text.
 *
 * IMPORTANT: whitespace is COLLAPSED, never removed. Removing it would turn the mixed number "1 5/12" (= 17/12)
 * into "15/12" (= 5/4) — a different value that would silently be marked wrong.
 */
export function normalizeInput(raw: string): string {
  return raw
    .replace(/[−–—‒﹣－]/g, '-') // minus/dash variants → hyphen-minus
    .replace(/[⁄∕]/g, '/') // fraction slash, division slash
    .replace(/ /g, ' ') // non-breaking space
    .replace(/\s+/g, ' ')
    .trim();
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁻': '-',
};

/** Rewrite superscript exponents as ^n ("10⁴" → "10^4", "2³" → "2^3"). */
export function superscriptsToCaret(text: string): string {
  return text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => `^${[...m].map((c) => SUPERSCRIPT_DIGITS[c] ?? '').join('')}`);
}

/** Signed number: integers with optional comma grouping, or decimals. */
export const NUMBER_PATTERN = String.raw`[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|[+-]?\.\d+`;
/** Unsigned digits only. */
export const DIGITS = String.raw`\d+`;

/** Remove recognized units (leading "$", trailing "cm", "¢", "degrees", …). Case-insensitive, longest first. */
export function stripUnits(text: string, units: readonly string[] | undefined): string {
  if (!units || units.length === 0) return text;
  let out = text;
  if (units.includes('$')) out = out.replace(/^(-?)\s*\$\s*/, '$1');
  const trailing = units.filter((u) => u !== '$').sort((a, b) => b.length - a.length);
  for (const unit of trailing) {
    const escaped = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\s*${escaped}\\.?$`, 'i');
    if (re.test(out)) {
      out = out.replace(re, '');
      break;
    }
  }
  return out.trim();
}
