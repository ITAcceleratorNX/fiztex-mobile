import React, { useContext, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH } from '@shared/theme/tokens';
import { ScreenTopInsetContext } from '@shared/components/Screen';
import { TextButton } from '@shared/components/TextButton';
import { Txt } from '@shared/components/Txt';
import { PinField } from '@shared/components/PinField';
import {
  CircleButton, PasswordField, PhysTechWordmark, PrimaryButton, TextField,
} from '@shared/components/ui';
import { authApi } from '@shared/api/authApi';
import {
  classifyLogin, formatPhone, isPin, loginHint, signInErrorMessage,
  PASSWORD_MAX_LENGTH, PIN_MAX_LENGTH, PIN_MIN_LENGTH,
} from '../signInModel';
import { FormPage, FormError, Hint, ValueCard } from '@shared/ui/formParts';
import { useSignInCompletion } from './SignInParts';

/**
 * M1 «Вход — одно поле». Телефон, почта или персональный код — в одном поле, а пароль или
 * PIN спрашивается вторым шагом по форме введённого (`classifyLogin`), ровно как решает
 * сервер. Самого человека здесь не ищут: эндпоинта «есть ли такой логин» нет, поэтому
 * отказ M5 случается только после секрета, а здесь проверяется лишь форма ввода.
 *
 * Шапка со знаком — под статус-баром, поэтому экран рисует отступ сам, без `Screen`, и
 * светлые значки статус-бара держит, только пока он на виду: стек оставляет его
 * смонтированным под следующими шагами, а у тех светлый фон.
 */
export function AuthSignIn({
  onBack, onContinue, onForgot, onFaceId, canUseFaceId, biometricLabel, onApply, onRequestStatus,
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useContext(ScreenTopInsetContext) ?? insets.top;
  const focused = useIsFocused();
  const [value, setValue] = useState('');
  const [hint, setHint] = useState(null);

  const submit = () => {
    const classified = classifyLogin(value);
    if (classified.kind === 'empty') return;
    const message = loginHint(classified);
    if (message) {
      setHint(message);
      return;
    }
    onContinue(classified);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.heroBg }}>
      {focused ? <StatusBar style="light" /> : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={{
              height: topInset + AUTH.heroHeight,
              paddingTop: topInset,
              paddingBottom: AUTH.sheetOverlap,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PhysTechWordmark size={AUTH.logoHeight} color={c.heroInk} />
            {onBack ? (
              <View style={{ position: 'absolute', top: topInset + 4, left: AUTH.gutter }}>
                <CircleButton icon="chevronLeft" size={38} onPress={onBack} />
              </View>
            ) : null}
          </View>

          <View
            style={{
              flexGrow: 1,
              marginTop: -AUTH.sheetOverlap,
              backgroundColor: c.bg,
              borderTopLeftRadius: AUTH.sheetRadius,
              borderTopRightRadius: AUTH.sheetRadius,
              paddingHorizontal: AUTH.gutter,
              paddingTop: AUTH.sectionGap,
              paddingBottom: insets.bottom + AUTH.gap,
              gap: AUTH.gap,
            }}
          >
            <View>
              <Txt style={{ fontSize: AUTH.titleSize, lineHeight: AUTH.titleLine, fontWeight: '700' }}>Вход</Txt>
              <Txt style={{ marginTop: 4, fontSize: AUTH.bodySize, lineHeight: AUTH.bodyLine, color: c.ink2 }}>
                Телефон или персональный код от школы
              </Txt>
            </View>

            <View>
              <TextField
                label="Телефон или код"
                value={value}
                onChangeText={(text) => {
                  setValue(text);
                  setHint(null);
                }}
                invalid={Boolean(hint)}
                placeholder="+7 7__ ___ __ __ или код ученика"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={submit}
              />
              {hint ? <FormError>{hint}</FormError> : null}
            </View>

            <PrimaryButton disabled={!value.trim()} onPress={submit}>
              Продолжить
            </PrimaryButton>
            <TextButton onPress={() => onForgot(classifyLogin(value))}>Забыли пароль или PIN?</TextButton>
            {canUseFaceId ? (
              <TextButton onPress={onFaceId}>{`Войти через ${biometricLabel || 'Face ID'}`}</TextButton>
            ) : null}

            <View style={{ flex: 1 }} />
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontSize: AUTH.bodySize, color: c.ink2 }}>Нет доступа?</Txt>
                <TextButton onPress={onApply}>Отправить заявку</TextButton>
              </View>
              <TextButton onPress={onRequestStatus}>Проверить статус заявки</TextButton>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * M2 «Ввели телефон → пароль» и M3 «Ввели код → PIN»; M5 «Ошибка входа» — их состояние.
 *
 * Логин уже введён на M1 и здесь только напоминается карточкой: «Изменить» возвращает туда,
 * где он вводился, — поле M1 остаётся заполненным. Отказ один на все случаи (§9) и стоит под
 * секретом, а не под логином, как в макете: сервер не говорит, что именно не подошло.
 *
 * У PIN есть второй выход — «Ещё нет PIN?». Ученик с новым кодом PIN ещё не придумал, а узнать
 * это заранее неоткуда (M4 рисовался как автоматический переход): сервер на такой код отвечает
 * тем же «неверный код или PIN», что и на чужой.
 */
export function AuthSecret({ kind, login, onBack, onForgot, onCreatePin }) {
  const { c } = useTheme();
  const { complete, offer, offerError } = useSignInCompletion();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const pin = kind === 'code';
  const ready = pin ? isPin(secret) : secret.length > 0;

  const change = (text) => {
    setSecret(text);
    setError(null);
  };

  const submit = async () => {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.signIn(login, secret);
      await complete(response, secret);
    } catch (e) {
      setError(signInErrorMessage(e, kind));
    } finally {
      setLoading(false);
    }
  };

  if (offer) return offer;
  const message = error || offerError;

  return (
    <FormPage
      onBack={onBack}
      title={pin ? 'Введите PIN' : 'Введите пароль'}
      subtitle={pin ? 'Тот, что вы придумали при первом входе.' : kind === 'email' ? 'Вход по почте' : 'Вход по телефону'}
    >
      <ValueCard
        label={pin ? 'Персональный код' : kind === 'email' ? 'Почта' : 'Телефон'}
        value={kind === 'phone' ? formatPhone(login) : login}
        code={pin}
        onAction={onBack}
      />

      <View>
        {pin ? (
          <>
            <PinField
              label="PIN"
              value={secret}
              onChangeText={change}
              minLength={PIN_MIN_LENGTH}
              maxLength={PIN_MAX_LENGTH}
              invalid={Boolean(message)}
              autoFocus
              onSubmitEditing={submit}
            />
            <Hint>4–6 цифр</Hint>
          </>
        ) : (
          <PasswordField
            label="Пароль"
            value={secret}
            onChangeText={change}
            invalid={Boolean(message)}
            placeholder="Введите пароль"
            maxLength={PASSWORD_MAX_LENGTH}
            autoFocus
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
        )}
        {message ? <FormError>{message}</FormError> : null}
      </View>

      <PrimaryButton disabled={!ready || loading} onPress={submit}>
        {loading ? <ActivityIndicator color={c.heroInk} /> : 'Войти'}
      </PrimaryButton>
      <TextButton onPress={onForgot}>{pin ? 'Забыли PIN?' : 'Забыли пароль?'}</TextButton>
      {pin ? <TextButton onPress={onCreatePin}>Ещё нет PIN? Придумать</TextButton> : null}
    </FormPage>
  );
}
