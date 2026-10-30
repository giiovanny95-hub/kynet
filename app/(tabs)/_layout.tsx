import { Redirect } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import '@/i18n';
import { AGE_BLOCKED_KEY } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import { loadPrefs } from '@/features/profile/prefsStore';
import { fonts, tokens } from '@/ui/tokens';

type Gate = 'loading' | 'onboarding' | 'ready';

const TABS = [
  { name: 'index', href: '/', label: 'tabs.today' },
  { name: 'progress', href: '/progress', label: 'tabs.progress' },
  { name: 'missions', href: '/missions', label: 'tabs.missions' },
  { name: 'profile', href: '/profile', label: 'tabs.profile' },
] as const;

function TabButton({ label, isFocused, ...props }: { label: string; isFocused?: boolean; onPress?: () => void }) {
  return (
    <Pressable {...props} style={styles.tab}>
      <Text style={[styles.tabText, isFocused === true && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** Navegación inferior Hoy · Progreso · Misiones · Perfil (producto §3). Sin onboarding terminado, va al onboarding. */
export default function TabsLayout() {
  const { t } = useTranslation();
  const [gate, setGate] = useState<Gate>('loading');
  useEffect(() => {
    const store = getStore();
    void Promise.all([loadPrefs(store), store.getKv(AGE_BLOCKED_KEY)]).then(([prefs, blocked]) =>
      setGate(blocked !== null || prefs.onboardedAt === null ? 'onboarding' : 'ready'),
    );
  }, []);
  if (gate === 'loading') return null;
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList style={styles.bar}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <TabButton label={t(tab.label)} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg },
  bar: { flexDirection: 'row', backgroundColor: tokens.surface, borderTopWidth: 1, borderTopColor: tokens.border, paddingBottom: 24 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontFamily: fonts.label, color: tokens.muted, fontSize: 13 },
  tabTextOn: { color: tokens.accent },
});
