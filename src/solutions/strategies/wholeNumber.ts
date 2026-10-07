/**
 * Multiple solution strategies for whole-number (and integer) arithmetic.
 * Each builder returns >= 2 SolutionTrees; the first is the primary method for that size of problem.
 * All strategies arrive at the same exact result (tests enforce this).
 */
import { A, P, solution, step } from '../../domain/question/build';
import type { SolutionStep, SolutionTree } from '../../domain/question/types';

const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands', 'millions', 'ten-millions', 'hundred-millions'];

function fmt(n: number): string {
  const s = Math.abs(n).toString();
  const grouped = s.length > 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s;
  return n < 0 ? `−${grouped}` : grouped;
}

function digitAt(n: number, place: number): number {
  return Math.floor(Math.abs(n) / 10 ** place) % 10;
}

function numDigits(n: number): number {
  return Math.abs(n).toString().length;
}

function say(text: string, type = 'EXPLAIN', data?: Record<string, unknown>): SolutionStep {
  return step([P.text(text)], type, data);
}

function assertWhole(...ns: number[]): void {
  for (const n of ns) if (!Number.isSafeInteger(n)) throw new Error(`whole-number strategy needs safe integers, got ${n}`);
}

/** Expanded form parts: 347 → [300, 40, 7] (non-zero parts only; [0] for 0). */
export function expandedParts(n: number): number[] {
  const parts: number[] = [];
  const len = numDigits(n);
  for (let p = len - 1; p >= 0; p--) {
    const d = digitAt(n, p);
    if (d !== 0) parts.push(d * 10 ** p);
  }
  return parts.length ? parts : [0];
}

/* ================================================================== */
/* Addition                                                            */
/* ================================================================== */

function columnAddition(a: number, b: number): SolutionTree {
  const steps: SolutionStep[] = [say('Line up the places. Add from the ones.', 'ALIGN')];
  const len = Math.max(numDigits(a), numDigits(b));
  let carry = 0;
  for (let p = 0; p < len; p++) {
    const da = digitAt(a, p);
    const db = digitAt(b, p);
    const s = da + db + carry;
    const place = PLACE_NAMES[p] ?? `10^${p}`;
    const carryText = carry ? ` + ${carry} (carried)` : '';
    if (s >= 10) {
      steps.push(say(`${capitalize(place)}: ${da} + ${db}${carryText} = ${s}. Write ${s % 10}, carry 1.`, 'COLUMN', { place: p, sum: s }));
    } else {
      steps.push(say(`${capitalize(place)}: ${da} + ${db}${carryText} = ${s}. Write ${s}.`, 'COLUMN', { place: p, sum: s }));
    }
    carry = s >= 10 ? 1 : 0;
  }
  if (carry) steps.push(say('Write the carried 1 in front.', 'CARRY'));
  steps.push(say(`So ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`, 'RESULT'));
  return solution('COLUMN_ADDITION', steps, A.number(a + b), 'Column addition');
}

function breakApartAddition(a: number, b: number): SolutionTree {
  const len = Math.max(numDigits(a), numDigits(b));
  const steps: SolutionStep[] = [say(`Break both numbers apart by place value: ${fmt(a)} = ${expandedParts(a).map(fmt).join(' + ')} and ${fmt(b)} = ${expandedParts(b).map(fmt).join(' + ')}.`, 'EXPAND')];
  const partials: number[] = [];
  for (let p = len - 1; p >= 0; p--) {
    const pa = digitAt(a, p) * 10 ** p;
    const pb = digitAt(b, p) * 10 ** p;
    if (pa === 0 && pb === 0) continue;
    partials.push(pa + pb);
    steps.push(say(`Add the ${PLACE_NAMES[p]}: ${fmt(pa)} + ${fmt(pb)} = ${fmt(pa + pb)}.`, 'PARTIAL_SUM', { place: p, value: pa + pb }));
  }
  steps.push(say(`Put them together: ${partials.map(fmt).join(' + ')} = ${fmt(a + b)}.`, 'RESULT'));
  return solution('PARTIAL_SUMS', steps, A.number(a + b), 'Break apart by place value');
}

