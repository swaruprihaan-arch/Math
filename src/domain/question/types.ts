/**
 * Core domain types (spec §030). Layer A (mathematical semantics) — nothing here knows about React or the DOM.
 */
import type { Rational } from '../rational/rational';

export type Topic =
  | 'ARITHMETIC'
  | 'FRACTIONS'
  | 'DECIMALS'
  | 'PERCENTAGES'
  | 'RATIOS'
  | 'EXPONENTS'
  | 'ORDER_OF_OPERATIONS'
  | 'MIXED'
  // Extensions required to preserve the existing site's "Word Problems" tab and to add the new "Grade Level Math" tab.
  | 'WORD_PROBLEMS'
  | 'GRADE_LEVEL';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'CUSTOM';

export type ArithmeticOperator = 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE';

/**
 * Representations a student may type. The first seven come from the spec; the rest are extensions needed
 * by grade-level content (California CCSSM): clocks, coordinates, division with remainders, scientific notation,
 * prime factorizations, multiple choice and linear expressions.
 */
export type AnswerKind =
  | 'INTEGER'
  | 'DECIMAL'
  | 'RATIONAL'
  | 'MIXED_NUMBER'
  | 'PERCENTAGE'
  | 'RATIO'
  | 'EXPRESSION'
  | 'CHOICE'
  | 'TIME'
  | 'ORDERED_PAIR'
  | 'QUOTIENT_REMAINDER'
  | 'SCIENTIFIC'
  | 'FACTORIZATION';

/* ------------------------------------------------------------------ */
/* Semantic answer values (CANONICAL / VALUE)                          */
/* ------------------------------------------------------------------ */

export type AnswerValue =
  | { readonly type: 'NUMBER'; readonly value: Rational }
  | { readonly type: 'RATIO'; readonly first: Rational; readonly second: Rational }
  | { readonly type: 'CHOICE'; readonly id: string }
  | { readonly type: 'TIME'; readonly hour: number; readonly minute: number; readonly period?: 'AM' | 'PM' }
  | { readonly type: 'PAIR'; readonly x: Rational; readonly y: Rational }
  | { readonly type: 'QR'; readonly quotient: bigint; readonly remainder: bigint }
  /** Linear expression coefficient·variable + constant. */
  | { readonly type: 'LINEAR'; readonly variable: string; readonly coefficient: Rational; readonly constant: Rational };

/* ------------------------------------------------------------------ */
/* Parsed input (NORMALIZED_INPUT)                                      */
/* ------------------------------------------------------------------ */

/** The surface form the student actually used, with facts the policy may care about. */
export interface AnswerFormInfo {
  readonly kind: AnswerKind;
  /** fraction / mixed / ratio written in lowest terms */
  readonly lowestTerms?: boolean;
  /** mixed number whose fractional part is proper (numerator < denominator) */
  readonly properMixedPart?: boolean;
  /** scientific notation coefficient satisfies 1 <= |a| < 10 */
  readonly normalizedScientific?: boolean;
  /** every base of a factorization is prime */
  readonly allPrimeFactors?: boolean;
  /** linear expression has each kind of term at most once (like terms combined) */
  readonly likeTermsCombined?: boolean;
  /** number of digits after the decimal point, for DECIMAL entries */
  readonly decimalDigits?: number;
}

export interface ParsedAnswer {
  readonly raw: string;
  readonly normalized: string;
  readonly value: AnswerValue;
  readonly form: AnswerFormInfo;
}

export type ParseResult =
  | { readonly ok: true; readonly answer: ParsedAnswer }
  | { readonly ok: false; readonly reason: 'EMPTY' | 'SYNTAX' | 'ZERO_DENOMINATOR' | 'IMPROPER_MIXED' | 'NOT_ALLOWED'; readonly message: string };

/* ------------------------------------------------------------------ */
/* Schema + policy                                                      */
/* ------------------------------------------------------------------ */

export type AnswerWidget = 'TEXT' | 'FRACTION' | 'CHOICE';

export interface ChoiceOption {
  readonly id: string;
  /** Plain-text label; may contain math symbols. */
  readonly label: string;
}

