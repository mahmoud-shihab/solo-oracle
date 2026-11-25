import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Panel, SectionTitle, Stepper, Toggle, ui, ScreenHeader } from '../components/ui';
import { ROMAN, TAROT_DECK, type TarotCard } from '../lib/cards';
import { rng } from '../rng';
import { usePersistentState } from '../storage';
import { useShoe } from '../useShoe';
import { colors, radius } from '../theme';

interface TarotDrawStored {
  cardId: string;
  reversed: boolean;
}
interface Spread {
  id: string;
  draws: TarotDrawStored[];
}

const byId = new Map(TAROT_DECK.map((c) => [c.id, c]));
const SUIT_GLYPH: Record<string, string> = { Wands: '🪄', Cups: '🏆', Swords: '⚔️', Pentacles: '🪙' };

export default function TarotScreen() {
  const [count, setCount] = usePersistentState('tarot.count', 1);
  const [reversals, setReversals] = usePersistentState('tarot.reversals', true);
  const [majorsOnly, setMajorsOnly] = usePersistentState('tarot.majorsOnly', false);
  const [persistent, setPersistent] = usePersistentState('tarot.persistent', false);
  const [history, setHistory] = usePersistentState<Spread[]>('tarot.history', []);
  const [clearedId, setClearedId] = usePersistentState<string | null>('tarot.clearedId', null);

  const deck = useMemo(() => (majorsOnly ? TAROT_DECK.filter((c) => c.arcana === 'major') : TAROT_DECK), [majorsOnly]);
  const shoe = useShoe('tarot', deck, persistent);
  const max = persistent ? Math.max(1, shoe.remaining) : deck.length;
  const n = Math.min(count, max);
  const empty = persistent && shoe.remaining === 0;

  const draw = () => {
    const cards = shoe.draw(n);
    if (!cards.length) return;
    const draws = cards.map((c) => ({ cardId: c.id, reversed: reversals ? rng(2) === 1 : false }));
    setHistory((h) => [{ id: `${Date.now()}`, draws }, ...h].slice(0, 30));
  };

  const latest = history[0] && history[0].id !== clearedId ? history[0] : undefined;
  const past = latest ? history.slice(1) : history;
  const clearScreen = latest ? () => setClearedId(latest.id) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader title="Tarot" onClear={clearScreen} />
      <Panel>
        <Stepper label="Cards to draw" value={n} onChange={setCount} min={1} max={max} />
        <Toggle label="Reversed cards" hint="Each card has a 50% chance to come up reversed" value={reversals} onChange={setReversals} />
        <Toggle label="Major Arcana only" hint={`${majorsOnly ? 22 : 78}-card deck`} value={majorsOnly} onChange={setMajorsOnly} />
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
          <SectionTitle>Spread</SectionTitle>
          {latest.draws.map((d, i) => {
            const card = byId.get(d.cardId);
            return card ? <TarotTile key={`${d.cardId}-${i}`} index={i + 1} card={card} reversed={d.reversed} /> : null;
          })}
        </Panel>
      ) : null}

      {past.length > 0 ? (
        <Panel>
          <SectionTitle right={<Button label="Clear" kind="ghost" compact onPress={() => setHistory([])} />}>
            History
          </SectionTitle>
          {past.map((s) => (
            <Text key={s.id} style={styles.historyRow}>
              {s.draws
                .map((d) => `${byId.get(d.cardId)?.name ?? '?'}${d.reversed ? ' (R)' : ''}`)
                .join(' · ')}
            </Text>
          ))}
        </Panel>
      ) : null}
    </ScrollView>
  );
}

function TarotTile({ card, reversed, index }: { card: TarotCard; reversed: boolean; index: number }) {
  const glyph = card.arcana === 'major' ? ROMAN[card.number ?? 0] : SUIT_GLYPH[card.suit ?? ''];
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={`${index}. ${card.name}, ${reversed ? 'reversed' : 'upright'}: ${reversed ? card.reversed : card.upright}`}
    >
      <View style={[styles.miniCard, reversed && { transform: [{ rotate: '180deg' }] }]}>
        <Text style={styles.miniGlyph}>{glyph}</Text>
        <Text style={styles.miniArrow}>▲</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tileName}>
          {index}. {card.name}
        </Text>
        <Text style={[styles.orientation, { color: reversed ? colors.red : colors.green }]}>
          {reversed ? '▼ Reversed' : '▲ Upright'}
        </Text>
        <Text style={styles.meaning}>{reversed ? card.reversed : card.upright}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  tile: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  miniCard: {
    width: 56,
    height: 88,
    borderRadius: radius - 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  miniGlyph: { color: colors.gold, fontSize: 18, fontWeight: '700' },
  miniArrow: { color: colors.gold, fontSize: 12 },
  tileName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  orientation: { fontSize: 14, fontWeight: '700', marginVertical: 2 },
  meaning: { color: colors.muted, fontSize: 14 },
  historyRow: {
    color: colors.text,
    fontSize: 14,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
