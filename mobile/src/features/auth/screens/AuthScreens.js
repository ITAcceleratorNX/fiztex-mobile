import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { TextButton } from '@shared/components/TextButton';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { PhysTechMark } from '@shared/components/Hex';
import { PrimaryButton, ScreenHeader, PhysTechWordmark } from '@shared/components/ui';
import { useAuth } from '../AuthContext';

function BrandEmblem() {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: c.blueSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 128,
          height: 128,
          borderRadius: 40,
          backgroundColor: c.blue,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PhysTechMark size={68} color="#fff" />
      </View>
    </View>
  );
}

export function AuthWelcome({ onContinue, onEntrance, onDemo, onApply }) {
  const { c } = useTheme();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <PhysTechWordmark size={40} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BrandEmblem />
        </View>

        <View style={{ paddingBottom: 24 }}>
          <Txt style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.7, lineHeight: 35 }}>
            Школа в твоём кармане
          </Txt>
          <Txt style={{ fontSize: 15, color: c.ink2, marginTop: 10, lineHeight: 22 }}>
            Расписание, оценки, кружки, достижения и связь с учителями — всё в одном месте.
          </Txt>
        </View>

        <View style={{ paddingBottom: 24 }}>
          <PrimaryButton color="green" onPress={onContinue}>
            Войти
          </PrimaryButton>
          {onEntrance ? (
            <PrimaryButton color="blue" style={{ marginTop: 10 }} onPress={onEntrance}>
              Вступительный тест
            </PrimaryButton>
          ) : null}
          {/* Доступ теперь просят заявкой (AUTH-FE-001, A1): «спросите у школы» отправляло
              человека туда, где ему ответили бы тем же — подайте заявку. */}
          <Txt style={{ marginTop: 12, fontSize: 13, color: c.ink3, textAlign: 'center' }}>
            Нет аккаунта?{' '}
            <Txt accessibilityRole="link" onPress={onApply} style={{ color: c.green, fontWeight: '600' }}>
              Отправить заявку
            </Txt>
          </Txt>
          {onDemo ? <TextButton onPress={onDemo}>Попробовать демо</TextButton> : null}
        </View>
      </View>
    </Screen>
  );
}

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