function compensationAddition(a: number, b: number): SolutionTree {
  // Round the addend whose ones digit is closest to the next ten.
  const pick = (n: number) => (10 - (n % 10)) % 10;
  const roundB = pick(b) <= pick(a);
  const target = roundB ? b : a;
  const other = roundB ? a : b;
  const k = pick(target);
  const rounded = target + k;
  const steps = [
    say(`${fmt(target)} is close to ${fmt(rounded)}. Add ${fmt(rounded)} first.`, 'ROUND', { rounded, extra: k }),
    say(`${fmt(other)} + ${fmt(rounded)} = ${fmt(other + rounded)}.`, 'ADD_FRIENDLY'),
    say(`Take away the extra ${k}: ${fmt(other + rounded)} − ${k} = ${fmt(a + b)}.`, 'ADJUST'),
  ];
  return solution('COMPENSATION', steps, A.number(a + b), 'Make a friendly number');
}

function numberLineAddition(a: number, b: number): SolutionTree {
  const start = Math.max(a, b);
  const jump = Math.min(a, b);
  const parts = expandedParts(jump).filter((x) => x > 0);
  const steps: SolutionStep[] = [say(`Start at ${fmt(start)} on a number line.`, 'START')];
  let at = start;
  for (const part of parts) {
    steps.push(say(`Jump forward ${fmt(part)}: ${fmt(at)} → ${fmt(at + part)}.`, 'JUMP', { from: at, by: part }));
    at += part;
  }
  if (parts.length === 0) steps.push(say(`Adding 0 does not move you: you stay at ${fmt(at)}.`, 'JUMP'));
  steps.push(say(`You land on ${fmt(a + b)}.`, 'RESULT'));
  return solution('NUMBER_LINE_JUMPS', steps, A.number(a + b), 'Number line jumps');
}

function countOn(a: number, b: number): SolutionTree {
  const start = Math.max(a, b);
  const more = Math.min(a, b);
  const counts = Array.from({ length: more }, (_, i) => start + i + 1);
  const steps =
    more === 0
      ? [say(`Adding 0 changes nothing: ${start} + 0 = ${start}.`, 'IDENTITY')]
      : [
          say(`Start with the bigger number, ${start}, in your head.`, 'START'),
          say(`Count on ${more} more: ${counts.join(', ')}.`, 'COUNT_ON', { counts }),
          say(`The last number you said is ${a + b}.`, 'RESULT'),
        ];
  return solution('COUNT_ON', steps, A.number(a + b), 'Count on');
}

function makeATen(a: number, b: number): SolutionTree | null {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  if (big >= 10 || a + b <= 10 || small === 0) return null;
  const need = 10 - big;
  return solution(
    'MAKE_A_TEN',
    [
      say(`${big} needs ${need} more to make 10. Break ${small} into ${need} + ${small - need}.`, 'DECOMPOSE', { need }),
      say(`${big} + ${need} = 10.`, 'MAKE_TEN'),
      say(`10 + ${small - need} = ${a + b}.`, 'RESULT'),
    ],
    A.number(a + b),
    'Make a ten',
  );
}

function doublesAddition(a: number, b: number): SolutionTree | null {
  if (Math.abs(a - b) > 1 || a === 0 || b === 0) return null;
  const small = Math.min(a, b);
  if (a === b) {
    return solution('DOUBLES', [say(`This is a double: ${a} + ${a} = ${a + b}.`, 'DOUBLE')], A.number(a + b), 'Doubles');
  }
  return solution(
    'DOUBLES_PLUS_ONE',
    [say(`${a} and ${b} are next to each other. Use the double ${small} + ${small} = ${2 * small}.`, 'DOUBLE'), say(`Add 1 more: ${2 * small} + 1 = ${a + b}.`, 'RESULT')],
    A.number(a + b),
    'Doubles plus one',
  );
}

function integerAdditionStrategies(a: number, b: number): SolutionTree[] {
  const result = a + b;
  const sameSign = (a >= 0 && b >= 0) || (a <= 0 && b <= 0);
  const rule = sameSign
    ? [
        say(`Both numbers have the same sign, so add their absolute values: ${Math.abs(a)} + ${Math.abs(b)} = ${Math.abs(result)}.`, 'SAME_SIGN'),
        say(`Keep the common sign: ${fmt(result)}.`, 'RESULT'),
      ]
    : [
        say(`The signs are different, so subtract the absolute values: ${Math.max(Math.abs(a), Math.abs(b))} − ${Math.min(Math.abs(a), Math.abs(b))} = ${Math.abs(result)}.`, 'DIFFERENT_SIGNS'),
        say(`Use the sign of the number with the larger absolute value: ${fmt(result)}.`, 'RESULT'),
      ];
  const line = [
    say(`Start at ${fmt(a)} on the number line.`, 'START'),
    say(`${b >= 0 ? `Move ${b} to the right` : `Move ${Math.abs(b)} to the left`} (adding ${b >= 0 ? 'a positive' : 'a negative'} number).`, 'MOVE'),
    say(`You land on ${fmt(result)}.`, 'RESULT'),
  ];
  return [solution('SIGN_RULES', rule, A.number(result), 'Use the sign rules'), solution('NUMBER_LINE', line, A.number(result), 'Number line')];
}

