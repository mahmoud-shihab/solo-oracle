import { sampleWithoutReplacement, shuffle, type Rng } from './random';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface PlayingCard {
  id: string;
  rank: string; // A, 2..10, J, Q, K, or "Joker"
  suit?: Suit;
  label: string; // "Q♥", "Red Joker"
  red: boolean;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_NAMES: Record<string, string> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

export function playingDeck(includeJokers: boolean): PlayingCard[] {
  const deck: PlayingCard[] = [];
  (Object.keys(SUIT_SYMBOL) as Suit[]).forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        id: `${rank}-${suit}`,
        rank,
        suit,
        label: `${rank}${SUIT_SYMBOL[suit]}`,
        red: suit === 'hearts' || suit === 'diamonds',
      });
    });
  });
  if (includeJokers) {
    deck.push({ id: 'joker-red', rank: 'Joker', label: 'Red Joker', red: true });
    deck.push({ id: 'joker-black', rank: 'Joker', label: 'Black Joker', red: false });
  }
  return deck;
}

export function playingCardName(c: PlayingCard): string {
  if (!c.suit) return c.label;
  const r = RANK_NAMES[c.rank] ?? c.rank;
  return `${r} of ${c.suit[0].toUpperCase()}${c.suit.slice(1)}`;
}

/* ------------------------------------------------------------------ */
/* Tarot: Rider–Waite–Smith order, 22 Major + 56 Minor Arcana = 78.    */
/* Keywords are short, commonly used meanings to prompt interpretation. */
/* ------------------------------------------------------------------ */

export interface TarotCard {
  id: string;
  name: string;
  arcana: 'major' | 'minor';
  number?: number; // majors 0–21
  suit?: 'Wands' | 'Cups' | 'Swords' | 'Pentacles';
  upright: string;
  reversed: string;
}

const MAJORS: [string, string, string][] = [
  ['The Fool', 'beginnings, spontaneity, a leap of faith', 'recklessness, hesitation, folly'],
  ['The Magician', 'willpower, skill, resourcefulness', 'manipulation, untapped talent, trickery'],
  ['The High Priestess', 'intuition, secrets, the unseen', 'hidden agendas, ignored instincts, silence'],
  ['The Empress', 'abundance, nurturing, growth', 'dependence, smothering, stagnation'],
  ['The Emperor', 'authority, order, protection', 'tyranny, rigidity, loss of control'],
  ['The Hierophant', 'tradition, institutions, guidance', 'rebellion, unorthodoxy, dogma'],
  ['The Lovers', 'union, choice, alignment of values', 'discord, imbalance, a hard choice'],
  ['The Chariot', 'drive, victory, determination', 'lack of direction, obstacles, aggression'],
  ['Strength', 'courage, patience, inner strength', 'self-doubt, weakness, raw emotion'],
  ['The Hermit', 'solitude, reflection, seeking truth', 'isolation, withdrawal, loneliness'],
  ['Wheel of Fortune', 'fate, change, a turning point', 'bad luck, resisting change, cycles repeat'],
  ['Justice', 'fairness, truth, consequences', 'injustice, dishonesty, avoidance'],
  ['The Hanged Man', 'surrender, new perspective, pause', 'stalling, needless sacrifice, indecision'],
  ['Death', 'endings, transformation, transition', 'resisting change, decay, lingering'],
  ['Temperance', 'balance, moderation, patience', 'excess, imbalance, haste'],
  ['The Devil', 'temptation, bondage, materialism', 'release, breaking free, reclaiming power'],
  ['The Tower', 'upheaval, sudden revelation, collapse', 'averted disaster, fear of change, delay'],
  ['The Star', 'hope, renewal, inspiration', 'despair, lost faith, disconnection'],
  ['The Moon', 'illusion, fear, the subconscious', 'clarity returns, confusion lifts, secrets out'],
  ['The Sun', 'joy, success, vitality', 'temporary gloom, overconfidence, delay'],
  ['Judgement', 'reckoning, rebirth, a calling', 'self-doubt, refusing the call, harsh judgment'],
  ['The World', 'completion, fulfillment, wholeness', 'unfinished business, shortcuts, emptiness'],
];

const MINOR_RANKS = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King',
];

