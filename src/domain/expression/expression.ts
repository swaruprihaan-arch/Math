/**
 * Arithmetic expression AST with exact evaluation and a step-by-step (PEMDAS) reducer.
 * Replaces the legacy site's `Function(...)` evaluation — eval-style evaluation is forbidden by the spec.
 */
import { formatNumber } from '../answer/format';
import type { PromptNode } from '../question/types';
import { add, div, isZero, mul, pow as powR, rat, sub, type Rational } from '../rational/rational';

export type BinOp = '+' | '-' | '*' | '/';
export type Bracket = '()' | '[]' | '{}';

export type Expr =
  | { readonly k: 'num'; readonly v: Rational }
  | { readonly k: 'bin'; readonly op: BinOp; readonly l: Expr; readonly r: Expr }
  | { readonly k: 'pow'; readonly base: Expr; readonly exp: number }
  | { readonly k: 'group'; readonly e: Expr; readonly bracket: Bracket };

export const E = {
  n: (v: number | Rational): Expr => ({ k: 'num', v: typeof v === 'number' ? rat(v) : v }),
  add: (l: Expr, r: Expr): Expr => ({ k: 'bin', op: '+', l, r }),
  sub: (l: Expr, r: Expr): Expr => ({ k: 'bin', op: '-', l, r }),
  mul: (l: Expr, r: Expr): Expr => ({ k: 'bin', op: '*', l, r }),
  div: (l: Expr, r: Expr): Expr => ({ k: 'bin', op: '/', l, r }),
  pow: (base: Expr, exp: number): Expr => ({ k: 'pow', base, exp }),
  group: (e: Expr, bracket: Bracket = '()'): Expr => ({ k: 'group', e, bracket }),
};

export class ExpressionError extends Error {}

export function evaluate(e: Expr): Rational {
  switch (e.k) {
    case 'num':
      return e.v;
    case 'group':
      return evaluate(e.e);
    case 'pow':
      return powR(evaluate(e.base), e.exp);
    case 'bin': {
      const l = evaluate(e.l);
      const r = evaluate(e.r);
      switch (e.op) {
        case '+':
          return add(l, r);
        case '-':
          return sub(l, r);
        case '*':
          return mul(l, r);
        case '/':
          if (isZero(r)) throw new ExpressionError('division by zero');
          return div(l, r);
      }
    }
  }
}

/** Every intermediate value (used to enforce "whole numbers only" constraints during generation). */
export function intermediateValues(e: Expr): Rational[] {
  const out: Rational[] = [];
  const walk = (x: Expr): Rational => {
    const v = x.k === 'num' ? x.v : x.k === 'group' ? walk(x.e) : x.k === 'pow' ? powR(walk(x.base), x.exp) : (() => {
      const l = walk(x.l);
      const r = walk(x.r);
      if (x.op === '/' && isZero(r)) throw new ExpressionError('division by zero');
      return x.op === '+' ? add(l, r) : x.op === '-' ? sub(l, r) : x.op === '*' ? mul(l, r) : div(l, r);
    })();
    out.push(v);
    return v;
  };
  walk(e);
  return out;
}

function precedence(e: Expr): number {
  if (e.k === 'bin') return e.op === '+' || e.op === '-' ? 1 : 2;
  if (e.k === 'pow') return 3;
  return 4;
}

const OP_SYMBOL: Record<BinOp, '+' | '−' | '×' | '÷'> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const OPEN: Record<Bracket, '(' | '[' | '{'> = { '()': '(', '[]': '[', '{}': '{' };
const CLOSE: Record<Bracket, ')' | ']' | '}'> = { '()': ')', '[]': ']', '{}': '}' };

/** Render to prompt nodes (Layer B consumes these). Adds parentheses only where precedence demands it. */
export function toNodes(e: Expr): PromptNode[] {
  switch (e.k) {
    case 'num':
      return [{ t: 'num', value: e.v, parenNegative: true }];
    case 'group':
      return [{ t: 'op', op: OPEN[e.bracket] }, ...toNodes(e.e), { t: 'op', op: CLOSE[e.bracket] }];
    case 'pow': {
      const base = e.base.k === 'num' && e.base.v.numerator >= 0n ? toNodes(e.base) : [{ t: 'op', op: '(' } as PromptNode, ...toNodes(e.base), { t: 'op', op: ')' } as PromptNode];
      return [{ t: 'pow', base, exponent: [{ t: 'num', value: rat(e.exp) }] }];
    }
    case 'bin': {
      const p = precedence(e);
      const wrap = (child: Expr, right: boolean): PromptNode[] => {
        const cp = precedence(child);
        const needs = cp < p || (right && cp === p && (e.op === '-' || e.op === '/'));
        return needs ? [{ t: 'op', op: '(' }, ...toNodes(child), { t: 'op', op: ')' }] : toNodes(child);
      };
      return [...wrap(e.l, false), { t: 'op', op: OP_SYMBOL[e.op] }, ...wrap(e.r, true)];
    }
  }
}

