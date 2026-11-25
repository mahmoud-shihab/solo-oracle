import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Panel, SectionTitle, Stepper, ui, ScreenHeader } from '../components/ui';
import { flipCoins, type CoinFlip } from '../lib/coin';
import { rng } from '../rng';
import { usePersistentState } from '../storage';
import { colors } from '../theme';

interface Entry extends CoinFlip {
  id: string;
}

export default function CoinScreen() {
  const [count, setCount] = usePersistentState('coin.count', 1);
  const [history, setHistory] = usePersistentState<Entry[]>('coin.history', []);
  const [clearedId, setClearedId] = usePersistentState<string | null>('coin.clearedId', null);

  const flip = () => setHistory((h) => [{ id: `${Date.now()}`, ...flipCoins(count, rng) }, ...h].slice(0, 50));
  const latest = history[0] && history[0].id !== clearedId ? history[0] : undefined;
  const past = latest ? history.slice(1) : history;
  const clearScreen = latest ? () => setClearedId(latest.id) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader title="Coin" onClear={clearScreen} />
      <Panel>
        <Stepper label="Coins to flip" value={count} onChange={setCount} min={1} max={100} />
        <Button label={count === 1 ? 'Flip' : `Flip ${count}`} onPress={flip} style={{ marginTop: 10 }} />
      </Panel>

      {latest ? (
        <Panel style={styles.resultPanel}>
          {latest.sides.length === 1 ? (
            <>
              <View style={[styles.coin, latest.sides[0] === 'T' && styles.coinTails]}>
                <Text style={styles.coinLetter}>{latest.sides[0]}</Text>
              </View>
              <Text style={styles.big} accessibilityLabel={latest.sides[0] === 'H' ? 'Heads' : 'Tails'}>
                {latest.sides[0] === 'H' ? 'Heads' : 'Tails'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.big}>
                {latest.heads} H · {latest.tails} T
              </Text>
              <View style={styles.row}>
                {latest.sides.map((s, i) => (
                  <View key={i} style={[styles.mini, s === 'T' && styles.coinTails]}>
                    <Text style={styles.miniLetter}>{s}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Panel>
      ) : null}

      {past.length > 0 ? (
        <Panel>
          <SectionTitle right={<Button label="Clear" kind="ghost" compact onPress={() => setHistory([])} />}>
            History
          </SectionTitle>
          {past.map((h) => (
            <Text key={h.id} style={styles.historyRow}>
              {h.sides.length === 1
                ? h.sides[0] === 'H' ? 'Heads' : 'Tails'
                : `${h.heads} H · ${h.tails} T   ${h.sides.join(' ')}`}
            </Text>
          ))}
        </Panel>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  resultPanel: { alignItems: 'center', borderWidth: 1, borderColor: colors.accent },
  coin: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#b8913f',
    marginVertical: 8,
  },
  coinTails: { backgroundColor: '#c9ccd6', borderColor: '#8d909c' },
  coinLetter: { fontSize: 52, fontWeight: '800', color: colors.cardInk },
  big: { color: colors.text, fontSize: 36, fontWeight: '800', marginVertical: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 },
  mini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLetter: { fontWeight: '800', color: colors.cardInk },
  historyRow: {
    color: colors.text,
    fontSize: 14,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
