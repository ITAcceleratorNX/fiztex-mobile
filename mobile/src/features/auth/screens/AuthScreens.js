import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { HexBadge, PhysTechMark } from '@shared/components/Hex';
import { Card, PrimaryButton, ScreenHeader, PhysTechWordmark } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';
import { authApi } from '@shared/api/authApi';
import { useAuth, isMobileRole, ROLE_REJECTED } from '../AuthContext';

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

function Field({ label, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, placeholder, error }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink2, marginBottom: 6 }}>{label}</Txt>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={c.ink3}
        style={{
          height: 52,
          borderWidth: 1.5,
          borderColor: error ? c.red : c.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          fontSize: 16,
          fontWeight: '600',
          color: c.ink,
          backgroundColor: c.surface,
        }}
      />
    </View>
  );
}

export function AuthWelcome({ onContinue, onEntrance }) {
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
          <Txt style={{ marginTop: 12, fontSize: 13, color: c.ink3, textAlign: 'center' }}>
            Нет аккаунта? <Txt style={{ color: c.green, fontWeight: '600' }}>Спросите у школы</Txt>
          </Txt>
        </View>
      </View>
    </Screen>
  );
}

export function AuthSignIn({ onBack, onStudent, onParentTeacher, onFaceId, canUseFaceId, biometricLabel }) {
  const { c } = useTheme();
  return (
    <Screen>
      <ScreenHeader title="Вход" back={onBack} />
      <View style={{ paddingHorizontal: 20 }}>
        <Txt style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 31, marginTop: 8 }}>
          Как ты заходишь?
        </Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8 }}>
          Ученик — по коду и PIN. Остальные — по телефону или email.
        </Txt>

        {canUseFaceId ? (
          <Card
            style={{ marginTop: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16 }}
            onPress={onFaceId}
          >
            <HexBadge size={52} fill={c.blue} icon="face" iconColor="#fff" iconSize={26} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 18, fontWeight: '700' }}>{biometricLabel || 'Face ID'}</Txt>
              <Txt style={{ fontSize: 13, color: c.ink2, marginTop: 2 }}>Быстрый вход</Txt>
            </View>
            <Icon name="chevronRight" size={20} color={c.ink3} />
          </Card>
        ) : null}

        <GradCard
          colors={GRAD.green}
          padding={22}
          radius={20}
          patternColor="rgba(255,255,255,0.10)"
          patternSize={26}
          style={{ marginTop: canUseFaceId ? 12 : 24 }}
          onPress={onStudent}
        >
          <HexBadge size={52} fill="rgba(255,255,255,0.20)" icon="star" iconColor="#fff" iconSize={26} />
          <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 14 }}>Я ученик</Txt>
          <Txt style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Персональный код и PIN</Txt>
        </GradCard>

        <Card
          style={{ marginTop: 12, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16 }}
          onPress={onParentTeacher}
        >
          <HexBadge size={52} fill={c.blue} icon="user" iconColor="#fff" iconSize={26} />
          <View style={{ flex: 1 }}>
            {/* «Сотрудник», а не «учитель»: этой же дверью заходят администратор и
                охрана — им нужны сервисные заявки (SERVICE-FE-002 §16), и вход,
                названный чужой ролью, они бы просто не нашли. */}
            <Txt style={{ fontSize: 18, fontWeight: '700' }}>Родитель или сотрудник</Txt>
            <Txt style={{ fontSize: 13, color: c.ink2, marginTop: 2 }}>Телефон / email и пароль</Txt>
          </View>
          <Icon name="chevronRight" size={20} color={c.ink3} />
        </Card>
      </View>
    </Screen>
  );
}

