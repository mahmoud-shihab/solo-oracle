import { useCallback } from 'react';
import { sampleWithoutReplacement, shuffle } from './lib/random';
import { rng } from './rng';
import { usePersistentState } from './storage';

/**
 * Two ways to draw:
 *  - "fresh": every draw shuffles the full deck, so cards never repeat
 *    within one draw but can come up again next time.
 *  - "shoe": one shuffled deck sits on the table; drawn cards are gone
 *    until you reshuffle. Saved on the device between launches.
 */
export function useShoe<T extends { id: string }>(key: string, deck: T[], persistent: boolean) {
  const deckKey = deck.map((c) => c.id).join('|');
  const [shoe, setShoe] = usePersistentState<{ deckKey: string; remaining: string[] } | null>(
    `${key}.shoe`,
    null,
  );
  const byId = new Map(deck.map((c) => [c.id, c]));
  // If the deck definition changed (e.g. jokers toggled), the old shoe is stale.
  const live = shoe && shoe.deckKey === deckKey ? shoe : null;
  const remaining = live ? live.remaining.length : deck.length;

  const reshuffle = useCallback(() => {
    setShoe({ deckKey, remaining: shuffle(deck, rng).map((c) => c.id) });
  }, [deckKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = (count: number): T[] => {
    if (!persistent) return sampleWithoutReplacement(deck, count, rng);
    const ids = live ? live.remaining : shuffle(deck, rng).map((c) => c.id);
    const taken = ids.slice(0, count);
    setShoe({ deckKey, remaining: ids.slice(count) });
    return taken.map((id) => byId.get(id)!).filter(Boolean);
  };

  return { draw, reshuffle, remaining, total: deck.length };
}
