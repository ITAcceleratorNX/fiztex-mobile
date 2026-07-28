import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  AuthWelcome,
  AuthSignIn,
  AuthFaceID,
  AuthStudentLogin,
  AuthParentTeacherLogin,
  useAuth,
} from '@features/auth';
import { EntranceFlow } from '@features/entrance';
import { useTheme } from '@shared/theme/ThemeContext';
import { StudentApp, ParentApp, TeacherApp } from './RoleNavigators';

const Root = createNativeStackNavigator();

const ROLE_ROUTE = {
  STUDENT: 'StudentApp',
  PARENT: 'ParentApp',
  TEACHER: 'TeacherApp',
};

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
    />
  );
}

function SignInScreen() {
  const navigation = useNavigation();
  const { biometricsEnabled, needsBiometricUnlock, biometricMeta } = useAuth();
  return (
    <AuthSignIn
      onBack={() => navigation.goBack()}
      onStudent={() => navigation.navigate('StudentLogin')}
      onParentTeacher={() => navigation.navigate('ParentTeacherLogin')}
      canUseFaceId={biometricsEnabled || needsBiometricUnlock}
      biometricLabel={biometricMeta?.label}
      onFaceId={() => navigation.navigate('FaceID')}
    />
  );
}

function StudentLoginScreen() {
  const navigation = useNavigation();
  return (
    <AuthStudentLogin
      onBack={() => navigation.goBack()}
      onActivatedHint={(role) => resetTo(navigation, ROLE_ROUTE[role] || 'StudentApp')}
    />
  );
}

function ParentTeacherLoginScreen() {
  const navigation = useNavigation();
  return (
    <AuthParentTeacherLogin
      onBack={() => navigation.goBack()}
      onActivatedHint={(role) => resetTo(navigation, ROLE_ROUTE[role] || 'ParentApp')}
    />
  );
}

function FaceIDScreen() {
  const navigation = useNavigation();
  const { role } = useAuth();
  return (
    <AuthFaceID
      onBack={() => navigation.goBack()}
      onSuccess={() => resetTo(navigation, ROLE_ROUTE[role] || 'StudentApp')}
    />
  );
}

function EntranceFlowRoute() {
  const navigation = useNavigation();
  return (
    <EntranceFlow onExit={() => resetTo(navigation, 'Welcome')} />
  );
}

export function RootNavigator() {
  const { bootstrapping, isAuthenticated, needsBiometricUnlock, role } = useAuth();

  if (bootstrapping) return <BootSplash />;

  const initialRouteName = needsBiometricUnlock
    ? 'FaceID'
    : isAuthenticated && ROLE_ROUTE[role]
      ? ROLE_ROUTE[role]
      : 'Welcome';

  return (
    <Root.Navigator
      key={initialRouteName}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Root.Screen name="Welcome" component={WelcomeScreen} />
      <Root.Screen name="SignIn" component={SignInScreen} />
      <Root.Screen name="StudentLogin" component={StudentLoginScreen} />
      <Root.Screen name="ParentTeacherLogin" component={ParentTeacherLoginScreen} />
      <Root.Screen name="FaceID" component={FaceIDScreen} />
      <Root.Screen name="StudentApp" component={StudentApp} />
      <Root.Screen name="ParentApp" component={ParentApp} />
      <Root.Screen name="TeacherApp" component={TeacherApp} />
      <Root.Screen name="EntranceFlow" component={EntranceFlowRoute} />
    </Root.Navigator>
  );
}
