import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, Panel, SectionTitle, Stepper, ui, ScreenHeader } from '../components/ui';
import { DiceSyntaxError, parseFormula, roll, type DieRoll, type RollResult } from '../lib/dice';
import { addDie, addModifier, toggleAdv, toggleExplode, toggleKeep } from '../lib/diceEdit';
import { rng } from '../rng';
import { usePersistentState } from '../storage';
import { colors, radius } from '../theme';

interface SavedFormula {
  id: string;
  name: string;
  formula: string;
}

interface HistoryEntry {
  id: string;
  name?: string;
  result: RollResult;
}

const STANDARD_DICE = [2, 4, 6, 8, 10, 12, 20, 100];

const DEFAULT_SAVED: SavedFormula[] = [
  { id: 'seed-1', name: 'Advantage', formula: '1d20 adv' },
  { id: 'seed-2', name: 'Ability score', formula: '4d6kh3' },
  { id: 'seed-3', name: 'Percentile', formula: '1d100' },
];

const newId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

export default function DiceScreen() {
  const [formula, setFormula] = usePersistentState('dice.formula', '');
  const [saved, setSaved] = usePersistentState<SavedFormula[]>('dice.saved', DEFAULT_SAVED);
  const [history, setHistory] = usePersistentState<HistoryEntry[]>('dice.history', []);
  const [clearedId, setClearedId] = usePersistentState<string | null>('dice.clearedId', null);
  const [customSides, setCustomSides] = useState('');
  const [keepN, setKeepN] = useState(1);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formulaError = useMemo(() => {
    if (!formula.trim()) return null;
    try {
      parseFormula(formula);
      return null;
    } catch (e) {
      return e instanceof DiceSyntaxError ? e.message : 'Invalid formula';
    }
  }, [formula]);

  const doRoll = (f: string, name?: string) => {
    try {
      const result = roll(f, rng);
      setError(null);
      setHistory((h) => [{ id: newId(), name, result }, ...h].slice(0, 50));
    } catch (e) {
      setError(e instanceof DiceSyntaxError ? e.message : 'Invalid formula');
    }
  };

  const addCustom = () => {
    const n = parseInt(customSides, 10);
    if (!Number.isFinite(n) || n < 1) {
      setError('Custom die needs a whole number of sides, like 7');
      return;
    }
    setFormula((f) => addDie(f, n));
    setError(null);
  };

  const save = () => {
    if (formulaError || !formula.trim()) return;
    const name = saveName.trim() || formula.trim();
    setSaved((s) => [...s, { id: newId(), name, formula: formula.trim() }]);
    setSaveName('');
    setShowSave(false);
  };

  const latest = history[0] && history[0].id !== clearedId ? history[0] : undefined;
  const past = latest ? history.slice(1) : history;
  const clearScreen = latest ? () => setClearedId(latest.id) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Dice" onClear={clearScreen} />

      <Panel>
        <TextInput
          value={formula}
          onChangeText={setFormula}
          placeholder="e.g. 2d6+3, 1d20 adv, 4d6kh3"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[ui.input, styles.formulaInput]}
          returnKeyType="go"
          onSubmitEditing={() => doRoll(formula)}
          accessibilityLabel="Dice formula"
        />
        {formulaError ? <Text style={styles.error}>{formulaError}</Text> : null}

        <View style={[ui.wrap, { marginTop: 12 }]}>
          {STANDARD_DICE.map((s) => (
            <Chip key={s} label={`d${s}`} onPress={() => setFormula((f) => addDie(f, s))} />
          ))}
        </View>

        <View style={styles.customRow}>
          <Text style={styles.dLabel}>d</Text>
          <TextInput
            value={customSides}
            onChangeText={(t) => setCustomSides(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="sides"
            placeholderTextColor={colors.muted}
            style={[ui.input, styles.customInput]}
            accessibilityLabel="Custom die sides"
          />
          <Button label="Add custom die" kind="secondary" compact onPress={addCustom} />
        </View>

        <SectionTitle>Modifiers</SectionTitle>
        <View style={ui.wrap}>
          <Chip label="Adv" active={/\badv\b/.test(formula)} onPress={() => setFormula((f) => toggleAdv(f, 'adv'))} />
          <Chip label="Dis" active={/\bdis\b/.test(formula)} onPress={() => setFormula((f) => toggleAdv(f, 'dis'))} />
          <Chip label="Exploding !" onPress={() => setFormula((f) => toggleExplode(f))} />
          <Chip label="−1" onPress={() => setFormula((f) => addModifier(f, -1))} />
          <Chip label="+1" onPress={() => setFormula((f) => addModifier(f, 1))} />
        </View>
        <Stepper label="Keep / drop how many" value={keepN} onChange={setKeepN} min={1} max={50} />
        <View style={ui.wrap}>
          <Chip label={`Keep high ${keepN}`} onPress={() => setFormula((f) => toggleKeep(f, 'kh', keepN))} />
          <Chip label={`Keep low ${keepN}`} onPress={() => setFormula((f) => toggleKeep(f, 'kl', keepN))} />
          <Chip label={`Drop low ${keepN}`} onPress={() => setFormula((f) => toggleKeep(f, 'dl', keepN))} />
          <Chip label={`Drop high ${keepN}`} onPress={() => setFormula((f) => toggleKeep(f, 'dh', keepN))} />
        </View>

        <View style={styles.actions}>
          <Button label="Clear" kind="ghost" onPress={() => setFormula('')} />
          <Button label="Save…" kind="secondary" disabled={!!formulaError || !formula.trim()} onPress={() => setShowSave((v) => !v)} />
          <Button label="Roll" style={{ flex: 1 }} disabled={!!formulaError || !formula.trim()} onPress={() => doRoll(formula)} />
        </View>

        {showSave ? (
          <View style={styles.saveRow}>
            <TextInput
              value={saveName}
              onChangeText={setSaveName}
              placeholder="Name (e.g. Sneak attack)"
              placeholderTextColor={colors.muted}
              style={[ui.input, { flex: 1, fontSize: 16 }]}
              autoFocus
              onSubmitEditing={save}
              accessibilityLabel="Saved formula name"
            />
            <Button label="Save" compact onPress={save} />
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Panel>

      {latest ? (
        <Panel style={styles.resultPanel}>
          {latest.name ? <Text style={styles.resultName}>{latest.name}</Text> : null}
          <Text style={styles.total} accessibilityLabel={`Total ${latest.result.total}`}>
            {latest.result.total}
          </Text>
          <Text style={styles.resultFormula}>{latest.result.normalized}</Text>
          <Breakdown result={latest.result} />
        </Panel>
      ) : null}

      <Panel>
        <SectionTitle>Saved formulas</SectionTitle>
        {saved.length === 0 ? <Text style={ui.muted}>Nothing saved yet. Build a formula and tap Save.</Text> : null}
        {saved.map((s) => (
          <View key={s.id} style={styles.savedRow}>
            <Pressable
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.6 : 1 }]}
              onPress={() => doRoll(s.formula, s.name)}
              onLongPress={() => setFormula(s.formula)}
              accessibilityLabel={`Roll ${s.name}`}
              accessibilityHint="Long press to edit the formula"
            >
              <Text style={styles.savedName}>{s.name}</Text>
              <Text style={ui.muted}>{s.formula}</Text>
            </Pressable>
            <Button label="Roll" compact onPress={() => doRoll(s.formula, s.name)} />
            <Button
              label="✕"
              kind="danger"
              compact
              onPress={() => setSaved((all) => all.filter((x) => x.id !== s.id))}
            />
          </View>
        ))}
        <Text style={[ui.muted, { marginTop: 8, fontSize: 12 }]}>Tap to roll. Long-press to load into the editor.</Text>
      </Panel>

      {past.length > 0 ? (
        <Panel>
          <SectionTitle right={<Button label="Clear" kind="ghost" compact onPress={() => setHistory([])} />}>
            History
          </SectionTitle>
          {past.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <Text style={styles.historyTotal}>{h.result.total}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text }}>{h.name ? `${h.name} · ` : ''}{h.result.normalized}</Text>
                <Breakdown result={h.result} small />
              </View>
            </View>
          ))}
        </Panel>
      ) : null}
    </ScrollView>
  );
}

