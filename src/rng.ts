import { getRandomValues } from 'expo-crypto';
import { makeRng } from './lib/random';

/** Cryptographically secure, unbiased RNG used everywhere in the app. */
export const rng = makeRng((arr) => {
  getRandomValues(arr);
});