/** 47 + 6: 47 + 3 = 50, 50 + 3 = 53 (only when crossing a ten). */
function makeNextTen(a: number, b: number): SolutionTree | null {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const need = (10 - (big % 10)) % 10;
  if (big < 10 || need === 0 || small <= need) return null;
  return solution(
    'MAKE_NEXT_TEN',
    [say(`Break ${small} into ${need} + ${small - need}.`, 'DECOMPOSE'), say(`${big} + ${need} = ${big + need}.`, 'MAKE_TEN'), say(`${big + need} + ${small - need} = ${a + b}.`, 'RESULT')],
    A.number(a + b),
    'Make the next ten',
  );
}

/** 53 − 6: 53 − 3 = 50, 50 − 3 = 47 (only when crossing a ten). */
function backToTen(a: number, b: number): SolutionTree | null {
  const down = a % 10;
  if (a < 20 || down === 0 || b <= down) return null;
  return solution(
    'BACK_TO_TEN',
    [say(`Break ${b} into ${down} + ${b - down}.`, 'DECOMPOSE'), say(`${a} − ${down} = ${a - down}.`, 'MAKE_TEN'), say(`${a - down} − ${b - down} = ${a - b}.`, 'RESULT')],
    A.number(a - b),
    'Back to a ten',
  );
}

/** a + b. */
export function additionStrategies(a: number, b: number): SolutionTree[] {
  assertWhole(a, b);
  if (a < 0 || b < 0) return integerAdditionStrategies(a, b);
  if (a < 10 && b < 10) {
    const trees = [countOn(a, b)];
    const ten = makeATen(a, b);
    const dbl = doublesAddition(a, b);
    if (ten) trees.push(ten);
    if (dbl) trees.push(dbl);
    if (trees.length < 2) trees.push(numberLineAddition(a, b));
    return trees;
  }
  if (Math.min(a, b) <= 10 && Math.max(a, b) <= 100) {
    // Young learners: count on / make the next ten instead of the column algorithm.
    const trees: SolutionTree[] = [makeNextTen(a, b) ?? countOn(a, b), numberLineAddition(a, b)];
    if (trees[0]?.strategy !== 'COUNT_ON' && Math.min(a, b) <= 5) trees.push(countOn(a, b));
    return trees;
  }
  const trees = [columnAddition(a, b), breakApartAddition(a, b)];
  const onesClose = Math.max(a % 10, b % 10) >= 6 && Math.min(a, b) >= 10;
  trees.push(onesClose ? compensationAddition(a, b) : numberLineAddition(a, b));
  return trees;
}

/** Sum of several addends (e.g. 2.NBT.6, 1.OA.2). */
export function multiAdditionStrategies(addends: number[]): SolutionTree[] {
  assertWhole(...addends);
  const total = addends.reduce((s, x) => s + x, 0);
  const leftToRight: SolutionStep[] = [];
  let running = addends[0] ?? 0;
  for (let i = 1; i < addends.length; i++) {
    const x = addends[i] as number;
    leftToRight.push(say(`${fmt(running)} + ${fmt(x)} = ${fmt(running + x)}.`, 'ADD', { running: running + x }));
    running += x;
  }
  // Friendly pairs: look for two addends whose ones digits make 10.
  const steps2: SolutionStep[] = [];
  let pair: [number, number] | null = null;
  for (let i = 0; i < addends.length && !pair; i++) {
    for (let j = i + 1; j < addends.length && !pair; j++) {
      if (((addends[i] as number) + (addends[j] as number)) % 10 === 0) pair = [i, j];
    }
  }
  if (pair) {
    const [i, j] = pair;
    const ai = addends[i] as number;
    const aj = addends[j] as number;
    const rest = addends.filter((_, k) => k !== i && k !== j);
    steps2.push(say(`Look for numbers that make a ten: ${fmt(ai)} + ${fmt(aj)} = ${fmt(ai + aj)}.`, 'FRIENDLY_PAIR'));
    steps2.push(say(`Add the rest: ${fmt(ai + aj)}${rest.map((r) => ` + ${fmt(r)}`).join('')} = ${fmt(total)}.`, 'RESULT'));
  } else {
    const len = Math.max(...addends.map(numDigits));
    const partials: number[] = [];
    for (let p = len - 1; p >= 0; p--) {
      const parts = addends.map((x) => digitAt(x, p) * 10 ** p);
      const s = parts.reduce((t, x) => t + x, 0);
      if (s === 0) continue;
      partials.push(s);
      steps2.push(say(`Add the ${PLACE_NAMES[p]}: ${parts.map(fmt).join(' + ')} = ${fmt(s)}.`, 'PARTIAL_SUM'));
    }
    steps2.push(say(`Combine: ${partials.map(fmt).join(' + ')} = ${fmt(total)}.`, 'RESULT'));
  }
  return [
    solution('LEFT_TO_RIGHT', [...leftToRight, say(`The total is ${fmt(total)}.`, 'RESULT')], A.number(total), 'Add one at a time'),
    solution(pair ? 'FRIENDLY_PAIRS' : 'PARTIAL_SUMS', steps2, A.number(total), pair ? 'Find a ten first' : 'Break apart by place value'),
  ];
}

