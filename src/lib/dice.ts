/*
 * Dice notation parser and roller.
 *
 * Supported syntax (case-insensitive, spaces ignored):
 *   d20, 3d6, d%  (= d100), d7, 2d37   any number of sides (dCustom)
 *   +, -          combine dice groups and flat modifiers: 1d20+5, 2d6+1d4-1
 *   kh N / k N    keep the N highest dice   4d6kh3
 *   kl N          keep the N lowest dice    2d20kl1
 *   dh N / dl N   drop the N highest / lowest dice   4d6dl1
 *   adv / dis     advantage / disadvantage: roll the group twice, keep the
 *                 better / worse total. 1d20adv is the same as 2d20kh1.
 *   !             exploding dice: a die that rolls its max is rolled again
 *                 and added (capped so it can't loop forever)
 * N after kh/kl/dh/dl defaults to 1.
 */
import type { Rng } from './random';

export type KeepMode = 'kh' | 'kl' | 'dh' | 'dl';

export interface DiceTerm {
  kind: 'dice';
  sign: 1 | -1;
  count: number;
  sides: number;
  keep?: { mode: KeepMode; n: number };
  adv?: 'adv' | 'dis';
  explode?: boolean;
}

export interface ConstTerm {
  kind: 'const';
  sign: 1 | -1;
  value: number;
}

export type Term = DiceTerm | ConstTerm;

export interface DieRoll {
  value: number;
  kept: boolean;
  exploded?: boolean; // this die was rolled because the previous one exploded
}

export interface TermResult {
  term: Term;
  label: string; // normalized notation for this term, e.g. "4d6kh3"
  /** For adv/dis there are two attempts; otherwise one. */
  attempts: DieRoll[][];
  chosenAttempt: number;
  subtotal: number; // signed
}

export interface RollResult {
  formula: string;
  normalized: string;
  total: number;
  terms: TermResult[];
}

export const MAX_DICE = 1000;
export const MAX_SIDES = 1_000_000;
const MAX_EXPLOSIONS = 100;

export class DiceSyntaxError extends Error {}

export function parseFormula(input: string): Term[] {
  const s = input.toLowerCase().replace(/\s+/g, '');
  if (!s) throw new DiceSyntaxError('Enter a formula, like 2d6+1');
  let i = 0;
  const terms: Term[] = [];

  const peek = (str: string) => s.startsWith(str, i);
  const readInt = (): number | undefined => {
    const m = /^\d+/.exec(s.slice(i));
    if (!m) return undefined;
    i += m[0].length;
    return parseInt(m[0], 10);
  };

  let first = true;
  while (i < s.length) {
    let sign: 1 | -1 = 1;
    if (peek('+')) {
      i++;
    } else if (peek('-')) {
      sign = -1;
      i++;
    } else if (!first) {
      throw new DiceSyntaxError(`Unexpected "${s[i]}" at position ${i + 1}`);
    }
    first = false;

    const num = readInt();
    if (peek('d')) {
      i++;
      const count = num ?? 1;
      let sides: number | undefined;
      if (peek('%')) {
        i++;
        sides = 100;
      } else {
        sides = readInt();
      }
      if (sides === undefined) throw new DiceSyntaxError('Missing number of sides after "d"');
      if (count < 1) throw new DiceSyntaxError('Need at least 1 die');
      if (count > MAX_DICE) throw new DiceSyntaxError(`At most ${MAX_DICE} dice per group`);
      if (sides < 1) throw new DiceSyntaxError('A die needs at least 1 side');
      if (sides > MAX_SIDES) throw new DiceSyntaxError(`At most ${MAX_SIDES} sides`);
      const term: DiceTerm = { kind: 'dice', sign, count, sides };

      // modifiers, in any order
      for (;;) {
        if (peek('adv') || peek('dis')) {
          if (term.adv) throw new DiceSyntaxError('Only one adv/dis per dice group');
          term.adv = s.slice(i, i + 3) as 'adv' | 'dis';
          i += 3;
        } else if (peek('kh') || peek('kl') || peek('dh') || peek('dl') || peek('k')) {
          if (term.keep) throw new DiceSyntaxError('Only one keep/drop per dice group');
          let mode: KeepMode;
          if (peek('kh') || peek('kl') || peek('dh') || peek('dl')) {
            mode = s.slice(i, i + 2) as KeepMode;
            i += 2;
          } else {
            mode = 'kh';
            i += 1;
          }
          const n = readInt() ?? 1;
          if (mode === 'kh' || mode === 'kl') {
            if (n < 1 || n > count) throw new DiceSyntaxError(`Can't keep ${n} of ${count} dice`);
          } else if (n < 0 || n >= count) {
            throw new DiceSyntaxError(`Can't drop ${n} of ${count} dice`);
          }
          term.keep = { mode, n };
        } else if (peek('!')) {
          if (term.explode) throw new DiceSyntaxError('Only one "!" per dice group');
          if (sides < 2) throw new DiceSyntaxError('A d1 cannot explode');
          term.explode = true;
          i++;
        } else {
          break;
        }
      }
      terms.push(term);
    } else if (num !== undefined) {
      terms.push({ kind: 'const', sign, value: num });
    } else {
      throw new DiceSyntaxError(
        i < s.length ? `Unexpected "${s[i]}" at position ${i + 1}` : 'Formula ends unexpectedly',
      );
    }
  }
  if (terms.length === 0) throw new DiceSyntaxError('Enter a formula, like 2d6+1');
  return terms;
}

