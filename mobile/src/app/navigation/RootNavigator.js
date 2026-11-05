import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation, CommonActions, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  AuthWelcome,
  AuthSignIn,
  AuthSecret,
  AuthPinSetup,
  AuthRecovery,
  AuthSchoolCode,
  AuthNewPassword,
  AuthFaceID,
  useAuth,
} from '@features/auth';
import { EntranceFlow } from '@features/entrance';
import {
  AccessRequestStart, AccessRequestForm, AccessRequestSent, AccessRequestStatus,
} from '@features/access';
import { useTheme } from '@shared/theme/ThemeContext';
import { ScreenTopInsetContext } from '@shared/components/Screen';
import { DemoRolesScreen, DemoToolbar } from '@features/demo/DemoScreens';
import {
  StudentApp, ParentApp, TeacherApp, StaffApp, SecurityApp, SuperAdminApp, PsychologistApp,
} from './RoleNavigators';

const Root = createNativeStackNavigator();

// Администратор, клининг и техслужба используют общий навигатор сервисных заявок.
// Для охраны выделен SecurityApp: её основной рабочий контур — ключи, а сервисные
// заявки остаются доступны как detail/deep-link экраны.
const ROLE_ROUTE = {
  STUDENT: 'StudentApp',
  PARENT: 'ParentApp',
  TEACHER: 'TeacherApp',
  ADMIN: 'StaffApp',
  SECURITY: 'SecurityApp',
  // Super Admin входит ради одного раздела — техники и инвентаря (ТЗ §9). Остальное он
  // делает в панели, и повторять её в телефоне задача не просила.
  SUPER_ADMIN: 'SuperAdminApp',
  CLEANING: 'StaffApp',
  TECHNICIAN: 'StaffApp',
  // Свой навигатор, а не StaffApp: у психолога нет сервисных заявок, которые и есть
  // содержимое StaffApp — делить с ним экраны значило бы показать пустую вкладку заявок.
  PSYCHOLOGIST: 'PsychologistApp',
};

/** Раздел приложения роли — туда ведёт вход и туда же переходы по push-уведомлениям. */
export function rootRouteForRole(role) {
  return ROLE_ROUTE[role] || null;
}

function BootSplash() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator color={c.green} />
    </View>
  );
}

function resetTo(navigation, name) {
  navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
}

function WelcomeScreen() {
  const navigation = useNavigation();
  return (
    <AuthWelcome
      onContinue={() => navigation.navigate('SignIn')}
      onEntrance={() => navigation.navigate('EntranceFlow')}
      onDemo={() => navigation.navigate('DemoRoles')}
      onApply={() => navigation.navigate('AccessRequest')}
    />
  );
}

/**
 * Куда ведёт открытая сессия: на смену временного пароля (M7), пока стоит отметка, иначе —
 * в раздел роли.
 */
function entryRoute(profile) {
  return profile?.mustChangePassword ? 'NewPassword' : ROLE_ROUTE[profile?.role] || 'Welcome';
}

/**
 * Логин, который стоит передать на восстановление: телефон или почта пригодятся активации по
 * коду от школы, а персональный код ученика там не нужен.
 */
function recoveryLogin({ kind, login }) {
  return kind === 'phone' || kind === 'email' ? login : undefined;
}

// Вход для всех ролей (AUTH-FE-001, M1–M7). После входа экраны никуда не переходят сами —
// стек к открытой сессии приводит `SessionRouteGuard`.
function SignInScreen() {
  const navigation = useNavigation();
  const { biometricsEnabled, needsBiometricUnlock, biometricMeta } = useAuth();
  return (
    <AuthSignIn
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      onContinue={({ kind, login }) => navigation.navigate('SignInSecret', { kind, login })}
      onForgot={(classified) => navigation.navigate('Recovery', { login: recoveryLogin(classified) })}
      canUseFaceId={biometricsEnabled || needsBiometricUnlock}
      biometricLabel={biometricMeta?.label}
      onFaceId={() => navigation.navigate('FaceID')}
      onApply={() => navigation.navigate('AccessRequest')}
      onRequestStatus={() => navigation.navigate('AccessRequestStatus')}
    />
  );
}

function SignInSecretScreen({ route }) {
  const navigation = useNavigation();
  const { kind, login } = route.params;
  return (
    <AuthSecret
      kind={kind}
      login={login}
      onBack={() => navigation.goBack()}
      onForgot={() => navigation.navigate('Recovery', { login: recoveryLogin({ kind, login }) })}
      onCreatePin={() => navigation.navigate('PinSetup', { code: login })}
    />
  );
}