/* ================================================================== */
/* Subtraction                                                         */
/* ================================================================== */

function columnSubtraction(a: number, b: number): SolutionTree {
  const steps: SolutionStep[] = [say('Line up the places. Subtract from the ones.', 'ALIGN')];
  const len = numDigits(a);
  let borrow = 0;
  for (let p = 0; p < len; p++) {
    let da = digitAt(a, p) - borrow;
    const db = digitAt(b, p);
    const place = PLACE_NAMES[p] ?? `10^${p}`;
    if (p >= numDigits(b) && borrow === 0) {
      if (p < len - 1 || da > 0) steps.push(say(`${capitalize(place)}: nothing to subtract, bring down ${da}.`, 'COLUMN', { place: p }));
      continue;
    }
    if (da < db) {
      steps.push(
        say(
          `${capitalize(place)}: ${da} < ${db}, so regroup: ${da + 10} − ${db} = ${da + 10 - db}.`,
          'REGROUP',
          { place: p },
        ),
      );
      da += 10;
      borrow = 1;
    } else {
      steps.push(say(`${capitalize(place)}: ${da} − ${db} = ${da - db}.`, 'COLUMN', { place: p }));
      borrow = 0;
    }
  }
  steps.push(say(`So ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}.`, 'RESULT'));
  return solution('COLUMN_SUBTRACTION', steps, A.number(a - b), 'Column subtraction');
}

function countUp(a: number, b: number): SolutionTree {
  const steps: SolutionStep[] = [say(`Count up from ${fmt(b)} to ${fmt(a)}.`, 'THINK_ADDITION')];
  let at = b;
  const jumps: number[] = [];
  const targets: number[] = [];
  const nextTen = Math.ceil(b / 10) * 10;
  if (nextTen > b && nextTen < a) targets.push(nextTen);
  const nextHundred = Math.ceil(Math.max(b, nextTen) / 100) * 100;
  if (a - b > 100 && nextHundred > (targets[targets.length - 1] ?? b) && nextHundred < a) targets.push(nextHundred);
  targets.push(a);
  for (const target of targets) {
    jumps.push(target - at);
    steps.push(say(`${fmt(at)} + ${fmt(target - at)} = ${fmt(target)}.`, 'JUMP', { by: target - at }));
    at = target;
  }
  steps.push(say(`Add the jumps: ${jumps.map(fmt).join(' + ')} = ${fmt(a - b)}.`, 'RESULT'));
  return solution('COUNT_UP', steps, A.number(a - b), 'Count up (think addition)');
}

function compensationSubtraction(a: number, b: number): SolutionTree {
  const k = (10 - (b % 10)) % 10;
  return solution(
    'SAME_DIFFERENCE',
    [
      say(`Add ${k} to both numbers. The difference stays the same.`, 'SHIFT', { k }),
      say(`${fmt(a)} − ${fmt(b)} = ${fmt(a + k)} − ${fmt(b + k)}.`, 'REWRITE'),
      say(`${fmt(a + k)} − ${fmt(b + k)} = ${fmt(a - b)}.`, 'RESULT'),
    ],
    A.number(a - b),
    'Same difference',
  );
}

