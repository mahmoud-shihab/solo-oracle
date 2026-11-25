import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, Panel, SectionTitle, Stepper, Toggle, ui, ScreenHeader } from '../components/ui';
import { sampleWithoutReplacement, sampleWithReplacement } from '../lib/random';
import { rng } from '../rng';
import { usePersistentState } from '../storage';
import { colors } from '../theme';

interface RandomList {
  id: string;
  name: string;
  entries: string[];
}

interface Pick {
  id: string;
  listName: string;
  items: string[];
}

const DEFAULT_LISTS: RandomList[] = [
  {
    id: 'seed-oracle',
    name: 'Yes / No oracle',
    entries: ['No, and…', 'No', 'No, but…', 'Yes, but…', 'Yes', 'Yes, and…'],
  },
  {
    id: 'seed-weather',
    name: 'Weather',
    entries: ['Clear skies', 'Overcast', 'Light rain', 'Thunderstorm', 'Thick fog', 'Strong wind', 'Snow'],
  },
];

const newId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
const toLines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

export default function ListsScreen() {
  const [lists, setLists] = usePersistentState<RandomList[]>('lists.all', DEFAULT_LISTS);
  const [selectedId, setSelectedId] = usePersistentState<string | null>('lists.selected', DEFAULT_LISTS[0].id);
  const [count, setCount] = usePersistentState('lists.count', 1);
  const [repeats, setRepeats] = usePersistentState('lists.repeats', false);
  const [history, setHistory] = usePersistentState<Pick[]>('lists.history', []);
  const [clearedId, setClearedId] = usePersistentState<string | null>('lists.clearedId', null);
  const [editing, setEditing] = useState<{ id: string | null; name: string; text: string } | null>(null);

  const selected = lists.find((l) => l.id === selectedId) ?? lists[0];
  const max = selected ? (repeats ? 100 : Math.max(1, selected.entries.length)) : 1;
  const n = Math.min(count, max);

  const pick = () => {
    if (!selected || selected.entries.length === 0) return;
    const items = repeats
      ? sampleWithReplacement(selected.entries, n, rng)
      : sampleWithoutReplacement(selected.entries, n, rng);
    setHistory((h) => [{ id: newId(), listName: selected.name, items }, ...h].slice(0, 50));
  };

  const startNew = () => setEditing({ id: null, name: '', text: '' });
  const startEdit = (l: RandomList) => setEditing({ id: l.id, name: l.name, text: l.entries.join('\n') });

  const saveEdit = () => {
    if (!editing) return;
    const name = editing.name.trim() || 'Untitled list';
    const entries = toLines(editing.text);
    if (editing.id) {
      setLists((all) => all.map((l) => (l.id === editing.id ? { ...l, name, entries } : l)));
    } else {
      const id = newId();
      setLists((all) => [...all, { id, name, entries }]);
      setSelectedId(id);
    }
    setEditing(null);
  };

  const remove = (id: string) => {
    setLists((all) => all.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
    setEditing(null);
  };

  const latest = history[0] && history[0].id !== clearedId ? history[0] : undefined;
  const past = latest ? history.slice(1) : history;
  const clearScreen = latest ? () => setClearedId(latest.id) : undefined;

  if (editing) {
    const lineCount = toLines(editing.text).length;
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={ui.screenTitle}>{editing.id ? 'Edit list' : 'New list'}</Text>
        <Panel>
          <SectionTitle>Name</SectionTitle>
          <TextInput
            value={editing.name}
            onChangeText={(name) => setEditing({ ...editing, name })}
            placeholder="e.g. Tavern names"
            placeholderTextColor={colors.muted}
            style={ui.input}
            accessibilityLabel="List name"
          />
          <SectionTitle right={<Text style={ui.muted}>{lineCount} entries</Text>}>
            <Text>{'\n'}Entries, one per line</Text>
          </SectionTitle>
          <TextInput
            value={editing.text}
            onChangeText={(text) => setEditing({ ...editing, text })}
            placeholder={'The Prancing Pony\nThe Rusty Anchor\nThe Gilded Goose'}
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            style={[ui.input, { minHeight: 220, fontSize: 16 }]}
            accessibilityLabel="List entries, one per line"
          />
          <Text style={[ui.muted, { marginTop: 6, fontSize: 12 }]}>
            Tip: paste a whole table from a PDF or notes app. Blank lines are ignored.
          </Text>
          <View style={styles.actions}>
            {editing.id ? <Button label="Delete" kind="danger" onPress={() => remove(editing.id!)} /> : null}
            <Button label="Cancel" kind="ghost" onPress={() => setEditing(null)} />
            <Button label="Save" style={{ flex: 1 }} onPress={saveEdit} />
          </View>
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader title="Lists" onClear={clearScreen} />
      <Panel>
        <SectionTitle right={<Button label="+ New list" kind="secondary" compact onPress={startNew} />}>
          Your lists
        </SectionTitle>
        <View style={ui.wrap}>
          {lists.map((l) => (
            <Chip
              key={l.id}
              label={`${l.name} (${l.entries.length})`}
              active={selected?.id === l.id}
              onPress={() => setSelectedId(l.id)}
              onLongPress={() => startEdit(l)}
            />
          ))}
        </View>
        {lists.length === 0 ? <Text style={ui.muted}>No lists yet. Tap “+ New list”.</Text> : null}
      </Panel>

      {selected ? (
        <Panel>
          <SectionTitle right={<Button label="Edit" kind="ghost" compact onPress={() => startEdit(selected)} />}>
            {selected.name}
          </SectionTitle>
          <Stepper label="Entries to pick" value={n} onChange={setCount} min={1} max={max} />
          <Toggle
            label="Allow repeats"
            hint={repeats ? 'The same entry can come up more than once.' : 'Each pick is a different entry.'}
            value={repeats}
            onChange={setRepeats}
          />
          <Button
            label={selected.entries.length ? `Pick ${n}` : 'List is empty'}
            disabled={!selected.entries.length}
            onPress={pick}
            style={{ marginTop: 10 }}
          />
        </Panel>
      ) : null}

      {latest ? (
        <Panel style={{ borderWidth: 1, borderColor: colors.accent }}>
          <SectionTitle>{latest.listName}</SectionTitle>
          {latest.items.map((it, i) => (
            <Text key={i} style={styles.pick}>
              {latest.items.length > 1 ? `${i + 1}. ` : ''}
              {it}
            </Text>
          ))}
        </Panel>
      ) : null}

      {selected && selected.entries.length ? (
        <Panel>
          <SectionTitle>Entries</SectionTitle>
          {selected.entries.map((e, i) => (
            <Pressable key={i} onLongPress={() => startEdit(selected)}>
              <Text style={styles.entry}>
                <Text style={{ color: colors.muted }}>{i + 1}. </Text>
                {e}
              </Text>
            </Pressable>
          ))}
        </Panel>
      ) : null}

      {past.length > 0 ? (
        <Panel>
          <SectionTitle right={<Button label="Clear" kind="ghost" compact onPress={() => setHistory([])} />}>
            History
          </SectionTitle>
          {past.map((h) => (
            <Text key={h.id} style={styles.historyRow}>
              <Text style={{ color: colors.muted }}>{h.listName}: </Text>
              {h.items.join(' · ')}
            </Text>
          ))}
        </Panel>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  pick: { color: colors.text, fontSize: 22, fontWeight: '700', paddingVertical: 4 },
  entry: { color: colors.text, fontSize: 15, paddingVertical: 4 },
  historyRow: {
    color: colors.text,
    fontSize: 14,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