export interface AnswerSchema {
  /** Syntaxes the parser will try. */
  readonly accepts: readonly AnswerKind[];
  readonly widget: AnswerWidget;
  /** Short instruction shown under the input, e.g. "Type a fraction like 3/4 or a mixed number like 1 1/2". */
  readonly hint: string;
  /** Unit words/symbols the student may append or prepend and that are ignored (e.g. "cm", "$", "¢", "°"). */
  readonly units?: readonly string[];
  /** In a percent context a bare number means percent: "25" ⇒ 25%. */
  readonly percentContext?: boolean;
  /** Variable name for EXPRESSION answers. */
  readonly variable?: string;
  readonly choices?: readonly ChoiceOption[];
  /** For TIME answers: whether a.m./p.m. must be given. */
  readonly requirePeriod?: boolean;
}

export interface ValidationPolicy {
  /**
   * If the value is right but the written form is not in this list, the student gets a FORMAT hint
   * (not counted as an attempt). Omit to accept any form in schema.accepts.
   */
  readonly requiredForms?: readonly AnswerKind[];
  /** Value right but fraction/ratio not in lowest terms ⇒ FORMAT hint. */
  readonly requireLowestTerms?: boolean;
  /** A mixed number whose fractional part is improper (e.g. 1 7/4) is rejected as invalid input ("Strict mixed"). */
  readonly strictMixed?: boolean;
  /** Scientific notation must have 1 <= |coefficient| < 10. */
  readonly requireNormalizedScientific?: boolean;
  /** Factorizations must use only prime factors. */
  readonly requirePrimeFactors?: boolean;
  /** Linear expressions must have like terms combined. */
  readonly requireCombinedLikeTerms?: boolean;
  /**
   * Accept DECIMAL entries within ½·10^-places of the exact value (computed exactly with rationals).
   * Used for word problems whose exact answer is a non-terminating fraction.
   */
  readonly decimalTolerancePlaces?: number;
  /** For RATIO answers: accept equivalent ratios (6:10 for 3:5). Default true. */
  readonly acceptEquivalentRatios?: boolean;
}

export type EquivalenceVerdict =
  | { readonly verdict: 'EQUIVALENT' }
  | { readonly verdict: 'NON_EQUIVALENT' }
  /** Value is right but the written form violates the policy. Treated as INVALID_INPUT (not an attempt). */
  | { readonly verdict: 'FORM_MISMATCH'; readonly message: string };

/* ------------------------------------------------------------------ */
/* Structured prompt (Layer A description, rendered by Layer B)         */
/* ------------------------------------------------------------------ */

export type OperatorSymbol =
  | '+' | '−' | '×' | '÷' | '=' | '<' | '>' | '≤' | '≥' | '≠' | '(' | ')' | '[' | ']' | '{' | '}' | ':' | ',' | '·' | '%';

export type NumberStyle = 'auto' | 'integer' | 'decimal' | 'fraction' | 'mixed' | 'money' | 'percent';

export type PromptNode =
  | { readonly t: 'text'; readonly text: string; readonly emphasis?: 'strong' | 'em' }
  /** A number. `style` controls presentation only; the value is exact. `places` pads decimals. */
  | { readonly t: 'num'; readonly value: Rational; readonly style?: NumberStyle; readonly places?: number; readonly parenNegative?: boolean }
  | { readonly t: 'op'; readonly op: OperatorSymbol }
  /** A fraction shown exactly as written, NOT reduced (e.g. 9/12 inside a solution step). Display only. */
  | { readonly t: 'rawfrac'; readonly numerator: bigint; readonly denominator: bigint }
  | { readonly t: 'pow'; readonly base: readonly PromptNode[]; readonly exponent: readonly PromptNode[] }
  | { readonly t: 'root'; readonly index: 2 | 3; readonly radicand: readonly PromptNode[] }
  | { readonly t: 'abs'; readonly inner: readonly PromptNode[] }
  | { readonly t: 'var'; readonly name: string }
  /** The unknown box "?" */
  | { readonly t: 'blank'; readonly label?: string }
  | { readonly t: 'br' };