function breakApartSubtraction(a: number, b: number): SolutionTree {
  const parts = expandedParts(b).filter((x) => x > 0);
  const steps: SolutionStep[] = [say(`Break ${fmt(b)} into ${parts.map(fmt).join(' + ')}.`, 'EXPAND')];
  let at = a;
  for (const part of parts) {
    steps.push(say(`${fmt(at)} − ${fmt(part)} = ${fmt(at - part)}.`, 'SUBTRACT_PART'));
    at -= part;
  }
  steps.push(say(`So ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}.`, 'RESULT'));
  return solution('SUBTRACT_IN_PARTS', steps, A.number(a - b), 'Subtract in parts');
}

function countBack(a: number, b: number): SolutionTree {
  const counts = Array.from({ length: b }, (_, i) => a - i - 1);
  return solution(
    'COUNT_BACK',
    b === 0
      ? [say(`Taking away 0 leaves ${a}.`, 'IDENTITY')]
      : [say(`Start at ${a}.`, 'START'), say(`Count back ${b}: ${counts.join(', ')}.`, 'COUNT_BACK', { counts }), say(`You stop at ${a - b}.`, 'RESULT')],
    A.number(a - b),
    'Count back',
  );
}

function thinkAddition(a: number, b: number): SolutionTree {
  return solution(
    'THINK_ADDITION',
    [say(`Think: ${b} + ? = ${a}.`, 'THINK_ADDITION'), say(`${b} + ${a - b} = ${a}, so ${a} − ${b} = ${a - b}.`, 'RESULT')],
    A.number(a - b),
    'Think addition',
  );
}

function subtractToTen(a: number, b: number): SolutionTree | null {
  if (a <= 10 || a > 20 || b <= a - 10) return null;
  const toTen = a - 10;
  const rest = b - toTen;
  return solution(
    'DOWN_TO_TEN',
    [say(`Break ${b} into ${toTen} + ${rest}.`, 'DECOMPOSE'), say(`${a} − ${toTen} = 10.`, 'MAKE_TEN'), say(`10 − ${rest} = ${a - b}.`, 'RESULT')],
    A.number(a - b),
    'Subtract down to ten',
  );
}

/** a − b. */
export function subtractionStrategies(a: number, b: number): SolutionTree[] {
  assertWhole(a, b);
  if (a < 0 || b < 0 || a < b) return integerAdditionStrategies(a, -b).map((t, i) => ({
    ...t,
    strategy: i === 0 ? 'ADD_THE_OPPOSITE' : 'NUMBER_LINE',
    title: i === 0 ? 'Add the opposite' : 'Number line',
    steps: [say(`Subtracting ${fmt(b)} is the same as adding its opposite, ${fmt(-b)}.`, 'OPPOSITE'), ...t.steps],
  }));
  if (a <= 20 && b <= 10) {
    const trees = [thinkAddition(a, b), countBack(a, b)];
    const ten = subtractToTen(a, b);
    if (ten) trees.push(ten);
    return trees;
  }
  if (b <= 10 && a <= 100) {
    const trees: SolutionTree[] = [backToTen(a, b) ?? countBack(a, b), thinkAddition(a, b)];
    if (trees[0]?.strategy !== 'COUNT_BACK' && b <= 5) trees.push(countBack(a, b));
    return trees;
  }
  const trees = [columnSubtraction(a, b), countUp(a, b)];
  trees.push(b % 10 !== 0 && b >= 10 ? compensationSubtraction(a, b) : breakApartSubtraction(a, b));
  return trees;
}

/* ================================================================== */
/* Multiplication                                                      */
/* ================================================================== */

function skipCount(a: number, b: number): SolutionTree {
  const [by, times] = a <= b ? [b, a] : [a, b];
  const list = Array.from({ length: Math.min(times, 12) }, (_, i) => fmt(by * (i + 1)));
  return solution(
    'SKIP_COUNT',
    times === 0
      ? [say(`Zero groups of anything is 0.`, 'ZERO_PROPERTY')]
      : [say(`Skip count by ${fmt(by)}, ${times} time${times === 1 ? '' : 's'}: ${list.join(', ')}.`, 'SKIP_COUNT', { by, times }), say(`The last number is ${fmt(a * b)}.`, 'RESULT')],
    A.number(a * b),
    'Skip count',
  );
}

