/** Returns a uniformly random integer in [0, n). */
export type Rng = (n: number) => number;

/**
 * Builds an unbiased integer RNG on top of a crypto-quality source that
 * fills a Uint32Array (expo-crypto on device, Web Crypto in tests).
 * Uses rejection sampling so large dice (d1000 etc.) have no modulo bias.
 */
export function makeRng(fill: (arr: Uint32Array) => void): Rng {
  const buf = new Uint32Array(1);
  const RANGE = 0x100000000; // 2^32
  return (n: number) => {
    if (!Number.isInteger(n) || n <= 0) throw new Error(`Bad range: ${n}`);
    if (n === 1) return 0;
    const limit = RANGE - (RANGE % n);
    for (;;) {
      fill(buf);
      const v = buf[0];
      if (v < limit) return v % n;
    }
  };
}

/** Picks `count` distinct items (no repeats), in random order. */
export function sampleWithoutReplacement<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const arr = items.slice();
  const k = Math.min(count, arr.length);
  for (let i = 0; i < k; i++) {
    const j = i + rng(arr.length - i);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.slice(0, k);
}

/** Picks `count` items where the same item may come up more than once. */
export function sampleWithReplacement<T>(items: readonly T[], count: number, rng: Rng): T[] {
  if (items.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(items[rng(items.length)]);
  return out;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  return sampleWithoutReplacement(items, items.length, rng);
}
