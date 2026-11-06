import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH, REQUEST } from '@shared/theme/tokens';
import { TextButton } from '@shared/components/TextButton';
import { Card, PasswordField, PrimaryButton, TextField } from '@shared/components/ui';
import { authApi } from '@shared/api/authApi';
import { useAuth } from '../AuthContext';
import {
  activateWithSchoolCode, classifyLogin, formatPhone, isSchoolCode, newPasswordRules, newPinState,
  passwordChangeErrorMessage, pinSetupErrorMessage, schoolCodeErrorMessage,
  PASSWORD_MAX_LENGTH, PIN_MAX_LENGTH, SCHOOL_CODE_LENGTH,
} from '../signInModel';
import { FormDivider, FormPage, FormError, Hint, IconBadgeRow, Rule, ValueCard } from '@shared/ui/formParts';
import { useSignInCompletion } from './SignInParts';

// Длину кода и PIN режет этот разбор, а не `maxLength` поля: тот обрезал бы сырую строку
// раньше, чем сняты дефис и пробелы, и вставка «8222-6447» потеряла бы последнюю цифру.
const digitsOnly = (text, max) => text.replace(/\D/g, '').slice(0, max);

// Набранный PIN — крупные точки с разрядкой (M4): по ним видно, сколько цифр уже введено.
// Только когда есть ввод — плейсхолдер «4–6 цифр» остаётся обычным текстом поля.
const PIN_TEXT = {
  fontSize: REQUEST.pinTextSize,
  lineHeight: REQUEST.pinTextLine,
  letterSpacing: REQUEST.pinTracking,
  fontWeight: '600',
};

/**
 * M4 «Код без PIN → первая активация» — `POST /api/auth/student/activate`.
 *
 * В макете сюда приходят сами, а код уже «Подтверждён». Так не бывает: сервер проверяет код
 * только вместе с новым PIN, одним запросом, и до него экран не знает, верен ли код. Поэтому
 * вместо галочки — «Изменить», а сюда ведёт ссылка «Ещё нет PIN?» с шага M3. Тот же экран
 * нужен после сброса PIN администратором: активация принимает код, у которого нет PIN.
 */
