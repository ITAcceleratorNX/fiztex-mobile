import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { PrimaryButton, ScreenHeader } from '@shared/components/ui';
import { useAuth } from '../AuthContext';

export function AuthFaceID({ onSuccess, onFail, onBack }) {
  const { c } = useTheme();
  const { unlockWithBiometrics, biometricMeta } = useAuth();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const tryUnlock = async () => {
    setBusy(true);
    setError(null);
    const result = await unlockWithBiometrics();
    setBusy(false);
    if (result.success) {
      onSuccess?.();
      return;
    }
    // «Биометрия недоступна» — не отказ пользователя, а отсутствие того, чем подтверждать
    // (Face ID сброшен, отпечатки удалены). Повторять здесь нечего, поэтому уводим на
    // вход по паролю сразу, а не оставляем на экране с бесполезной кнопкой «Повторить».
    if (result.error === 'unavailable' || result.error === 'no_session') {
      onBack?.();
      return;
    }
    setError('Не удалось подтвердить личность');
    onFail?.(result);
  };

  useEffect(() => {
    tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <ScreenHeader title={biometricMeta.label || 'Face ID'} back={onBack} />
      <View style={{ paddingHorizontal: 24, alignItems: 'center' }}>
        <View style={{ marginTop: 40, width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: c.blueSoft }} />
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 999, backgroundColor: c.blue }} />
          <Icon name="face" size={68} color="#fff" />
        </View>
        <Txt style={{ marginTop: 28, fontSize: 17, fontWeight: '700' }}>
          {busy ? 'Подтвердите личность…' : error || `Используйте ${biometricMeta.label}`}
        </Txt>
        {error ? (
          <PrimaryButton color="blue" style={{ marginTop: 24 }} onPress={tryUnlock}>
            Повторить
          </PrimaryButton>
        ) : null}
        <PrimaryButton color="ghost" style={{ marginTop: 12 }} onPress={onBack}>
          Войти по паролю
        </PrimaryButton>
      </View>
    </Screen>
  );
}
