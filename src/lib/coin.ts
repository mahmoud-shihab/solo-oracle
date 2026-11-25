import type { Rng } from './random';

export type Side = 'H' | 'T';

export interface CoinFlip {
  sides: Side[];
  heads: number;
  tails: number;
}

/** Flips `count` fair coins. */
export function flipCoins(count: number, rng: Rng): CoinFlip {
  const sides: Side[] = [];
  for (let i = 0; i < count; i++) sides.push(rng(2) === 0 ? 'H' : 'T');
  const heads = sides.filter((s) => s === 'H').length;
  return { sides, heads, tails: count - heads };
}
