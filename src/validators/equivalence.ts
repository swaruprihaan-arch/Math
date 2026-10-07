/**
 * evaluateEquivalence(parsed.value, canonicalAnswer, validationPolicy)   (spec §010, §060 VALIDATING state)
 *
 * Two answers are compared as mathematical VALUES, never as strings. Form requirements (simplest form, mixed number,
 * scientific notation, …) are applied only after the value is known to be right, and a form violation yields
 * FORM_MISMATCH, which the state machine treats as INVALID_INPUT (not a counted attempt).
 */
import { absR, cmp, eq, rat, sub, type Rational } from '../domain/rational/rational';
import type { AnswerKind, AnswerValue, EquivalenceVerdict, ParsedAnswer, ValidationPolicy } from '../domain/question/types';

const EQUIVALENT: EquivalenceVerdict = { verdict: 'EQUIVALENT' };
const NON_EQUIVALENT: EquivalenceVerdict = { verdict: 'NON_EQUIVALENT' };

const FORM_NAMES: Partial<Record<AnswerKind, string>> = {
  INTEGER: 'a whole number',
  DECIMAL: 'a decimal (like 0.75)',
  RATIONAL: 'a fraction (like 7/3)',
  MIXED_NUMBER: 'a mixed number (like 2 1/3)',
  PERCENTAGE: 'a percent (like 35%)',
  SCIENTIFIC: 'scientific notation (like 4.5 x 10^3)',
  FACTORIZATION: 'a product of primes (like 2 x 2 x 3)',
  RATIO: 'a ratio (like 3:5)',
};

function formMismatch(message: string): EquivalenceVerdict {
  return { verdict: 'FORM_MISMATCH', message };
}

function numbersEqual(a: Rational, b: Rational): boolean {
  return eq(a, b);
}

function withinTolerance(value: Rational, exact: Rational, places: number): boolean {
  // |value - exact| <= 1/2 * 10^-places, computed exactly.
  const tolerance = rat(1n, 2n * 10n ** BigInt(places));
  return cmp(absR(sub(value, exact)), tolerance) <= 0;
}

/** Form checks for a value that is already known to be equal. */
function checkForm(parsed: ParsedAnswer, policy: ValidationPolicy): EquivalenceVerdict {
  const form = parsed.form;
  if (policy.requiredForms && policy.requiredForms.length > 0 && !policy.requiredForms.includes(form.kind)) {
    // A whole-number answer typed as an integer is fine when the value is an integer and fractions are required
    // only because the answer could be fractional — callers express that by including INTEGER in requiredForms.
    const wanted = policy.requiredForms.map((k) => FORM_NAMES[k] ?? k.toLowerCase()).join(' or ');
    return formMismatch(`Your value is right — now write it as ${wanted}.`);
  }
  if (policy.requireLowestTerms && form.lowestTerms === false) {
    return formMismatch('That’s equal, but not in simplest form. Simplify it.');
  }
  if (policy.requireNormalizedScientific && form.kind === 'SCIENTIFIC' && form.normalizedScientific === false) {
    return formMismatch('In scientific notation the first number must be at least 1 and less than 10.');
  }
  if (policy.requirePrimeFactors && form.kind === 'FACTORIZATION' && form.allPrimeFactors === false) {
    return formMismatch('The product is right, but every factor must be a prime number. Break down the composite factors.');
  }
  if (policy.requireCombinedLikeTerms && form.kind === 'EXPRESSION' && form.likeTermsCombined === false) {
    return formMismatch('That’s equivalent, but combine the like terms.');
  }
  return EQUIVALENT;
}

export function evaluateEquivalence(parsed: ParsedAnswer, canonical: AnswerValue, policy: ValidationPolicy): EquivalenceVerdict {
  const value = parsed.value;
  switch (canonical.type) {
    case 'NUMBER': {
      if (value.type !== 'NUMBER') {
        if (value.type === 'QR' && value.remainder === 0n && numbersEqual(rat(value.quotient), canonical.value)) return checkForm(parsed, policy);
        return NON_EQUIVALENT;
      }
      if (numbersEqual(value.value, canonical.value)) return checkForm(parsed, policy);
      if (policy.decimalTolerancePlaces !== undefined && parsed.form.kind === 'DECIMAL' && withinTolerance(value.value, canonical.value, policy.decimalTolerancePlaces)) {
        return EQUIVALENT;
      }
      return NON_EQUIVALENT;
    }
    case 'RATIO': {
      if (value.type !== 'RATIO') return NON_EQUIVALENT;
      const sameExact = eq(value.first, canonical.first) && eq(value.second, canonical.second);
      if (sameExact) return checkForm(parsed, policy);
      const proportional =
        !(value.first.numerator === 0n && value.second.numerator === 0n) &&
        eq(
          rat(value.first.numerator * canonical.second.numerator * value.second.denominator * canonical.first.denominator, 1n),
          rat(canonical.first.numerator * value.second.numerator * canonical.second.denominator * value.first.denominator, 1n),
        );
      if (proportional && policy.acceptEquivalentRatios !== false) return checkForm(parsed, policy);
      if (proportional) return formMismatch('That ratio is equivalent — write it exactly as asked.');
      return NON_EQUIVALENT;
    }
    case 'CHOICE':
      return value.type === 'CHOICE' && value.id === canonical.id ? EQUIVALENT : NON_EQUIVALENT;
    case 'TIME': {
      if (value.type !== 'TIME') return NON_EQUIVALENT;
      if (value.hour !== canonical.hour || value.minute !== canonical.minute) return NON_EQUIVALENT;
      if (canonical.period && value.period && canonical.period !== value.period) return NON_EQUIVALENT;
      return EQUIVALENT;
    }
    case 'PAIR':
      return value.type === 'PAIR' && eq(value.x, canonical.x) && eq(value.y, canonical.y) ? EQUIVALENT : NON_EQUIVALENT;
    case 'QR':
      if (value.type === 'QR') return value.quotient === canonical.quotient && value.remainder === canonical.remainder ? EQUIVALENT : NON_EQUIVALENT;
      return NON_EQUIVALENT;
    case 'LINEAR': {
      if (value.type !== 'LINEAR') return NON_EQUIVALENT;
      if (eq(value.coefficient, canonical.coefficient) && eq(value.constant, canonical.constant)) return checkForm(parsed, policy);
      return NON_EQUIVALENT;
    }
  }
}