function PinSetupScreen({ route }) {
  const navigation = useNavigation();
  return (
    <AuthPinSetup
      code={route.params.code}
      onBack={() => navigation.goBack()}
      onEditCode={() => navigation.popTo('SignIn')}
    />
  );
}

function RecoveryScreen({ route }) {
  const navigation = useNavigation();
  return (
    <AuthRecovery
      onBack={() => navigation.goBack()}
      onCode={(code) => navigation.navigate('SchoolCode', { code, login: route.params?.login })}
    />
  );
}

function SchoolCodeScreen({ route }) {
  const navigation = useNavigation();
  return (
    <AuthSchoolCode
      code={route.params.code}
      login={route.params.login}
      onBack={() => navigation.goBack()}
    />
  );
}

// Заявка на доступ и её статус (AUTH-FE-001, A1–A5, S1–S6). Поток открывают со входа или с
// приветствия, а «Готово» возвращает туда, откуда его открыли.
const REQUEST_ROUTES = new Set(['AccessRequest', 'AccessRequestForm', 'AccessRequestSent', 'AccessRequestStatus']);

function leaveRequestFlow(navigation) {
  const state = navigation.getState();
  const first = state.routes.findIndex((route) => REQUEST_ROUTES.has(route.name));
  if (first > 0) navigation.dispatch(StackActions.pop(state.index - first + 1));
  else resetTo(navigation, 'Welcome');
}

function AccessRequestStartScreen() {
  const navigation = useNavigation();
  return (
    <AccessRequestStart
      onBack={() => navigation.goBack()}
      onRole={(role) => navigation.navigate('AccessRequestForm', { role, mode: 'new' })}
      onStatus={() => navigation.navigate('AccessRequestStatus')}
    />
  );
}

function AccessRequestFormScreen({ route }) {
  const navigation = useNavigation();
  const { role, mode, prefill } = route.params;
  return (
    <AccessRequestForm
      role={role}
      mode={mode}
      prefill={prefill}
      onBack={() => navigation.goBack()}
      // Отправленная форма уходит из стека: «назад» с итога не должен открывать её снова.
      onSent={(ticket) => navigation.replace('AccessRequestSent', { requestId: ticket.requestId })}
    />
  );
}

function AccessRequestSentScreen({ route }) {
  const navigation = useNavigation();
  return <AccessRequestSent requestId={route.params?.requestId} onDone={() => leaveRequestFlow(navigation)} />;
}

function AccessRequestStatusScreen() {
  const navigation = useNavigation();
  return (
    <AccessRequestStatus
      onBack={() => navigation.goBack()}
      onSignIn={() => navigation.popTo('SignIn')}
      onRecovery={() => navigation.navigate('Recovery', {})}
      onApply={() => navigation.navigate('AccessRequest')}
      onContinue={(status, mode) => navigation.navigate('AccessRequestForm', { role: status.role, mode, prefill: status })}
    />
  );
}

function FaceIDScreen() {
  const navigation = useNavigation();
  const { profile } = useAuth();
  return (
    <AuthFaceID
      // При запертой сессии Face ID — стартовый экран, и «назад» с него вести некуда:
      // `goBack()` там молча ничего не делает, и выйти на вход по паролю нельзя вовсе.
      // Отказ биометрии (палец не читается, Face ID сброшен) превращался в тупик, из
      // которого помогала только повторная попытка распознавания.
      onBack={() =>
        navigation.canGoBack() ? navigation.goBack() : resetTo(navigation, 'SignIn')}
      onSuccess={() => resetTo(navigation, entryRoute(profile))}
    />
  );
}

const PROTECTED_ROUTES = new Set([...Object.values(ROLE_ROUTE), 'NewPassword']);

