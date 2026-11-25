import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Panel, SectionTitle, Stepper, Toggle, ui } from '../components/ui';
import { playingCardName, playingDeck, SUIT_SYMBOL, type PlayingCard } from '../lib/cards';
import { usePersistentState } from '../storage';
import { useShoe } from '../useShoe';
import { colors, radius } from '../theme';

interface Draw {
  id: string;
  cards: PlayingCard[];
}

export default function CardsScreen() {
  const [count, setCount] = usePersistentState('cards.count', 1);
  const [jokers, setJokers] = usePersistentState('cards.jokers', false);
  const [persistent, setPersistent] = usePersistentState('cards.persistent', false);
  const [history, setHistory] = usePersistentState<Draw[]>('cards.history', []);
  const deck = useMemo(() => playingDeck(jokers), [jokers]);
  const shoe = useShoe('cards', deck, persistent);

  const max = persistent ? Math.max(1, shoe.remaining) : deck.length;
  const n = Math.min(count, max);
  const empty = persistent && shoe.remaining === 0;

  const draw = () => {
    const cards = shoe.draw(n);
    if (cards.length) setHistory((h) => [{ id: `${Date.now()}`, cards }, ...h].slice(0, 30));
  };

  const latest = history[0];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={ui.screenTitle}>Playing cards</Text>
      <Panel>
        <Stepper label="Cards to draw" value={n} onChange={setCount} min={1} max={max} />
        <Toggle label="Include jokers" hint="54-card deck with a red and a black joker" value={jokers} onChange={setJokers} />
        <Toggle
          label="Keep drawing from one deck"
          hint={
            persistent
              ? `Drawn cards stay out until you reshuffle. ${shoe.remaining} of ${shoe.total} left.`
              : 'Off: every draw uses a freshly shuffled full deck.'
          }
          value={persistent}
          onChange={setPersistent}
        />
        <View style={styles.actions}>
          {persistent ? <Button label="Reshuffle" kind="secondary" onPress={shoe.reshuffle} /> : null}
          <Button label={empty ? 'Deck empty' : `Draw ${n}`} style={{ flex: 1 }} disabled={empty} onPress={draw} />
        </View>
      </Panel>

      {latest ? (
        <Panel>
          <SectionTitle>Drawn</SectionTitle>
          <View style={styles.hand}>
            {latest.cards.map((c, i) => (
              <CardFace key={`${c.id}-${i}`} card={c} />
            ))}
          </View>
        </Panel>
      ) : null}

      {history.length > 1 ? (
        <Panel>
          <SectionTitle right={<Button label="Clear" kind="ghost" compact onPress={() => setHistory([])} />}>
            History
          </SectionTitle>
          {history.slice(1).map((d) => (
            <Text key={d.id} style={styles.historyRow}>
              {d.cards.map((c, i) => (
                <Text key={i} style={{ color: c.red ? colors.red : colors.text }}>
                  {c.label}
                  {i < d.cards.length - 1 ? '  ' : ''}
                </Text>
              ))}
            </Text>
          ))}
        </Panel>
      ) : null}
    </ScrollView>
  );
}

function CardFace({ card }: { card: PlayingCard }) {
  const ink = card.red ? colors.cardRed : colors.cardInk;
  return (
    <View style={styles.card} accessible accessibilityLabel={playingCardName(card)}>
      {card.suit ? (
        <>
          <Text style={[styles.cardCorner, { color: ink }]}>
            {card.rank}
            {'\n'}
            {SUIT_SYMBOL[card.suit]}
          </Text>
          <Text style={[styles.cardPip, { color: ink }]}>{SUIT_SYMBOL[card.suit]}</Text>
          <Text style={[styles.cardName, { color: ink }]}>{playingCardName(card)}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.cardPip, { color: ink, fontSize: 40 }]}>🃏</Text>
          <Text style={[styles.cardName, { color: ink }]}>{card.label}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  hand: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  card: {
    width: 96,
    height: 136,
    backgroundColor: colors.cardFace,
    borderRadius: radius,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCorner: { alignSelf: 'flex-start', fontSize: 16, fontWeight: '800', lineHeight: 18, textAlign: 'center' },
  cardPip: { fontSize: 44 },
  cardName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  historyRow: {
    fontSize: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