export function exprToText(e: Expr): string {
  switch (e.k) {
    case 'num':
      return e.v.numerator < 0n ? `(${formatNumber(e.v)})` : formatNumber(e.v);
    case 'group':
      return `${OPEN[e.bracket]}${exprToText(e.e)}${CLOSE[e.bracket]}`;
    case 'pow':
      return `${exprToText(e.base)}^${e.exp}`;
    case 'bin': {
      const p = precedence(e);
      const side = (child: Expr, right: boolean) => {
        const cp = precedence(child);
        const t = exprToText(child);
        return cp < p || (right && cp === p && (e.op === '-' || e.op === '/')) ? `(${t})` : t;
      };
      return `${side(e.l, false)} ${OP_SYMBOL[e.op]} ${side(e.r, true)}`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Step-by-step reduction                                              */
/* ------------------------------------------------------------------ */

export interface ReductionStep {
  readonly kind: 'GROUP' | 'EXPONENT' | 'MULTIPLY' | 'DIVIDE' | 'ADD' | 'SUBTRACT';
  readonly insideGroup: boolean;
  readonly text: string;
  readonly value: Rational;
  readonly after: Expr;
}

interface Candidate {
  path: number[];
  depth: number;
  cls: number;
  index: number;
}

function unwrapTrivial(e: Expr): Expr {
  switch (e.k) {
    case 'num':
      return e;
    case 'group': {
      const inner = unwrapTrivial(e.e);
      return inner.k === 'num' ? inner : { ...e, e: inner };
    }
    case 'pow':
      return { ...e, base: unwrapTrivial(e.base) };
    case 'bin':
      return { ...e, l: unwrapTrivial(e.l), r: unwrapTrivial(e.r) };
  }
}

function collect(e: Expr, depth: number, path: number[], counter: { i: number }, out: Candidate[]): void {
  switch (e.k) {
    case 'num':
      counter.i++;
      return;
    case 'group':
      collect(e.e, depth + 1, [...path, 0], counter, out);
      return;
    case 'pow':
      collect(e.base, depth, [...path, 0], counter, out);
      if (e.base.k === 'num') out.push({ path, depth, cls: 3, index: counter.i });
      counter.i++;
      return;
    case 'bin':
      collect(e.l, depth, [...path, 0], counter, out);
      if (e.l.k === 'num' && e.r.k === 'num') out.push({ path, depth, cls: e.op === '*' || e.op === '/' ? 2 : 1, index: counter.i });
      counter.i++;
      collect(e.r, depth, [...path, 1], counter, out);
      return;
  }
}

function getAt(e: Expr, path: number[]): Expr {
  let cur = e;
  for (const p of path) {
    if (cur.k === 'group') cur = cur.e;
    else if (cur.k === 'pow') cur = cur.base;
    else if (cur.k === 'bin') cur = p === 0 ? cur.l : cur.r;
  }
  return cur;
}

function replaceAt(e: Expr, path: number[], replacement: Expr): Expr {
  if (path.length === 0) return replacement;
  const [head, ...rest] = path;
  switch (e.k) {
    case 'group':
      return { ...e, e: replaceAt(e.e, rest, replacement) };
    case 'pow':
      return { ...e, base: replaceAt(e.base, rest, replacement) };
    case 'bin':
      return head === 0 ? { ...e, l: replaceAt(e.l, rest, replacement) } : { ...e, r: replaceAt(e.r, rest, replacement) };
    default:
      return e;
  }
}

/** One PEMDAS step, or null when the expression is a single number. */
export function reduceOnce(expression: Expr): ReductionStep | null {
  const e = unwrapTrivial(expression);
  if (e.k === 'num') return null;
  const candidates: Candidate[] = [];
  collect(e, 0, [], { i: 0 }, candidates);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.depth - a.depth || b.cls - a.cls || a.index - b.index);
  const pick = candidates[0] as Candidate;
  const node = getAt(e, pick.path);
  let value: Rational;
  let text: string;
  let kind: ReductionStep['kind'];
  if (node.k === 'pow' && node.base.k === 'num') {
    value = powR(node.base.v, node.exp);
    text = `${exprToText(node.base)}^${node.exp} = ${formatNumber(value)}`;
    kind = 'EXPONENT';
  } else if (node.k === 'bin' && node.l.k === 'num' && node.r.k === 'num') {
    value = evaluate(node);
    text = `${exprToText(node.l)} ${OP_SYMBOL[node.op]} ${exprToText(node.r)} = ${formatNumber(value)}`;
    kind = node.op === '+' ? 'ADD' : node.op === '-' ? 'SUBTRACT' : node.op === '*' ? 'MULTIPLY' : 'DIVIDE';
  } else {
    throw new ExpressionError('unexpected reducible node');
  }
  const after = unwrapTrivial(replaceAt(e, pick.path, { k: 'num', v: value }));
  return { kind, insideGroup: pick.depth > 0, text, value, after };
}

/** All PEMDAS steps until a single number remains (bounded by the number of operations). */
export function reduceFully(e: Expr): ReductionStep[] {
  const steps: ReductionStep[] = [];
  let cur: Expr = e;
  for (let guard = 0; guard < 200; guard++) {
    const s = reduceOnce(cur);
    if (!s) break;
    steps.push(s);
    cur = s.after;
  }
  return steps;
}

/** Split a top-level chain of + and − into terms: a × b + c − d ÷ e → [a×b, +c, −d÷e]. */
export function topLevelTerms(e: Expr): { sign: '+' | '-'; term: Expr }[] {
  if (e.k === 'bin' && (e.op === '+' || e.op === '-')) {
    return [...topLevelTerms(e.l), { sign: e.op, term: e.r }];
  }
  return [{ sign: '+', term: e }];
}

export function countOperations(e: Expr): number {
  switch (e.k) {
    case 'num':
      return 0;
    case 'group':
      return countOperations(e.e);
    case 'pow':
      return 1 + countOperations(e.base);
    case 'bin':
      return 1 + countOperations(e.l) + countOperations(e.r);
  }
}

export function usesOperator(e: Expr, op: BinOp | '^'): boolean {
  switch (e.k) {
    case 'num':
      return false;
    case 'group':
      return usesOperator(e.e, op);
    case 'pow':
      return op === '^' || usesOperator(e.base, op);
    case 'bin':
      return e.op === op || usesOperator(e.l, op) || usesOperator(e.r, op);
  }
}
