import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { currentEmail, deleteAccount, exportMyData, loginAvailable, signInWithGoogle, signOut } from '@/auth/accountService';
import { signInMessageKey } from '@/auth/signInError';
import { getStore } from '@/data/storeProvider';
import { LAST_SYNC_ERROR_KEY, runSync } from '@/sync/syncService';
import { Body, Button, Card, H2 } from '@/ui/kit';

/** Perfil > Cuenta (producto §3.8, §6.4): login con Google, estado de la subida, exportar, cerrar sesión y borrar. */
export function AccountCard({ pending, onChange }: { pending: number; onChange: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // El error de la última acción y el aviso de la cola van por separado: recargar el estado (que lee el aviso) no
  // debe borrar el error que el usuario acaba de provocar; se borra al iniciar otra acción.
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState(false);
  const running = useRef(false);

  const load = useCallback(async () => {
    setEmail(await currentEmail());
    setSyncWarning((await getStore().getKv(LAST_SYNC_ERROR_KEY)) !== null);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Ejecuta una acción de cuenta. Devuelve la clave i18n del error, o `null` si no hay nada que avisar. */
  const act = async (task: () => Promise<string | null>) => {
    // Cerrojo síncrono: dos pulsaciones seguidas llegan antes de que `busy` deshabilite el botón.
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setActionError(null);
    const errorKey = await task().catch(() => 'account.error');
    await load();
    setActionError(errorKey);
    setBusy(false);
    running.current = false;
    onChange();
  };
  const ok = (done: boolean) => (done ? null : 'account.error');
  const message = actionError !== null ? t(actionError) : syncWarning ? t('account.syncError') : null;

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
        <Button label={t('account.signIn')} disabled={busy} onPress={() => void act(async () => signInMessageKey(await signInWithGoogle()))} />
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
            const deleted = await deleteAccount();
            if (deleted) router.replace('/onboarding');
            return ok(deleted);
          }),
      },
    ]);
  return (
    <Card>
      <H2>{t('account.title')}</H2>
      <Body>{t('account.signedInAs', { email })}</Body>
      <Body tone="muted">{pending > 0 ? t('account.pending', { count: pending }) : t('account.synced')}</Body>
      {message !== null ? <Body tone="warn">{message}</Body> : null}
      <Button kind="secondary" label={t('account.sync')} disabled={busy} onPress={() => void act(async () => (await runSync(), null))} />
      <Button kind="secondary" label={t('account.export')} disabled={busy} onPress={() => void act(async () => ok(await exportMyData()))} />
      <Button kind="secondary" label={t('account.signOut')} disabled={busy} onPress={() => void act(async () => (await signOut(), null))} />
      <Button kind="secondary" label={t('account.delete')} disabled={busy} onPress={confirmDelete} />
    </Card>
  );
}
