import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { HexBadge } from '@shared/components/Hex';
import { PrimaryButton } from '@shared/components/ui';
import { useAuth, isMobileRole, ROLE_REJECTED } from '../AuthContext';

/**
 * Последний шаг любого входа — ответ сервера превращается в сессию.
 *
 * Биометрия предлагается ДО открытия сессии: как только она открыта, корневой навигатор
 * перестраивается под роль и уносит человека в приложение, и экран с предложением просто не
 * успел бы появиться. Вход временным паролем открывает сессию сразу и без предложения:
 * впереди смена пароля (M7), а настоящий первый вход случится после неё.
 *
 * Роль проверяется здесь же, до предложения: отказ, найденный после согласия на Face ID,
 * оставлял бы включённую биометрию у сессии, которая так и не открылась.
 *
 * Куда идти после — не забота экрана: открытая сессия уводит в раздел роли или на смену
 * пароля через `SessionRouteGuard` навигатора.
 */
export function useSignInCompletion() {
  const { signInWithResponse, biometricMeta, enableBiometrics } = useAuth();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  const enter = useCallback(
    (response, secret) => signInWithResponse(response, { secret }),
    [signInWithResponse],
  );

  const complete = useCallback(
    async (response, secret) => {
      if (!isMobileRole(response.role)) throw new Error(ROLE_REJECTED);
      setError(null);
      if (response.mustChangePassword || !biometricMeta.available) {
        await enter(response, secret);
        return;
      }
      setPending(response);
    },
    [enter, biometricMeta.available],
  );

  // Обработчики живут вне `submit` экрана, и без своего catch любой отказ здесь стал бы
  // непойманным промисом: экран просто остался бы на месте.
  const finish = async (enable) => {
    try {
      if (enable) await enableBiometrics();
      await enter(pending);
    } catch (e) {
      setPending(null);
      setError(e.message || 'Не удалось войти');
    }
  };

  const offer = pending ? (
    <EnableBiometricsScreen
      label={biometricMeta.label}
      onEnable={() => finish(true)}
      onSkip={() => finish(false)}
    />
  ) : null;

  return { complete, offer, offerError: error };
}

function EnableBiometricsScreen({ label, onEnable, onSkip }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <HexBadge size={88} fill={c.blue} icon="face" iconColor={c.heroInk} iconSize={40} />
          <Txt style={{ marginTop: 24, fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
            Включить {label}?
          </Txt>
          <Txt style={{ marginTop: 10, fontSize: 14, color: c.ink2, textAlign: 'center', lineHeight: 20 }}>
            В следующий раз можно входить быстрее — без кода и пароля.
          </Txt>
        </View>
        <PrimaryButton
          color="blue"
          style={{ marginTop: 32 }}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await onEnable();
            } finally {
              setBusy(false);
            }
          }}
        >
          {/* Одной строкой: `PrimaryButton` кладёт каждый текстовый кусок в свой `Txt` рядом через
              `gap`, и «Включить {label}» расползался на «Включить   Face ID». */}
          {`Включить ${label}`}
        </PrimaryButton>
        <PrimaryButton color="ghost" style={{ marginTop: 10 }} onPress={onSkip} disabled={busy}>
          Не сейчас
        </PrimaryButton>
      </View>
    </Screen>
  );
}