export function AuthPinSetup({ code, onBack, onEditCode }) {
  const { c } = useTheme();
  const { complete, offer, offerError } = useSignInCompletion();
  const [pin, setPin] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const state = newPinState(pin, repeat);

  const submit = async () => {
    if (!state.ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.activateStudent(code, pin);
      await complete(response, pin);
    } catch (e) {
      setError(pinSetupErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (offer) return offer;
  const message = error || offerError;

  return (
    <FormPage
      layout="request"
      gap={REQUEST.stepGap}
      onBack={onBack}
      title="Придумайте PIN"
      subtitle="PIN — это ваш пароль: дальше вы будете входить по коду и PIN."
    >
      <ValueCard size="lg" label="Персональный код" value={code} code onAction={onEditCode} />
      <View>
        <TextField
          size="lg"
          label="Новый PIN"
          value={pin}
          onChangeText={(text) => {
            setPin(digitsOnly(text, PIN_MAX_LENGTH));
            setError(null);
          }}
          placeholder="4–6 цифр"
          keyboardType="number-pad"
          secureTextEntry
          autoFocus
          autoComplete="off"
          inputStyle={pin ? PIN_TEXT : null}
        />
        <Hint>4–6 цифр. Не используйте дату рождения.</Hint>
      </View>
      <View>
        <TextField
          size="lg"
          label="Повторите PIN"
          value={repeat}
          onChangeText={(text) => {
            setRepeat(digitsOnly(text, PIN_MAX_LENGTH));
            setError(null);
          }}
          invalid={state.mismatch}
          keyboardType="number-pad"
          secureTextEntry
          autoComplete="off"
          returnKeyType="go"
          onSubmitEditing={submit}
          inputStyle={repeat ? PIN_TEXT : null}
        />
        {state.mismatch ? <FormError>PIN не совпадает</FormError> : null}
      </View>
      {message ? <FormError>{message}</FormError> : null}
      <PrimaryButton size="lg" disabled={!state.ready || loading} onPress={submit}>
        {loading ? <ActivityIndicator color={c.heroInk} /> : 'Сохранить и войти'}
      </PrimaryButton>
    </FormPage>
  );
}

/**
 * M6 «Забыли пароль или PIN» — объяснение, к кому идти, а не форма восстановления.
 *
 * Самостоятельного восстановления в системе нет: ни SMS, ни писем. Пароль восстанавливает
 * администратор — кодом восстановления или временным паролем, код ученику выпускают
 * классный руководитель и родитель, PIN сбрасывает администратор. Единственный ввод на
 * экране — код восстановления: с ним взрослый задаёт пароль сам (тот же путь, что у кода
 * активации нового аккаунта). Временный пароль вводится обычным входом и уводит на M7.
 */
export function AuthRecovery({ onBack, onCode }) {
  const [code, setCode] = useState('');
  const ready = isSchoolCode(code);

  return (
    <FormPage
      layout="request"
      gap={REQUEST.stepGap}
      onBack={onBack}
      title="Восстановить доступ"
      subtitle="Пароль и PIN восстанавливает школа — по SMS это пока не работает."
    >
      <Card style={{ gap: 14 }}>
        <IconBadgeRow compact icon="graduationCap" title="Ученик">
          {'Новый персональный код выпустит классный руководитель или\u00a0родитель\u00a0— PIN останется '}
          прежним. Забытый PIN сбрасывает администратор школы, после этого придумайте новый.
        </IconBadgeRow>
        <FormDivider />
        <IconBadgeRow compact icon="users" tone="orange" title="Родитель, учитель или сотрудник">
          {'Обратитесь к\u00a0администратору школы\u00a0— он выдаст одноразовый код восстановления или '}
          временный пароль.
        </IconBadgeRow>
      </Card>

      <View>
        <TextField
          size="lg"
          label="Уже получили код восстановления?"
          value={code}
          onChangeText={(text) => setCode(digitsOnly(text, SCHOOL_CODE_LENGTH))}
          placeholder="Например, 48213907"
          keyboardType="number-pad"
          autoComplete="off"
          returnKeyType="next"
          onSubmitEditing={() => ready && onCode(code)}
        />
        <Hint>Код активации нового аккаунта вводится сюда же.</Hint>
      </View>
      <PrimaryButton size="lg" disabled={!ready} onPress={() => onCode(code)}>
        Продолжить
      </PrimaryButton>
      <Hint center>Временный пароль вводится на обычном экране входа.</Hint>
    </FormPage>
  );
}

/**
 * Продолжение M6: пароль по коду от школы. В макете кадра нет — он собран из полей M7.
 *
 * Код проверяется вместе с паролем, одним запросом активации, поэтому до ответа экран не
 * обещает, что код верен. Путь активации у каждой роли свой, и человек свою роль в системе
 * выбирать не должен — пути перебирает `activateWithSchoolCode`, безопасно для счётчика
 * попыток. Телефон нужен самой активации: код ищется у аккаунта с этим номером.
 */
export function AuthSchoolCode({ code, login, onBack }) {
  const { c } = useTheme();
  const { complete, offer, offerError } = useSignInCompletion();
  const [contact, setContact] = useState(() => (login ? formatPhone(login) : ''));
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const rules = newPasswordRules(password, repeat);
  const target = classifyLogin(contact);
  const contactValid = target.kind === 'phone' || target.kind === 'email';
  const ready = rules.ready && contactValid;

  const submit = async () => {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await activateWithSchoolCode(authApi, target.login, code, password);
      await complete(response, password);
    } catch (e) {
      setError(schoolCodeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (offer) return offer;
  const message = error || offerError;

  return (
    <FormPage
      layout="request"
      gap={REQUEST.stepGap}
      onBack={onBack}
      title="Задайте пароль"
      subtitle="Код от школы проверится вместе с новым паролем. Дальше вы будете входить по телефону и этому паролю."
    >
      <ValueCard size="lg" label="Код от школы" value={code} code onAction={onBack} />
      <TextField
          size="lg"
        label="Телефон или почта"
        value={contact}
        onChangeText={(text) => {
          setContact(text);
          setError(null);
        }}
        placeholder="+7 7__ ___ __ __"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
      />
      <View>
        <PasswordField
          size="lg"
          label="Новый пароль"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          placeholder="Придумайте пароль"
          maxLength={PASSWORD_MAX_LENGTH}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Rule met={rules.longEnough}>Не короче 8 символов</Rule>
      </View>
      <View>
        <PasswordField
          size="lg"
          label="Повторите пароль"
          value={repeat}
          onChangeText={(text) => {
            setRepeat(text);
            setError(null);
          }}
          placeholder="Ещё раз"
          maxLength={PASSWORD_MAX_LENGTH}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Rule met={rules.matches}>Пароли совпадают</Rule>
      </View>
      {message ? <FormError>{message}</FormError> : null}
      <PrimaryButton size="lg" disabled={!ready || loading} onPress={submit}>
        {loading ? <ActivityIndicator color={c.heroInk} /> : 'Сохранить и войти'}
      </PrimaryButton>
    </FormPage>
  );
}

/**
 * M7 «Временный пароль → обязательная смена» — `POST /api/auth/password/change`.
 *
 * Временный пароль, которым только что вошли, лежит в памяти (`temporarySecret`) и уходит
 * как `currentPassword` сам. После перезапуска приложения его там нет, а сессия с отметкой
 * осталась — тогда экран спрашивает его полем, иначе смену отправить нечем.
 *
 * Назад отсюда некуда: сервер не откроет ничего, кроме смены и выхода. Поэтому вместо
 * «назад» — «Выйти»: без неё человек, забывший временный пароль после перезапуска, застрял бы.
 */
export function AuthNewPassword() {
  const { c } = useTheme();
  const { temporarySecret, changePassword, signOut } = useAuth();
  const { complete, offer, offerError } = useSignInCompletion();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const askCurrent = temporarySecret == null;
  const rules = newPasswordRules(password, repeat);
  const ready = rules.ready && (!askCurrent || current.length > 0);

  const submit = async () => {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await changePassword(askCurrent ? current : undefined, password);
      await complete(response);
    } catch (e) {
      setError(passwordChangeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (offer) return offer;
  const message = error || offerError;

  return (
    <FormPage
      layout="request"
      gap={REQUEST.stepGap}
      title="Придумайте новый пароль"
      subtitle="Вы вошли по временному паролю от школы. Чтобы продолжить, задайте свой — временный перестанет работать."
    >
      {askCurrent ? (
        <PasswordField
          size="lg"
          label="Временный пароль"
          value={current}
          onChangeText={(text) => {
            setCurrent(text);
            setError(null);
          }}
          placeholder="Тот, что выдала школа"
          autoFocus
          autoComplete="current-password"
          textContentType="password"
        />
      ) : null}
      <View>
        <PasswordField
          size="lg"
          label="Новый пароль"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          placeholder="Придумайте пароль"
          maxLength={PASSWORD_MAX_LENGTH}
          autoFocus={!askCurrent}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Rule met={rules.longEnough}>Не короче 8 символов</Rule>
      </View>
      <View>
        <PasswordField
          size="lg"
          label="Повторите пароль"
          value={repeat}
          onChangeText={(text) => {
            setRepeat(text);
            setError(null);
          }}
          placeholder="Ещё раз"
          maxLength={PASSWORD_MAX_LENGTH}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Rule met={rules.matches}>Пароли совпадают</Rule>
      </View>
      {message ? <FormError>{message}</FormError> : null}
      <PrimaryButton size="lg" disabled={!ready || loading} onPress={submit}>
        {loading ? <ActivityIndicator color={c.heroInk} /> : 'Сохранить и войти'}
      </PrimaryButton>
      <TextButton size="lg" onPress={signOut}>Выйти</TextButton>
    </FormPage>
  );
}
