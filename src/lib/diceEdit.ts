/*
 * Helpers behind the dice screen's quick buttons. Each one takes the current
 * formula text and returns new formula text, so typing and tapping mix freely.
 */
import { normalize, parseFormula, type DiceTerm, type KeepMode, type Term } from './dice';

function tryParse(formula: string): Term[] | null {
  if (!formula.trim()) return [];
  try {
    return parseFormula(formula);
  } catch {
    return null;
  }
}

function lastDice(terms: Term[]): DiceTerm | undefined {
  for (let i = terms.length - 1; i >= 0; i--) {
    const t = terms[i];
    if (t.kind === 'dice') return t;
  }
  return undefined;
}

export function addDie(formula: string, sides: number): string {
  const terms = tryParse(formula);
  if (!terms || terms.length === 0) return `1d${sides}`;
  const last = terms[terms.length - 1];
  if (last.kind === 'dice' && last.sides === sides && last.sign > 0 && !last.keep && !last.adv && !last.explode) {
    last.count += 1;
  } else {
    terms.push({ kind: 'dice', sign: 1, count: 1, sides });
  }
  return normalize(terms);
}

export function toggleAdv(formula: string, mode: 'adv' | 'dis'): string {
  const terms = tryParse(formula);
  if (!terms) return formula;
  if (terms.length === 0) return `1d20 ${mode}`;
  const d = lastDice(terms);
  if (!d) return formula;
  d.adv = d.adv === mode ? undefined : mode;
  return normalize(terms);
}

/** Keep/drop on the last dice group. Adds dice if there aren't enough to choose from. */
export function toggleKeep(formula: string, mode: KeepMode, n: number): string {
  const terms = tryParse(formula);
  if (!terms) return formula;
  if (terms.length === 0) terms.push({ kind: 'dice', sign: 1, count: n + 1, sides: 20 });
  const d = lastDice(terms);
  if (!d) return formula;
  if (d.keep && d.keep.mode === mode && d.keep.n === n) {
    d.keep = undefined;
  } else {
    if (d.count <= n) d.count = n + 1;
    d.keep = { mode, n };
  }
  return normalize(terms);
}

export function toggleExplode(formula: string): string {
  const terms = tryParse(formula);
  if (!terms) return formula;
  const d = lastDice(terms);
  if (!d || d.sides < 2) return formula;
  d.explode = !d.explode;
  return normalize(terms);
}

export function addModifier(formula: string, delta: number): string {
  const terms = tryParse(formula);
  if (!terms) return formula;
  const last = terms[terms.length - 1];
  if (last && last.kind === 'const' && terms.length > 1) {
    const v = last.sign * last.value + delta;
    if (v === 0) terms.pop();
    else {
      last.sign = v < 0 ? -1 : 1;
      last.value = Math.abs(v);
    }
  } else {
    terms.push({ kind: 'const', sign: delta < 0 ? -1 : 1, value: Math.abs(delta) });
  }
  return normalize(terms);
}
