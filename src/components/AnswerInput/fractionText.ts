/** The fraction boxes edit three parts; the answer is still one RAW_INPUT string parsed by the normal parser. */
export interface FractionParts {
  negative: boolean;
  whole: string;
  numerator: string;
  denominator: string;
}

export const EMPTY_PARTS: FractionParts = { negative: false, whole: '', numerator: '', denominator: '' };

export function partsToRaw(p: FractionParts): string {
  const sign = p.negative ? '-' : '';
  const hasFraction = p.numerator !== '' || p.denominator !== '';
  if (!hasFraction) return p.whole ? `${sign}${p.whole}` : p.negative ? '-' : '';
  return `${sign}${p.whole ? `${p.whole} ` : ''}${p.numerator}/${p.denominator}`;
}

export function rawToParts(raw: string): FractionParts {
  const t = raw.trim();
  const negative = t.startsWith('-');
  const body = t.replace(/^-\s*/, '');
  const mixed = /^(\d*)\s+(\d*)\/(\d*)$/.exec(body);
  if (mixed) return { negative, whole: mixed[1] ?? '', numerator: mixed[2] ?? '', denominator: mixed[3] ?? '' };
  const frac = /^(\d*)\/(\d*)$/.exec(body);
  if (frac) return { negative, whole: '', numerator: frac[1] ?? '', denominator: frac[2] ?? '' };
  return { negative, whole: body.replace(/\D/g, ''), numerator: '', denominator: '' };
}