function distributiveFact(a: number, b: number): SolutionTree {
  // Split the larger factor into a friendly part (5 or 10) plus the rest.
  const [keep, split] = a >= b ? [b, a] : [a, b];
  const friendly = split > 10 ? 10 : split > 5 ? 5 : Math.max(1, split - 1);
  const rest = split - friendly;
  return solution(
    'BREAK_APART_FACTOR',
    [
      say(`Break ${split} into ${friendly} + ${rest}.`, 'DECOMPOSE'),
      say(`${keep} × ${friendly} = ${keep * friendly} and ${keep} × ${rest} = ${keep * rest}.`, 'PARTIAL_PRODUCTS'),
      say(`Add: ${keep * friendly} + ${keep * rest} = ${a * b}.`, 'RESULT'),
    ],
    A.number(a * b),
    'Break apart a factor',
  );
}

function doubling(a: number, b: number): SolutionTree | null {
  const even = a % 2 === 0 && a >= 4 ? a : b % 2 === 0 && b >= 4 ? b : null;
  if (even === null) return null;
  const other = even === a ? b : a;
  const half = even / 2;
  return solution(
    'DOUBLE_A_HALF',
    [say(`${even} is double ${half}. First find ${half} × ${other} = ${half * other}.`, 'HALF'), say(`Double it: ${half * other} + ${half * other} = ${a * b}.`, 'RESULT')],
    A.number(a * b),
    'Double a half',
  );
}

function repeatedAddition(a: number, b: number): SolutionTree {
  const [by, times] = a >= b ? [a, b] : [b, a];
  const terms = Array.from({ length: times }, () => fmt(by));
  return solution(
    'REPEATED_ADDITION',
    times === 0
      ? [say('Zero groups make 0.', 'ZERO_PROPERTY')]
      : [say(`${fmt(a)} × ${fmt(b)} means ${times} group${times === 1 ? '' : 's'} of ${fmt(by)}: ${terms.join(' + ')}.`, 'GROUPS'), say(`That adds up to ${fmt(a * b)}.`, 'RESULT')],
    A.number(a * b),
    'Equal groups',
  );
}

function standardMultiplication(a: number, b: number): SolutionTree {
  const [top, bottom] = numDigits(a) >= numDigits(b) ? [a, b] : [b, a];
  const steps: SolutionStep[] = [];
  if (numDigits(bottom) === 1) {
    steps.push(say(`Multiply each digit by ${bottom}, from the ones.`, 'ALIGN'));
    let carry = 0;
    const len = numDigits(top);
    for (let p = 0; p < len; p++) {
      const d = digitAt(top, p);
      const prod = d * bottom + carry;
      const place = PLACE_NAMES[p] ?? `10^${p}`;
      const carryText = carry ? ` + ${carry} (carried)` : '';
      if (p === len - 1) steps.push(say(`${capitalize(place)}: ${d} × ${bottom}${carryText} = ${prod}. Write ${prod}.`, 'COLUMN'));
      else steps.push(say(`${capitalize(place)}: ${d} × ${bottom}${carryText} = ${prod}. Write ${prod % 10}${prod >= 10 ? `, carry ${Math.floor(prod / 10)}` : ''}.`, 'COLUMN'));
      carry = Math.floor(prod / 10);
    }
  } else {
    steps.push(say(`One row for each digit of ${fmt(bottom)}.`, 'ALIGN'));
    const rows: number[] = [];
    for (let p = 0; p < numDigits(bottom); p++) {
      const d = digitAt(bottom, p);
      const row = top * d * 10 ** p;
      rows.push(row);
      steps.push(say(`${fmt(top)} × ${d} ${PLACE_NAMES[p]}${p > 0 ? ` (${fmt(d * 10 ** p)})` : ''} = ${fmt(row)}.`, 'ROW', { row }));
    }
    steps.push(say(`Add the rows: ${rows.map(fmt).join(' + ')} = ${fmt(a * b)}.`, 'ADD_ROWS'));
  }
  steps.push(say(`So ${fmt(a)} × ${fmt(b)} = ${fmt(a * b)}.`, 'RESULT'));
  return solution('STANDARD_ALGORITHM', steps, A.number(a * b), 'Standard algorithm');
}

function areaModel(a: number, b: number): SolutionTree {
  const pa = expandedParts(a);
  const pb = expandedParts(b);
  const steps: SolutionStep[] = [say(`Split: ${fmt(a)} = ${pa.map(fmt).join(' + ')}, ${fmt(b)} = ${pb.map(fmt).join(' + ')}.`, 'EXPAND')];
  const products: number[] = [];
  for (const x of pa) {
    for (const y of pb) {
      products.push(x * y);
      steps.push(say(`${fmt(x)} × ${fmt(y)} = ${fmt(x * y)}.`, 'PARTIAL_PRODUCT'));
    }
  }
  steps.push(say(`Add them: ${products.map(fmt).join(' + ')} = ${fmt(a * b)}.`, 'RESULT'));
  return solution('AREA_MODEL', steps, A.number(a * b), 'Area model (partial products)');
}