export function termLabel(t: Term): string {
  if (t.kind === 'const') return String(t.value);
  let out = `${t.count}d${t.sides}`;
  if (t.explode) out += '!';
  if (t.keep) out += `${t.keep.mode}${t.keep.n}`;
  if (t.adv) out += ` ${t.adv}`;
  return out;
}

export function normalize(terms: Term[]): string {
  return terms
    .map((t, idx) => {
      const lbl = termLabel(t);
      if (idx === 0) return t.sign < 0 ? `-${lbl}` : lbl;
      return `${t.sign < 0 ? ' - ' : ' + '}${lbl}`;
    })
    .join('');
}

function rollGroup(t: DiceTerm, rng: Rng): DieRoll[] {
  const dice: DieRoll[] = [];
  for (let k = 0; k < t.count; k++) {
    let v = rng(t.sides) + 1;
    dice.push({ value: v, kept: true });
    let boom = 0;
    while (t.explode && v === t.sides && boom < MAX_EXPLOSIONS) {
      v = rng(t.sides) + 1;
      dice.push({ value: v, kept: true, exploded: true });
      boom++;
    }
  }
  if (t.keep) {
    // Exploded extra dice stay attached to their originals for keep/drop:
    // group them into "chains" so 1d6! keeps its whole chain.
    const chains: { idx: number[]; sum: number }[] = [];
    dice.forEach((d, idx) => {
      if (!d.exploded) chains.push({ idx: [idx], sum: d.value });
      else {
        const c = chains[chains.length - 1];
        c.idx.push(idx);
        c.sum += d.value;
      }
    });
    const order = chains.map((c, ci) => ci).sort((a, b) => chains[a].sum - chains[b].sum || a - b);
    const { mode, n } = t.keep;
    let keepSet: number[];
    if (mode === 'kh') keepSet = order.slice(order.length - n);
    else if (mode === 'kl') keepSet = order.slice(0, n);
    else if (mode === 'dh') keepSet = order.slice(0, order.length - n);
    else keepSet = order.slice(n);
    const keepChains = new Set(keepSet);
    chains.forEach((c, ci) => {
      if (!keepChains.has(ci)) c.idx.forEach((di) => (dice[di].kept = false));
    });
  }
  return dice;
}

const sumKept = (dice: DieRoll[]) => dice.reduce((a, d) => a + (d.kept ? d.value : 0), 0);

export function rollTerms(terms: Term[], rng: Rng, formula = ''): RollResult {
  const results: TermResult[] = terms.map((t) => {
    if (t.kind === 'const') {
      return { term: t, label: termLabel(t), attempts: [], chosenAttempt: 0, subtotal: t.sign * t.value };
    }
    const attempts = [rollGroup(t, rng)];
    let chosen = 0;
    if (t.adv) {
      attempts.push(rollGroup(t, rng));
      const [a, b] = attempts.map(sumKept);
      // For a subtracted group, "advantage" still means the better outcome
      // for the roller, i.e. the smaller amount subtracted.
      const wantHigh = (t.adv === 'adv') === (t.sign > 0);
      chosen = wantHigh ? (b > a ? 1 : 0) : b < a ? 1 : 0;
    }
    return {
      term: t,
      label: termLabel(t),
      attempts,
      chosenAttempt: chosen,
      subtotal: t.sign * sumKept(attempts[chosen]),
    };
  });
  return {
    formula: formula || normalize(terms),
    normalized: normalize(terms),
    total: results.reduce((a, r) => a + r.subtotal, 0),
    terms: results,
  };
}

export function roll(formula: string, rng: Rng): RollResult {
  return rollTerms(parseFormula(formula), rng, formula.trim());
}

/** One-line text breakdown, e.g. "4d6dl1 [5, 3, ~1~, 6] + 2". */
export function describe(r: RollResult): string {
  return r.terms
    .map((tr, idx) => {
      const sign = tr.term.sign < 0 ? '-' : '+';
      const prefix = idx === 0 ? (sign === '-' ? '-' : '') : ` ${sign} `;
      if (tr.term.kind === 'const') return prefix + tr.label;
      const fmt = (dice: DieRoll[]) =>
        '[' + dice.map((d) => (d.kept ? String(d.value) : `~${d.value}~`) + (d.exploded ? '!' : '')).join(', ') + ']';
      const body =
        tr.attempts.length > 1
          ? tr.attempts.map((a, ai) => (ai === tr.chosenAttempt ? fmt(a) : `~${fmt(a)}~`)).join(' vs ')
          : fmt(tr.attempts[0]);
      return `${prefix}${tr.label} ${body}`;
    })
    .join('');
}
