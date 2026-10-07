import { Fragment, type ReactNode } from 'react';
import { formatNumber, nodesToSpeech } from '../../domain/answer/format';
import type { PromptNode } from '../../domain/question/types';
import { abs, isInteger, rat, toMixed, type Rational } from '../../domain/rational/rational';

function Frac({ n, d, negative }: { n: string; d: string; negative?: boolean }) {
  return (
    <span className="frac-wrap">
      {negative ? '−' : null}
      <span className="frac">
        <span className="num">{n}</span>
        <span className="den">{d}</span>
      </span>
    </span>
  );
}

function renderNumber(value: Rational, style: string | undefined, places: number | undefined): ReactNode {
  const negative = value.numerator < 0n;
  const mag = rat(abs(value.numerator), value.denominator);
  if (style === 'fraction' || (style === undefined && !isInteger(mag)) || style === 'auto') {
    if (isInteger(mag)) return formatNumber(value, 'integer');
    return <Frac n={mag.numerator.toString()} d={mag.denominator.toString()} negative={negative} />;
  }
  if (style === 'mixed') {
    if (isInteger(mag)) return formatNumber(value, 'integer');
    const m = toMixed(mag);
    if (m.whole === 0n) return <Frac n={m.numerator.toString()} d={m.denominator.toString()} negative={negative} />;
    return (
      <span className="mixed">
        {negative ? '−' : null}
        <span>{m.whole.toString()}</span>
        <Frac n={m.numerator.toString()} d={m.denominator.toString()} />
      </span>
    );
  }
  return formatNumber(value, (style as 'decimal' | 'money' | 'percent' | 'integer') ?? 'auto', places);
}

function renderNodes(nodes: readonly PromptNode[], keyPrefix = '', fill?: string): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}${i}`;
    switch (node.t) {
      case 'text':
        return node.emphasis === 'strong' ? (
          <strong key={key} className="text">
            {node.text}
          </strong>
        ) : node.emphasis === 'em' ? (
          <em key={key} className="text">
            {node.text}
          </em>
        ) : (
          <span key={key} className="text">
            {node.text}
          </span>
        );
      case 'num': {
        const content = renderNumber(node.value, node.style, node.places);
        return (
          <span key={key} className="number">
            {node.parenNegative && node.value.numerator < 0n ? (
              <>
                ({content})
              </>
            ) : (
              content
            )}
          </span>
        );
      }
      case 'rawfrac': {
        const negative = (node.numerator < 0n) !== (node.denominator < 0n);
        return <Frac key={key} n={abs(node.numerator).toString()} d={abs(node.denominator).toString()} negative={negative} />;
      }
      case 'op':
        return (
          <span key={key} className="op">
            {node.op}
          </span>
        );
      case 'pow':
        return (
          <span key={key} className="pow">
            {renderNodes(node.base, `${key}b`)}
            <sup>{renderNodes(node.exponent, `${key}e`)}</sup>
          </span>
        );
      case 'root':
        return (
          <span key={key} className="root">
            {node.index === 3 ? <span className="index">3</span> : null}√<span className="radicand">{renderNodes(node.radicand, `${key}r`)}</span>
          </span>
        );
      case 'abs':
        return (
          <span key={key} className="abs">
            |{renderNodes(node.inner, `${key}a`)}|
          </span>
        );
      case 'var':
        return (
          <span key={key} className="var">
            {node.name}
          </span>
        );
      case 'blank':
        return (
          <span key={key} className={`blank${fill ? ' filled' : ''}`}>
            {fill ?? node.label ?? '?'}
          </span>
        );
      case 'br':
        return <span key={key} className="br" />;
      default:
        return <Fragment key={key} />;
    }
  });
}

function isWordy(nodes: readonly PromptNode[]): boolean {
  const textLength = nodes.reduce((n, x) => n + (x.t === 'text' ? x.text.length : 0), 0);
  const firstBr = nodes.findIndex((x) => x.t === 'br');
  const beforeBr = firstBr === -1 ? textLength : nodes.slice(0, firstBr).reduce((n, x) => n + (x.t === 'text' ? x.text.length : 0), 0);
  return textLength > 34 && !(firstBr > -1 && beforeBr < 34 && textLength - beforeBr < 20);
}

export interface MathViewProps {
  nodes: readonly PromptNode[];
  size?: 'big' | 'small';
  /** Spoken label for screen readers; defaults to the prompt read as speech. */
  label?: string;
  /** Text shown inside the "?" box (the answer, once it is correct). */
  fillBlank?: string;
}

/** Renders structured math (Layer B). Screen readers get a spoken version of the same content. */
export function MathView({ nodes, size = 'big', label, fillBlank }: MathViewProps) {
  const wordy = size === 'big' && isWordy(nodes);
  const firstBr = nodes.findIndex((x) => x.t === 'br');
  const hasLead = !wordy && size === 'big' && firstBr > 0 && nodes.slice(0, firstBr).every((x) => x.t === 'text');
  const lead = hasLead ? nodes.slice(0, firstBr) : [];
  const body = hasLead ? nodes.slice(firstBr + 1) : nodes;
  return (
    <>
      <div className={`math${size === 'small' ? ' small' : ''}${wordy ? ' word' : ''}`} aria-hidden="true">
        {hasLead ? <span className="lead">{lead.map((x) => (x.t === 'text' ? x.text : '')).join('')}</span> : null}
        {renderNodes(body, '', fillBlank)}
      </div>
      <span className="sr-only">{label ?? nodesToSpeech(nodes)}</span>
    </>
  );
}
