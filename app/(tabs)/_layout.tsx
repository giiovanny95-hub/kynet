import { Redirect, usePathname } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { Award, ChartLine, Flame, UserRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import '@/i18n';
import { AGE_BLOCKED_KEY } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import { loadPrefs } from '@/features/profile/prefsStore';
import { TabBarButton, TabIndicator } from '@/ui/TabBar';
import { space, tokens } from '@/ui/tokens';

type Gate = 'loading' | 'onboarding' | 'ready';

// Iconos Lucide equivalentes a los Material Symbols de Stitch (spec-diseno §3).
const TABS = [
  { name: 'index', href: '/', label: 'tabs.today', Icon: Flame },
  { name: 'progress', href: '/progress', label: 'tabs.progress', Icon: ChartLine },
  { name: 'missions', href: '/missions', label: 'tabs.missions', Icon: Award },
  { name: 'profile', href: '/profile', label: 'tabs.profile', Icon: UserRound },
] as const;

/** Navegación inferior Hoy · Progreso · Misiones · Perfil (producto §3). Sin onboarding terminado, va al onboarding. */
export default function TabsLayout() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [gate, setGate] = useState<Gate>('loading');
  useEffect(() => {
    const store = getStore();
    void Promise.all([loadPrefs(store), store.getKv(AGE_BLOCKED_KEY)]).then(([prefs, blocked]) =>
      setGate(blocked !== null || prefs.onboardedAt === null ? 'onboarding' : 'ready'),
    );
  }, []);
  if (gate === 'loading') return null;
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;
  const active = TABS.findIndex((tab) => tab.href === pathname);
  return (
    // `TabList` tiene que ser hijo directo de `Tabs`: así registra los `TabTrigger` (envuelto en un View no navega).
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList style={styles.bar}>
        <TabIndicator index={active} count={TABS.length} />
        {TABS.map((tab, i) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <TabBarButton label={t(tab.label)} Icon={tab.Icon} focused={i === active} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg },
  bar: { flexDirection: 'row', backgroundColor: tokens.surface, borderTopWidth: 1, borderTopColor: tokens.border, paddingBottom: space.xl },
});