export function AuthStudentLogin({ onBack, onActivatedHint }) {
  const { c } = useTheme();
  const { signInWithResponse, biometricMeta, enableBiometrics } = useAuth();
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState('login'); // login | activate
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  /** Ответ входа, ждущий ответа на предложение биометрии: сессию открываем после него. */
  const [pending, setPending] = useState(null);

  const enterWith = async (response) => {
    const next = await signInWithResponse(response);
    onActivatedHint?.(next.role);
  };

  const submit = async () => {
    if (code.trim().length < 4) {
      setError('Введите персональный код');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN должен быть 4–6 цифр');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === 'activate'
          ? await authApi.activateStudent(code.trim(), pin)
          : await authApi.studentLogin(code.trim(), pin);
      // Предложение биометрии показывается ДО открытия сессии: как только она открыта,
      // корневой навигатор перестраивается под роль и уносит пользователя в приложение —
      // экран с предложением при этом просто не успевал появиться.
      if (biometricMeta.available) setPending(res);
      else await enterWith(res);
    } catch (e) {
      setError(e.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    // Обработчики предложения биометрии живут вне `submit`, и без своего catch любой
    // отказ здесь становится непойманным промисом: экран просто остаётся на месте.
    const finish = async (enable) => {
      try {
        if (enable) await enableBiometrics();
        await enterWith(pending);
      } catch (e) {
        setPending(null);
        setError(e.message || 'Не удалось войти');
      }
    };
    return (
      <EnableBiometricsScreen
        label={biometricMeta.label}
        onEnable={() => finish(true)}
        onSkip={() => finish(false)}
      />
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScreenHeader title={mode === 'activate' ? 'Активация' : 'Ученик'} back={onBack} />
        <View style={{ paddingHorizontal: 20 }}>
          <Txt style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 31 }}>
            {mode === 'activate' ? 'Первый вход' : 'Вход по коду'}
          </Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8 }}>
            {mode === 'activate'
              ? 'Придумайте PIN из 4–6 цифр — он будет вашим паролем.'
              : 'Введите персональный код и PIN, выданные школой.'}
          </Txt>

          <Field
            label="Персональный код"
            value={code}
            onChangeText={(t) => {
              setError(null);
              setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16));
            }}
            autoCapitalize="characters"
            placeholder="Код ученика"
            error={error}
          />
          <Field
            label="PIN"
            value={pin}
            onChangeText={(t) => {
              setError(null);
              setPin(t.replace(/\D/g, '').slice(0, 6));
            }}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="4–6 цифр"
            error={error}
          />
          {error ? (
            <Txt style={{ color: c.red, fontSize: 13, marginTop: 10 }}>{error}</Txt>
          ) : null}

          <PrimaryButton color="green" style={{ marginTop: 24 }} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : mode === 'activate' ? 'Активировать' : 'Войти'}
          </PrimaryButton>

          <Pressable
            onPress={() => {
              setError(null);
              setMode(mode === 'login' ? 'activate' : 'login');
            }}
            style={{ marginTop: 16, alignItems: 'center' }}
          >
            <Txt style={{ color: c.blue, fontWeight: '600', fontSize: 14 }}>
              {mode === 'login' ? 'Первый вход — активировать PIN' : 'Уже активирован — войти'}
            </Txt>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export function AuthParentTeacherLogin({ onBack, onActivatedHint }) {
  const { c } = useTheme();
  const { signInWithResponse, biometricMeta, enableBiometrics } = useAuth();
  const [tab, setTab] = useState('login'); // login | activate
  const [role, setRole] = useState('parent'); // parent | teacher | staff — only for activate
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);

  const enterWith = async (response) => {
    const next = await signInWithResponse(response);
    onActivatedHint?.(next.role);
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (tab === 'login') {
        if (!login.trim() || !password) {
          setError('Введите логин и пароль');
          setLoading(false);
          return;
        }
        res = await authApi.login(login.trim(), password);
      } else {
        if (!phone.trim() || !code.trim() || password.length < 8) {
          setError('Телефон, код активации и пароль (мин. 8 символов)');
          setLoading(false);
          return;
        }
        // Путь активации выбирает роль, а не общий эндпоинт: бэкенд проверяет роль
        // вместе с кодом, и учительский путь охране откажет (SERVICE-BE-002 §2).
        const activate = {
          teacher: authApi.activateTeacher,
          staff: authApi.activateStaff,
          parent: authApi.activateParent,
        }[role] ?? authApi.activateParent;
        res = await activate(phone.trim(), code.trim(), password);
      }
      // Роль спрашивается здесь, а не в `persistSession`: до правки отказ всплывал уже
      // после согласия на Face ID — вне try/catch, — и экран замирал на предложении
      // биометрии, ничего не сообщив. Супер-админ и исполнительские роли в приложение
      // не входят, и узнать об этом надо на кнопке «Войти».
      if (!isMobileRole(res.role)) throw new Error(ROLE_REJECTED);
      // Порядок тот же, что у ученика: сессия открывается после ответа на предложение.
      if (biometricMeta.available) setPending(res);
      else await enterWith(res);
    } catch (e) {
      setError(e.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    // Обработчики предложения биометрии живут вне `submit`, и без своего catch любой
    // отказ здесь становится непойманным промисом: экран просто остаётся на месте.
    const finish = async (enable) => {
      try {
        if (enable) await enableBiometrics();
        await enterWith(pending);
      } catch (e) {
        setPending(null);
        setError(e.message || 'Не удалось войти');
      }
    };
    return (
      <EnableBiometricsScreen
        label={biometricMeta.label}
        onEnable={() => finish(true)}
        onSkip={() => finish(false)}
      />
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScreenHeader title="Родитель / сотрудник" back={onBack} />
        <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Txt style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 31 }}>
            {tab === 'login' ? 'Вход' : 'Активация'}
          </Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8 }}>
            {tab === 'login'
              ? 'Телефон или email и пароль после активации.'
              : 'Код активации выдаёт школа. Придумайте пароль от 8 символов.'}
          </Txt>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
            {[
              { id: 'login', label: 'Вход' },
              { id: 'activate', label: 'Активация' },
            ].map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  setError(null);
                  setTab(t.id);
                }}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tab === t.id ? c.blue : c.surface2,
                }}
              >
                <Txt style={{ fontWeight: '600', color: tab === t.id ? '#fff' : c.ink2 }}>{t.label}</Txt>
              </Pressable>
            ))}
          </View>

          {tab === 'activate' ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                {[
                  { id: 'parent', label: 'Родитель' },
                  { id: 'teacher', label: 'Учитель' },
                  // Охрана и хозяйственные службы: школьного профиля у них нет, а код
                  // активации выдаётся так же (SERVICE-BE-002 §2).
                  { id: 'staff', label: 'Сотрудник' },
                ].map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => setRole(r.id)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: role === r.id ? c.green : c.border,
                      backgroundColor: role === r.id ? c.greenSoft : c.surface,
                    }}
                  >
                    <Txt
                      numberOfLines={1}
                      style={{ fontSize: 13, fontWeight: '600', color: role === r.id ? c.green : c.ink2 }}
                    >
                      {r.label}
                    </Txt>
                  </Pressable>
                ))}
              </View>
              <Field
                label={role === 'staff' ? 'Телефон или email' : 'Телефон'}
                value={phone}
                onChangeText={setPhone}
                keyboardType={role === 'staff' ? 'email-address' : 'phone-pad'}
                placeholder={role === 'staff' ? '+7… или почта' : '+7…'}
                error={error}
              />
              <Field label="Код активации" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Код из школы" error={error} />
              <Field label="Новый пароль" value={password} onChangeText={setPassword} secureTextEntry placeholder="Минимум 8 символов" error={error} />
            </>
          ) : (
            <>
              <Field
                label="Телефон или email"
                value={login}
                onChangeText={setLogin}
                keyboardType="email-address"
                placeholder="login"
                error={error}
              />
              <Field label="Пароль" value={password} onChangeText={setPassword} secureTextEntry placeholder="Пароль" error={error} />
            </>
          )}

          {error ? <Txt style={{ color: c.red, fontSize: 13, marginTop: 10 }}>{error}</Txt> : null}

          <PrimaryButton color="blue" style={{ marginTop: 24 }} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : tab === 'activate' ? 'Активировать' : 'Войти'}
          </PrimaryButton>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function EnableBiometricsScreen({ label, onEnable, onSkip }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <HexBadge size={88} fill={c.blue} icon="face" iconColor="#fff" iconSize={40} />
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
