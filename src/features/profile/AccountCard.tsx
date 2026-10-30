import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { currentEmail, deleteAccount, exportMyData, loginAvailable, signInWithGoogle, signOut } from '@/auth/accountService';
import { getStore } from '@/data/storeProvider';
import { LAST_SYNC_ERROR_KEY, runSync } from '@/sync/syncService';
import { Body, Button, Card, H2 } from '@/ui/kit';

/** Perfil > Cuenta (producto §3.8, §6.4): login con Google, estado de la subida, exportar, cerrar sesión y borrar. */
export function AccountCard({ pending, onChange }: { pending: number; onChange: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEmail(await currentEmail());
    setMessage((await getStore().getKv(LAST_SYNC_ERROR_KEY)) !== null ? t('account.syncError') : null);
  }, [t]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const act = async (task: () => Promise<boolean>) => {
    setBusy(true);
    setMessage(null);
    const ok = await task().catch(() => false);
    setBusy(false);
    if (!ok) setMessage(t('account.error'));
    await load();
    onChange();
  };

  if (!loginAvailable()) {
    return (
      <Card>
        <H2>{t('account.title')}</H2>
        <Body tone="muted">{t('account.local')}</Body>
        <Body tone="muted">{t('account.unavailable')}</Body>
      </Card>
    );
  }
  if (email === null) {
    return (
      <Card>
        <H2>{t('account.title')}</H2>
        <Body tone="muted">{t('account.local')}</Body>
        <Button label={t('account.signIn')} disabled={busy} onPress={() => void act(async () => (await signInWithGoogle()) !== 'error')} />
        {message !== null ? <Body tone="warn">{message}</Body> : null}
      </Card>
    );
  }
  const confirmDelete = () =>
    Alert.alert(t('account.deleteTitle'), t('account.deleteBody'), [
      { text: t('account.cancel'), style: 'cancel' },
      {
        text: t('account.confirmDelete'),
        style: 'destructive',
        onPress: () =>
          void act(async () => {
            const ok = await deleteAccount();
            if (ok) router.replace('/onboarding');
            return ok;
          }),
      },
    ]);
  return (
    <Card>
      <H2>{t('account.title')}</H2>
      <Body>{t('account.signedInAs', { email })}</Body>
      <Body tone="muted">{pending > 0 ? t('account.pending', { count: pending }) : t('account.synced')}</Body>
      {message !== null ? <Body tone="warn">{message}</Body> : null}
      <Button kind="secondary" label={t('account.sync')} disabled={busy} onPress={() => void act(async () => (await runSync(), true))} />
      <Button kind="secondary" label={t('account.export')} disabled={busy} onPress={() => void act(exportMyData)} />
      <Button kind="secondary" label={t('account.signOut')} disabled={busy} onPress={() => void act(async () => (await signOut(), true))} />
      <Button kind="secondary" label={t('account.delete')} disabled={busy} onPress={confirmDelete} />
    </Card>
  );
}