const MINORS: Record<NonNullable<TarotCard['suit']>, [string, string][]> = {
  Wands: [
    ['inspiration, a spark, new venture', 'delays, lack of motivation, false start'],
    ['planning, future vision, decisions', 'fear of the unknown, poor planning'],
    ['expansion, foresight, progress', 'setbacks, frustration, obstacles abroad'],
    ['celebration, homecoming, harmony', 'instability, cancelled plans, tension at home'],
    ['conflict, competition, rivalry', 'avoiding conflict, truce, inner strife'],
    ['victory, recognition, acclaim', 'fall from grace, ego, lack of recognition'],
    ['defiance, standing your ground', 'giving up, overwhelmed, backing down'],
    ['swift action, news, momentum', 'delays, frustration, slowing down'],
    ['resilience, persistence, last stand', 'exhaustion, paranoia, giving in'],
    ['burden, responsibility, hard work', 'dropping the load, delegation, collapse'],
    ['enthusiasm, curiosity, a messenger', 'impatience, bad news, scattered energy'],
    ['adventure, boldness, a charge forward', 'recklessness, haste, frustration'],
    ['confidence, warmth, determination', 'jealousy, selfishness, demanding'],
    ['leadership, vision, bold action', 'impulsiveness, overbearing, high expectations'],
  ],
  Cups: [
    ['new feelings, love, compassion', 'blocked emotions, emptiness, repression'],
    ['partnership, attraction, connection', 'imbalance, broken bond, distrust'],
    ['friendship, celebration, community', 'overindulgence, gossip, isolation'],
    ['apathy, contemplation, missed offer', 'new awareness, acceptance, seizing chance'],
    ['loss, grief, regret', 'acceptance, moving on, forgiveness'],
    ['nostalgia, innocence, the past', 'stuck in the past, naivety, leaving home'],
    ['choices, illusion, wishful thinking', 'clarity, focus, a decision made'],
    ['walking away, disillusion, seeking more', 'fear of leaving, aimless drifting'],
    ['contentment, a wish granted', 'dissatisfaction, smugness, greed'],
    ['harmony, family, happiness', 'broken home, misalignment, strife'],
    ['creative offer, intuition, a message', 'emotional immaturity, blocked creativity'],
    ['romance, charm, an offer', 'moodiness, unrealistic, jealousy'],
    ['compassion, calm, intuition', 'insecurity, codependence, martyrdom'],
    ['emotional balance, diplomacy', 'manipulation, moodiness, coldness'],
  ],
  Swords: [
    ['clarity, breakthrough, truth', 'confusion, chaos, misinformation'],
    ['stalemate, difficult choice', 'indecision, information overload, lies exposed'],
    ['heartbreak, sorrow, painful truth', 'recovery, forgiveness, releasing pain'],
    ['rest, recovery, contemplation', 'restlessness, burnout, stagnation'],
    ['conflict, defeat, winning at a cost', 'reconciliation, making amends, past resentment'],
    ['transition, moving on, leaving behind', 'unfinished business, resistance, baggage'],
    ['deception, stealth, getting away', 'confession, getting caught, conscience'],
    ['restriction, trapped, self-imposed limits', 'release, new perspective, freedom'],
    ['anxiety, nightmares, despair', 'hope, reaching out, fears fade'],
    ['ruin, betrayal, rock bottom', 'recovery, survival, the worst is over'],
    ['curiosity, vigilance, new ideas', 'gossip, haste, all talk'],
    ['ambition, fast action, aggression', 'scattered, reckless, no direction'],
    ['independence, clear judgment, honesty', 'bitterness, cruelty, coldness'],
    ['authority, intellect, truth', 'abuse of power, manipulation, tyranny'],
  ],
  Pentacles: [
    ['opportunity, prosperity, new venture', 'lost opportunity, poor planning'],
    ['balance, adaptability, juggling', 'overwhelm, disorganization, imbalance'],
    ['teamwork, craft, skill', 'disharmony, poor work, lack of teamwork'],
    ['security, control, hoarding', 'greed, letting go, generosity'],
    ['hardship, poverty, exclusion', 'recovery, help arrives, spiritual poverty'],
    ['generosity, charity, sharing', 'debt, strings attached, one-sided'],
    ['patience, long-term view, investment', 'impatience, poor returns, wasted effort'],
    ['diligence, mastery, apprenticeship', 'perfectionism, lack of focus, shortcuts'],
    ['independence, luxury, self-reliance', 'overwork, hollow success, dependence'],
    ['wealth, legacy, family', 'loss, family disputes, instability'],
    ['ambition, study, a new chance', 'procrastination, lack of progress'],
    ['hard work, reliability, routine', 'boredom, laziness, stagnation'],
    ['practicality, nurturing, comfort', 'smothering, work-life imbalance'],
    ['abundance, security, leadership', 'greed, stubbornness, materialism'],
  ],
};

export const TAROT_DECK: TarotCard[] = [
  ...MAJORS.map(([name, upright, reversed], n) => ({
    id: `major-${n}`,
    name,
    arcana: 'major' as const,
    number: n,
    upright,
    reversed,
  })),
  ...(Object.keys(MINORS) as NonNullable<TarotCard['suit']>[]).flatMap((suit) =>
    MINORS[suit].map(([upright, reversed], idx) => ({
      id: `${suit.toLowerCase()}-${idx + 1}`,
      name: `${MINOR_RANKS[idx]} of ${suit}`,
      arcana: 'minor' as const,
      suit,
      upright,
      reversed,
    })),
  ),
];

export const ROMAN = [
  '0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI',
];

export interface TarotDraw {
  card: TarotCard;
  reversed: boolean;
}

export function drawTarot(
  pool: readonly TarotCard[],
  count: number,
  rng: Rng,
  allowReversed: boolean,
): TarotDraw[] {
  return sampleWithoutReplacement(pool, count, rng).map((card) => ({
    card,
    reversed: allowReversed ? rng(2) === 1 : false,
  }));
}

/**
 * A persistent "shoe": shuffle once, then draw from the top until empty,
 * like a real deck sitting on the table.
 */
export function freshShoe<T>(deck: readonly T[], rng: Rng): T[] {
  return shuffle(deck, rng);
}
