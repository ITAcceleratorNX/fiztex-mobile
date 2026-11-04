import React, { useCallback, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH } from '@shared/theme/tokens';
import { Screen } from '@shared/components/Screen';
import { TextButton } from '@shared/components/TextButton';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { HexBadge } from '@shared/components/Hex';
import { Card, PrimaryButton, ScreenHeader } from '@shared/components/ui';
import { useAuth, isMobileRole, ROLE_REJECTED } from '../AuthContext';

/**
 * Каркас шагов входа M2–M7: круглая кнопка «назад», крупный заголовок с подзаголовком и
 * колонка содержимого. Без `onBack` кнопки нет — так у обязательной смены пароля (M7):
 * вернуться оттуда некуда, сервер не откроет ничего, кроме смены и выхода.
 */
export function AuthPage({ title, subtitle, onBack, children }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen keyboardShouldPersistTaps="handled" contentStyle={{ paddingBottom: AUTH.sectionGap }}>
        <ScreenHeader large title={title} sub={subtitle} back={onBack} />
        <View style={{ paddingHorizontal: AUTH.gutter, marginTop: AUTH.gap, gap: AUTH.gap }}>{children}</View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

/**
 * Уже введённое на прошлом шаге (M2–M4): «Телефон +7 700…» и «Изменить». Логин здесь не
 * поле, а напоминание — править его возвращаются на первый шаг, где он и вводился.
 */
export function ValueCard({ label, value, code = false, action = 'Изменить', onAction }) {
  const { c } = useTheme();
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.ink2 }}>{label}</Txt>
        <Txt
          numberOfLines={1}
          style={{
            fontSize: AUTH.valueSize,
            fontWeight: '600',
            marginTop: 2,
            letterSpacing: code ? AUTH.codeSpacing : 0,
          }}
        >
          {value}
        </Txt>
      </View>
      {onAction ? <TextButton onPress={onAction}>{action}</TextButton> : null}
    </Card>
  );
}

/** Отказ под полем (Figma M5): значок и текст, а не только красная рамка. */
export function FormError({ children }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 8, marginTop: AUTH.captionGap }}>
      <View style={{ marginTop: 1 }}>
        <Icon name="alertCircle" size={AUTH.iconSize} color={c.red} />
      </View>
      <Txt style={{ flex: 1, fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.red }}>
        {children}
      </Txt>
    </View>
  );
}

/** Подсказка под полем или сноска внизу экрана. */
export function Hint({ children, center = false }) {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        marginTop: AUTH.captionGap,
        fontSize: AUTH.captionSize,
        lineHeight: AUTH.captionLine,
        color: c.inkMuted,
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </Txt>
  );
}

/** Правило нового пароля (M7): галочка, когда выполнено, крестик — пока нет. */
export function Rule({ met, children }) {
  const { c } = useTheme();
  const color = met ? c.success : c.ink3;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: AUTH.captionGap }}>
      <Icon name={met ? 'check' : 'x'} size={AUTH.iconSize} color={color} strokeWidth={2} />
      <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color }}>{children}</Txt>
    </View>
  );
}

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
          Включить {label}
        </PrimaryButton>
        <PrimaryButton color="ghost" style={{ marginTop: 10 }} onPress={onSkip} disabled={busy}>
          Не сейчас
        </PrimaryButton>
      </View>
    </Screen>
  );
}

/** Значок строки на экране восстановления (M6): мягкая подложка и глиф роли. */
export function RecoveryRow({ icon, tone, title, children }) {
  const { c } = useTheme();
  const [bg, fg] = tone === 'orange' ? [c.greenSoft, c.green] : [c.blueSoft, c.blue];
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View
        style={{
          width: AUTH.badgeSize,
          height: AUTH.badgeSize,
          borderRadius: AUTH.badgeRadius,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: AUTH.bodySize, fontWeight: '700' }}>{title}</Txt>
        <Txt style={{ marginTop: 4, fontSize: AUTH.bodySize, lineHeight: AUTH.bodyLine, color: c.ink2 }}>
          {children}
        </Txt>
      </View>
    </View>
  );
}