export type Visual =
  | { readonly v: 'clock'; readonly hour: number; readonly minute: number }
  | { readonly v: 'objects'; readonly groups: readonly { readonly emoji: string; readonly count: number; readonly label?: string }[] }
  | { readonly v: 'array'; readonly rows: number; readonly columns: number; readonly emoji: string }
  | { readonly v: 'fractionBar'; readonly parts: number; readonly shaded: number; readonly bars?: number }
  | {
      readonly v: 'numberLine';
      readonly min: Rational;
      readonly max: Rational;
      /** number of equal intervals between min and max */
      readonly intervals: number;
      readonly points: readonly { readonly at: Rational; readonly label: string }[];
      readonly labelEnds?: boolean;
    }
  | { readonly v: 'coins'; readonly coins: readonly ('penny' | 'nickel' | 'dime' | 'quarter' | 'dollar')[] }
  | { readonly v: 'table'; readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] }
  | {
      readonly v: 'shape';
      readonly shape:
        | 'triangle' | 'square' | 'rectangle' | 'pentagon' | 'hexagon' | 'octagon' | 'circle' | 'trapezoid' | 'rhombus' | 'parallelogram' | 'quadrilateral'
        | 'cube' | 'cone' | 'cylinder' | 'sphere' | 'rectangular-prism';
      readonly label?: string;
    };

export interface StructuredPrompt {
  /** Instruction line(s) shown above/around the math. */
  readonly nodes: readonly PromptNode[];
  readonly visual?: Visual;
}

/* ------------------------------------------------------------------ */
/* Solutions (spec §140)                                                */
/* ------------------------------------------------------------------ */

export interface SolutionStep {
  /** Semantic step type, e.g. "LCM", "EQUIVALENT_FRACTION", "ADD_NUMERATORS", "SIMPLIFY", "EVALUATE", "EXPLAIN". */
  readonly type: string;
  /** Renderable content. Rendering never depends on `type`. */
  readonly content: readonly PromptNode[];
  /** Typed semantic data (Rationals, not display strings). */
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface SolutionTree {
  /** Strategy id, e.g. "COMMON_DENOMINATOR", "MAKE_A_TEN", "PARTIAL_PRODUCTS". Unique within a question. */
  readonly strategy: string;
  /** Student-facing strategy name, e.g. "Make a ten". Falls back to a prettified `strategy`. */
  readonly title?: string;
  readonly steps: readonly SolutionStep[];
  /** The value the solution arrives at; tests assert it equals canonicalAnswer. */
  readonly result: AnswerValue;
}

/* ------------------------------------------------------------------ */
/* Question                                                             */
/* ------------------------------------------------------------------ */

export interface Operand {
  readonly role: string;
  readonly value: AnswerValue;
}

export interface GenerationMetadata {
  readonly generatorId: string;
  readonly generatorVersion: string;
  readonly seed?: string | number;
  readonly constraints: Readonly<Record<string, unknown>>;
  readonly retryCount: number;
}

export interface Question {
  readonly id: string;
  readonly version: number;

  readonly topic: Topic;
  readonly subtype: string;
  readonly difficulty: Difficulty;

  readonly prompt: StructuredPrompt;
  readonly operands: readonly Operand[];
  readonly operation: string;

  readonly canonicalAnswer: AnswerValue;
  readonly acceptableRepresentations: readonly AnswerKind[];

  readonly answerSchema: AnswerSchema;
  readonly validationPolicy: ValidationPolicy;

  readonly solution: SolutionTree;
  /**
   * Other ways to solve the same problem (multiple strategies). Every alternative must arrive at the canonical answer.
   * Together with `solution`, each question offers at least two strategies.
   */
  readonly alternativeSolutions: readonly SolutionTree[];

  readonly generationMetadata: GenerationMetadata;

  /** California CCSSM codes this question practices, e.g. ["5.NF.1"]. */
  readonly standards: readonly string[];

  /** How the correct answer should be displayed: "improper" | "mixed" | "auto" etc. Presentation hint only. */
  readonly answerDisplay?: NumberStyle;

  /** Wall-clock creation time. Excluded from reproducibility comparisons. */
  readonly createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Generator contract (spec §080)                                       */
/* ------------------------------------------------------------------ */

export interface SettingsValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export class QuestionGenerationError extends Error {
  constructor(
    public readonly details: { topic: Topic; generatorId: string; settings: unknown; attempts: number; reason?: string },
  ) {
    super(`Could not generate a ${details.topic} question (${details.generatorId}) after ${details.attempts} attempts${details.reason ? `: ${details.reason}` : ''}`);
    this.name = 'QuestionGenerationError';
  }
}
