/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { makeRng, sampleWithoutReplacement, sampleWithReplacement, type Rng } from '../src/lib/random';
import { parseFormula, roll, rollTerms, describe, DiceSyntaxError, normalize } from '../src/lib/dice';
import { playingDeck, TAROT_DECK, drawTarot } from '../src/lib/cards';

const rng = makeRng((a) => webcrypto.getRandomValues(a));
/** Scripted rng: returns values from the list (0-based die faces). */
const scripted = (vals: number[]): Rng => {
  let i = 0;
  return (n) => {
    const v = vals[i++];
    assert.ok(v < n, `scripted value ${v} out of range ${n}`);
    return v;
  };
};

test('rng is in range and roughly uniform', () => {
  const counts = new Array(6).fill(0);
  for (let i = 0; i < 60000; i++) counts[rng(6)]++;
  for (const c of counts) assert.ok(c > 9000 && c < 11000, `count ${c}`);
});

test('parses all standard and custom dice', () => {
  for (const s of [2, 4, 6, 8, 10, 12, 20, 100, 7, 37]) {
    const t = parseFormula(`d${s}`)[0];
    assert.equal(t.kind, 'dice');
    if (t.kind === 'dice') assert.equal(t.sides, s);
  }
  const p = parseFormula('d%')[0];
  assert.ok(p.kind === 'dice' && p.sides === 100);
});

test('totals with modifiers', () => {
  const r = rollTerms(parseFormula('2d6 + 1d4 - 3'), scripted([5, 0, 2]));
  assert.equal(r.total, 6 + 1 + 3 - 3);
});

test('keep highest / lowest / drop', () => {
  // 4d6kh3: faces 6,1,4,3 -> keep 6,4,3 = 13
  assert.equal(rollTerms(parseFormula('4d6kh3'), scripted([5, 0, 3, 2])).total, 13);
  assert.equal(rollTerms(parseFormula('4d6k3'), scripted([5, 0, 3, 2])).total, 13);
  assert.equal(rollTerms(parseFormula('4d6dl1'), scripted([5, 0, 3, 2])).total, 13);
  assert.equal(rollTerms(parseFormula('4d6kl2'), scripted([5, 0, 3, 2])).total, 1 + 3);
  assert.equal(rollTerms(parseFormula('4d6dh1'), scripted([5, 0, 3, 2])).total, 1 + 4 + 3);
});

test('advantage and disadvantage', () => {
  assert.equal(rollTerms(parseFormula('d20adv+2'), scripted([4, 16])).total, 19);
  assert.equal(rollTerms(parseFormula('d20 dis + 2'), scripted([4, 16])).total, 7);
  assert.equal(rollTerms(parseFormula('2d20kh1'), scripted([4, 16])).total, 17);
});

test('exploding dice', () => {
  // d6!: 6, 6, 2 -> 14
  assert.equal(rollTerms(parseFormula('1d6!'), scripted([5, 5, 1])).total, 14);
  // 2d6!kh1: chain [6,3]=9 vs [5]=5 -> 9
  assert.equal(rollTerms(parseFormula('2d6!kh1'), scripted([5, 2, 4])).total, 9);
});

test('describe shows dropped dice', () => {
  const r = rollTerms(parseFormula('4d6dl1+2'), scripted([5, 0, 3, 2]));
  assert.equal(describe(r), '4d6dl1 [6, ~1~, 4, 3] + 2');
  assert.equal(normalize(parseFormula('D20ADV+5')), '1d20 adv + 5');
});

test('rejects bad formulas', () => {
  for (const bad of ['', 'd', '2d', 'abc', '3d6kh4', '2d6dl2', 'd20++1', '1001d6', 'd1!', '2d6kh1kl1']) {
    assert.throws(() => parseFormula(bad), DiceSyntaxError, bad);
  }
});

test('random rolls stay in bounds', () => {
  for (let i = 0; i < 2000; i++) {
    const v = roll('3d6+2', rng).total;
    assert.ok(v >= 5 && v <= 20);
    const p = roll('d%', rng).total;
    assert.ok(p >= 1 && p <= 100);
  }
});

test('decks have the right cards', () => {
  assert.equal(playingDeck(false).length, 52);
  assert.equal(playingDeck(true).length, 54);
  assert.equal(new Set(playingDeck(true).map((c) => c.id)).size, 54);
  assert.equal(TAROT_DECK.length, 78);
  assert.equal(TAROT_DECK.filter((c) => c.arcana === 'major').length, 22);
  assert.equal(new Set(TAROT_DECK.map((c) => c.name)).size, 78);
});

test('draws without replacement are unique', () => {
  const d = sampleWithoutReplacement(playingDeck(false), 52, rng);
  assert.equal(new Set(d.map((c) => c.id)).size, 52);
  assert.equal(sampleWithoutReplacement([1, 2, 3], 10, rng).length, 3);
  assert.equal(sampleWithReplacement([1, 2, 3], 10, rng).length, 10);
});

test('tarot reversals', () => {
  const all = drawTarot(TAROT_DECK, 78, rng, true);
  const rev = all.filter((d) => d.reversed).length;
  assert.ok(rev > 15 && rev < 63);
  assert.ok(drawTarot(TAROT_DECK, 78, rng, false).every((d) => !d.reversed));
});

import { addDie, toggleAdv, toggleKeep, addModifier, toggleExplode } from '../src/lib/diceEdit';
test('quick-button formula editing', () => {
  assert.equal(addDie('', 6), '1d6');
  assert.equal(addDie('1d6', 6), '2d6');
  assert.equal(addDie('2d6', 8), '2d6 + 1d8');
  assert.equal(toggleAdv('', 'adv'), '1d20 adv');
  assert.equal(toggleAdv('1d20 adv', 'adv'), '1d20');
  assert.equal(toggleAdv('1d20 adv', 'dis'), '1d20 dis');
  assert.equal(toggleKeep('1d20', 'kh', 1), '2d20kh1');
  assert.equal(toggleKeep('4d6', 'kh', 3), '4d6kh3');
  assert.equal(toggleKeep('4d6kh3', 'kh', 3), '4d6');
  assert.equal(addModifier('1d20', 1), '1d20 + 1');
  assert.equal(addModifier('1d20 + 1', -1), '1d20');
  assert.equal(addModifier('1d20 + 1', -3), '1d20 - 2');
  assert.equal(toggleExplode('3d6'), '3d6!');
  for (const f of ['2d6 + 1d8', '1d20 adv', '2d20kh1', '1d20 - 2', '3d6!kh2 dis + 4']) {
    assert.equal(normalize(parseFormula(f)), f, 'round trip ' + f);
  }
});
