import type { ParsedAnswer } from '../domain/question/types';

const TIME = /^(\d{1,2})\s*:\s*(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?$/i;

/** "3:05", "3:05 pm", "15:05" (→ 3:05 PM). */
export function parseTime(raw: string, text: string): ParsedAnswer | null {
  const m = TIME.exec(text);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  if (minute > 59 || hour > 23) return null;
  let period: 'AM' | 'PM' | undefined = m[3] ? (m[3].toLowerCase().startsWith('a') ? 'AM' : 'PM') : undefined;
  if (hour === 0) {
    if (period === 'PM') return null;
    hour = 12;
    period = 'AM';
  } else if (hour > 12) {
    if (period === 'AM') return null;
    hour -= 12;
    period = 'PM';
  }
  return {
    raw,
    normalized: `${hour}:${String(minute).padStart(2, '0')}${period ? ` ${period}` : ''}`,
    value: period ? { type: 'TIME', hour, minute, period } : { type: 'TIME', hour, minute },
    form: { kind: 'TIME' },
  };
}