function compensationMultiplication(a: number, b: number): SolutionTree | null {
  const near = (n: number) => n % 10 >= 8 && n >= 18;
  const target = near(a) ? a : near(b) ? b : null;
  if (target === null) return null;
  const other = target === a ? b : a;
  const up = Math.ceil(target / 10) * 10;
  const extra = up - target;
  return solution(
    'ROUND_AND_ADJUST',
    [
      say(`${fmt(target)} is close to ${fmt(up)}: ${fmt(up)} × ${fmt(other)} = ${fmt(up * other)}.`, 'ROUND'),
      say(`That is ${extra} group${extra === 1 ? '' : 's'} of ${fmt(other)} too many: ${extra} × ${fmt(other)} = ${fmt(extra * other)}.`, 'EXTRA'),
      say(`${fmt(up * other)} − ${fmt(extra * other)} = ${fmt(a * b)}.`, 'RESULT'),
    ],
    A.number(a * b),
    'Round and adjust',
  );
}

function signedMultiplication(a: number, b: number, symbol: '×' | '÷', result: number): SolutionTree[] {
  const negatives = (a < 0 ? 1 : 0) + (b < 0 ? 1 : 0);
  const magA = Math.abs(a);
  const magB = Math.abs(b);
  const mag = Math.abs(result);
  return [
    solution(
      'SIGN_RULES',
      [
        say(`Work with the sizes first: ${fmt(magA)} ${symbol} ${fmt(magB)} = ${fmt(mag)}.`, 'MAGNITUDE'),
        say(negatives === 1 ? 'One number is negative, so the answer is negative.' : 'The signs are the same, so the answer is positive.', 'SIGN'),
        say(`Answer: ${fmt(result)}.`, 'RESULT'),
      ],
      A.number(result),
      'Sign rules',
    ),
    solution(
      'COUNT_NEGATIVES',
      [say(`Count the negative signs: ${negatives}. ${negatives % 2 === 1 ? 'An odd number of negatives gives a negative result.' : 'An even number of negatives gives a positive result.'}`, 'COUNT'), say(`${fmt(magA)} ${symbol} ${fmt(magB)} = ${fmt(mag)}, so the answer is ${fmt(result)}.`, 'RESULT')],
      A.number(result),
      'Count the negatives',
    ),
  ];
}

/** a × b. */
export function multiplicationStrategies(a: number, b: number): SolutionTree[] {
  assertWhole(a, b);
  if (a < 0 || b < 0) return signedMultiplication(a, b, '×', a * b);
  if (a === 0 || b === 0) {
    return [
      solution('ZERO_PROPERTY', [say('Any number times 0 is 0.', 'ZERO_PROPERTY')], A.number(0), 'Zero property'),
      repeatedAddition(a, b),
    ];
  }
  if (a <= 12 && b <= 12) {
    const trees = [skipCount(a, b)];
    if (Math.max(a, b) >= 3) trees.push(distributiveFact(a, b));
    const dbl = doubling(a, b);
    if (dbl) trees.push(dbl);
    if (trees.length < 2) trees.push(repeatedAddition(a, b));
    return trees;
  }
  const trees = [standardMultiplication(a, b), areaModel(a, b)];
  const comp = compensationMultiplication(a, b);
  if (comp) trees.push(comp);
  return trees;
}

/* ================================================================== */
/* Division                                                            */
/* ================================================================== */

function longDivision(dividend: number, divisor: number): SolutionTree {
  const q = Math.floor(dividend / divisor);
  const r = dividend % divisor;
  const digits = dividend.toString().split('').map(Number);
  const steps: SolutionStep[] = [say(`Divide by ${divisor}, one digit at a time.`, 'SETUP')];
  let current = 0;
  let started = false;
  for (let i = 0; i < digits.length; i++) {
    current = current * 10 + (digits[i] as number);
    if (!started && current < divisor && i < digits.length - 1) continue;
    started = true;
    const qd = Math.floor(current / divisor);
    const product = qd * divisor;
    steps.push(say(`${divisor} goes into ${fmt(current)} ${qd} time${qd === 1 ? '' : 's'}: ${qd} × ${divisor} = ${fmt(product)}, and ${fmt(current)} − ${fmt(product)} = ${fmt(current - product)}.${i < digits.length - 1 ? ` Bring down the ${digits[i + 1]}.` : ''}`, 'DIVIDE_STEP'));
    current -= product;
  }
  steps.push(say(r === 0 ? `So ${fmt(dividend)} ÷ ${divisor} = ${fmt(q)}.` : `So ${fmt(dividend)} ÷ ${divisor} = ${fmt(q)} remainder ${r}.`, 'RESULT'));
  return solution('LONG_DIVISION', steps, r === 0 ? A.number(q) : A.qr(q, r), 'Long division');
}

