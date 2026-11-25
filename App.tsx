import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CardsScreen from './src/screens/CardsScreen';
import CoinScreen from './src/screens/CoinScreen';
import DiceScreen from './src/screens/DiceScreen';
import ListsScreen from './src/screens/ListsScreen';
import TarotScreen from './src/screens/TarotScreen';
import { colors } from './src/theme';

const TABS = [
  { key: 'dice', label: 'Dice', icon: '🎲', Screen: DiceScreen },
  { key: 'coin', label: 'Coin', icon: '🪙', Screen: CoinScreen },
  { key: 'cards', label: 'Cards', icon: '🂡', Screen: CardsScreen },
  { key: 'tarot', label: 'Tarot', icon: '🔮', Screen: TarotScreen },
  { key: 'lists', label: 'Lists', icon: '📜', Screen: ListsScreen },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  const [tab, setTab] = useState<TabKey>('dice');
  const Active = TABS.find((t) => t.key === tab)!.Screen;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Active />
        </KeyboardAvoidingView>
      </SafeAreaView>
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.tabBarWrap}>
        <View style={styles.tabBar} accessibilityRole="tablist">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
                onPress={() => setTab(t.key)}
                style={styles.tab}
              >
                <Text style={[styles.tabIcon, !active && { opacity: 0.5 }]}>{t.icon}</Text>
                <Text style={[styles.tabLabel, { color: active ? colors.accent : colors.muted }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabBarWrap: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  tabBar: { flexDirection: 'row', height: 60 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