/**
 * Держит стек навигации в согласии с сессией: вошли — раздел роли, вошли временным паролем
 * или сервер ответил `PASSWORD_CHANGE_REQUIRED` — смена пароля (M7), вышли или сессия
 * истекла — приветствие.
 *
 * Сам навигатор этого не делает. Смена `initialRouteName` его пересобирает, но контейнер
 * восстанавливает прежний стек: вошедший оставался бы на шаге входа, вышедший — в разделе
 * роли с пустыми данными. А сброс, отправленный экраном в тот же момент, теряется вместе со
 * старым навигатором — так «Выйти» в профиле срабатывал только со второго нажатия. Поэтому
 * сброс делается здесь, после отрисовки, через ref контейнера. Рендерится рядом с
 * навигатором, как мост push-уведомлений.
 *
 * Демо и запертую сессию не трогает: демо пересоздаёт контейнер целиком, а с Face ID человек
 * вправе уйти на вход по паролю.
 */
export function SessionRouteGuard({ navigationRef }) {
  const {
    bootstrapping, isDemo, token, needsBiometricUnlock, needsPasswordChange, isAuthenticated, role,
  } = useAuth();
  let target;
  if (bootstrapping || isDemo || needsBiometricUnlock) target = undefined;
  else if (needsPasswordChange) target = 'NewPassword';
  else if (isAuthenticated) target = ROLE_ROUTE[role];
  else if (!token) target = null;

  useEffect(() => {
    if (target === undefined || !navigationRef.isReady()) return;
    const state = navigationRef.getRootState();
    const current = state?.routes?.[state.index]?.name;
    // Без сессии уводим только из закрытых разделов: шаги входа, демо и вступительный тест
    // живут без неё.
    const next = target ?? (PROTECTED_ROUTES.has(current) ? 'Welcome' : null);
    if (next && next !== current) {
      navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: next }] }));
    }
  }, [target, navigationRef]);
  return null;
}

function EntranceFlowRoute() {
  const navigation = useNavigation();
  return (
    <EntranceFlow onExit={() => resetTo(navigation, 'Welcome')} />
  );
}

export function RootNavigator() {
  const {
    bootstrapping, isAuthenticated, needsBiometricUnlock, needsPasswordChange, role, isDemo, token,
  } = useAuth();

  if (bootstrapping) return <BootSplash />;

  // Временный пароль (M7) идёт после биометрии и раньше раздела роли: сервер до смены
  // отвечает 403 на всё, кроме смены и выхода, и раздел встретил бы человека ошибками.
  const initialRouteName = needsBiometricUnlock
    ? 'FaceID'
    : needsPasswordChange
      ? 'NewPassword'
      : isAuthenticated && ROLE_ROUTE[role]
        ? ROLE_ROUTE[role]
        : 'Welcome';

  return (
    <View style={{ flex: 1 }}>
      {isDemo ? <DemoToolbar /> : null}
      <ScreenTopInsetContext.Provider value={isDemo ? 0 : null}>
        <Root.Navigator
          key={`${initialRouteName}:${isDemo ? token : 'real'}`}
          initialRouteName={initialRouteName}
          screenOptions={{ headerShown: false }}
        >
          <Root.Screen name="Welcome" component={WelcomeScreen} />
          <Root.Screen name="DemoRoles" component={DemoRolesScreen} />
          <Root.Screen name="SignIn" component={SignInScreen} />
          <Root.Screen name="SignInSecret" component={SignInSecretScreen} />
          <Root.Screen name="PinSetup" component={PinSetupScreen} />
          <Root.Screen name="Recovery" component={RecoveryScreen} />
          <Root.Screen name="SchoolCode" component={SchoolCodeScreen} />
          <Root.Screen name="NewPassword" component={AuthNewPassword} />
          <Root.Screen name="AccessRequest" component={AccessRequestStartScreen} />
          <Root.Screen name="AccessRequestForm" component={AccessRequestFormScreen} />
          <Root.Screen name="AccessRequestSent" component={AccessRequestSentScreen} />
          <Root.Screen name="AccessRequestStatus" component={AccessRequestStatusScreen} />
          <Root.Screen name="FaceID" component={FaceIDScreen} />
          <Root.Screen name="StudentApp" component={StudentApp} />
          <Root.Screen name="ParentApp" component={ParentApp} />
          <Root.Screen name="TeacherApp" component={TeacherApp} />
          <Root.Screen name="StaffApp" component={StaffApp} />
          <Root.Screen name="SecurityApp" component={SecurityApp} />
          <Root.Screen name="SuperAdminApp" component={SuperAdminApp} />
          <Root.Screen name="PsychologistApp" component={PsychologistApp} />
          <Root.Screen name="EntranceFlow" component={EntranceFlowRoute} />
        </Root.Navigator>
      </ScreenTopInsetContext.Provider>
    </View>
  );
}