function partialQuotients(dividend: number, divisor: number): SolutionTree {
  const q = Math.floor(dividend / divisor);
  const r = dividend % divisor;
  const steps: SolutionStep[] = [say(`Take away easy groups of ${divisor}.`, 'SETUP')];
  let remaining = dividend;
  const used: number[] = [];
  for (let guard = 0; guard < 12 && remaining >= divisor; guard++) {
    // Place-value chunks: the leading digit of how many groups still fit (e.g. 300, then 90, then 9).
    const fit = Math.floor(remaining / divisor);
    const power = 10 ** (fit.toString().length - 1);
    const m = Math.floor(fit / power) * power;
    remaining -= m * divisor;
    used.push(m);
    steps.push(say(`${m} × ${divisor} = ${fmt(m * divisor)}; ${fmt(remaining + m * divisor)} − ${fmt(m * divisor)} = ${fmt(remaining)} left.`, 'CHUNK', { multiple: m }));
  }
  steps.push(say(`Add the groups: ${used.map(fmt).join(' + ')} = ${fmt(q)}${r ? `, ${r} left over` : ''}.`, 'RESULT'));
  return solution('PARTIAL_QUOTIENTS', steps, r === 0 ? A.number(q) : A.qr(q, r), 'Partial quotients');
}

function thinkMultiplication(dividend: number, divisor: number): SolutionTree {
  const q = Math.floor(dividend / divisor);
  const r = dividend % divisor;
  return solution(
    'THINK_MULTIPLICATION',
    r === 0
      ? [say(`Ask: what times ${divisor} makes ${fmt(dividend)}?  ? × ${divisor} = ${fmt(dividend)}.`, 'FACT_FAMILY'), say(`${fmt(q)} × ${divisor} = ${fmt(dividend)}, so the answer is ${fmt(q)}.`, 'RESULT')]
      : [
          say(`Find the biggest multiple of ${divisor} that is not more than ${fmt(dividend)}: ${fmt(q)} × ${divisor} = ${fmt(q * divisor)}.`, 'FACT_FAMILY'),
          say(`${fmt(dividend)} − ${fmt(q * divisor)} = ${r} is left over, so the answer is ${fmt(q)} R ${r}.`, 'RESULT'),
        ],
    r === 0 ? A.number(q) : A.qr(q, r),
    'Think multiplication',
  );
}

function equalGroupsDivision(dividend: number, divisor: number): SolutionTree {
  const q = Math.floor(dividend / divisor);
  const r = dividend % divisor;
  const list = Array.from({ length: Math.min(q, 12) }, (_, i) => fmt(divisor * (i + 1)));
  return solution(
    'SKIP_COUNT_DIVIDE',
    [say(`Skip count by ${divisor} until you reach ${fmt(dividend)}${r ? ' (or get as close as you can)' : ''}: ${list.join(', ')}.`, 'SKIP_COUNT'), say(`You counted ${fmt(q)} jumps${r ? ` with ${r} left over` : ''}.`, 'RESULT')],
    r === 0 ? A.number(q) : A.qr(q, r),
    'Skip count',
  );
}

/** dividend ÷ divisor (divisor > 0). The result is an integer when exact, otherwise quotient + remainder. */
export function divisionStrategies(dividend: number, divisor: number): SolutionTree[] {
  assertWhole(dividend, divisor);
  if (divisor === 0) throw new Error('division by zero');
  if (dividend < 0 || divisor < 0) {
    if (dividend % divisor !== 0) throw new Error('signed division strategies need an exact quotient');
    return signedMultiplication(dividend, divisor, '÷', dividend / divisor);
  }
  const q = Math.floor(dividend / divisor);
  if (q <= 12 && divisor <= 12) {
    return [thinkMultiplication(dividend, divisor), equalGroupsDivision(dividend, divisor)];
  }
  return [longDivision(dividend, divisor), partialQuotients(dividend, divisor), thinkMultiplication(dividend, divisor)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