function Dice({ dice, faded }: { dice: DieRoll[]; faded?: boolean }) {
  return (
    <>
      {'['}
      {dice.map((d, i) => (
        <Text
          key={i}
          style={[
            !d.kept || faded ? styles.dropped : null,
            d.exploded ? { color: colors.gold } : null,
          ]}
        >
          {d.value}
          {d.exploded ? '!' : ''}
          {i < dice.length - 1 ? ', ' : ''}
        </Text>
      ))}
      {']'}
    </>
  );
}

function Breakdown({ result, small }: { result: RollResult; small?: boolean }) {
  return (
    <Text style={[styles.breakdown, small && { fontSize: 13, textAlign: 'left' }]}>
      {result.terms.map((tr, idx) => {
        const sign = tr.term.sign < 0 ? '−' : '+';
        const prefix = idx === 0 ? (tr.term.sign < 0 ? '−' : '') : ` ${sign} `;
        if (tr.term.kind === 'const') return <Text key={idx}>{prefix}{tr.label}</Text>;
        return (
          <Text key={idx}>
            {prefix}
            {tr.attempts.map((a, ai) => (
              <Text key={ai}>
                {ai > 0 ? ' vs ' : ''}
                <Dice dice={a} faded={tr.attempts.length > 1 && ai !== tr.chosenAttempt} />
              </Text>
            ))}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  formulaInput: { fontSize: 22, fontWeight: '600' },
  error: { color: colors.red, marginTop: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  dLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  customInput: { width: 90, paddingVertical: 8, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  saveRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  resultPanel: { alignItems: 'center', borderWidth: 1, borderColor: colors.accent },
  resultName: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  total: { color: colors.text, fontSize: 72, fontWeight: '800', lineHeight: 80 },
  resultFormula: { color: colors.muted, fontSize: 15, marginBottom: 6 },
  breakdown: { color: colors.text, fontSize: 16, textAlign: 'center' },
  dropped: { color: colors.muted, textDecorationLine: 'line-through' },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  savedName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyTotal: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'right',
    borderRadius: radius,
  },
});
