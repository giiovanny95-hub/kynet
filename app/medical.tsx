import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getStore } from '@/data/storeProvider';
import { cachedPrefs, savePrefs } from '@/features/profile/prefsStore';
import { Body, Button, Card, Choice, H1, Screen } from '@/ui/kit';

/**
 * Aviso médico (producto §5.4): obligatorio antes del primer entrenamiento, con casilla sin marcar.
 * Con `next=exercises` continúa a elegir ejercicio; desde Perfil solo se lee.
 */
export default function MedicalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const already = cachedPrefs()?.medicalAcceptedAt != null;
  const [checked, setChecked] = useState(already);
  const onContinue = async () => {
    if (!already) await savePrefs(getStore(), { medicalAcceptedAt: new Date().toISOString() });
    if (next === 'exercises') router.replace('/exercises');
    else router.back();
  };
  return (
    <Screen>
      <H1>{t('medical.title')}</H1>
      <Card>
        <Body>{t('medical.body')}</Body>
      </Card>
      <Choice label={t('medical.accept')} selected={checked} onPress={() => setChecked(!checked || already)} />
      <Button label={t('medical.continue')} disabled={!checked} onPress={() => void onContinue()} />
    </Screen>
  );
}
