import React from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthWelcome, AuthSignIn, AuthFaceID, AuthRolePicker } from '@features/auth';
import {
  EntranceCodeScreen,
  EntranceConfirmScreen,
  EntranceTestScreen,
  EntranceDoneScreen,
  EntranceResultScreen,
} from '@features/entrance';
import { StudentApp, ParentApp, TeacherApp } from './RoleNavigators';

const Root = createNativeStackNavigator();

const ROLE_ROUTE = { student: 'StudentApp', parent: 'ParentApp', teacher: 'TeacherApp' };

function WelcomeScreen() {
  const navigation = useNavigation();
  return (
    <AuthWelcome
      onContinue={() => navigation.navigate('SignIn')}
      onEntrance={() => navigation.navigate('EntranceCode')}
    />
  );
}

function SignInScreen() {
  const navigation = useNavigation();
  return <AuthSignIn onBack={() => navigation.goBack()} onRole={() => navigation.navigate('FaceID')} />;
}

function FaceIDScreen() {
  const navigation = useNavigation();
  return <AuthFaceID onBack={() => navigation.goBack()} onSuccess={() => navigation.navigate('RolePicker')} />;
}

function RolePickerScreen() {
  const navigation = useNavigation();
  const pick = (role) =>
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: ROLE_ROUTE[role] || 'StudentApp' }] }));
  return <AuthRolePicker onBack={() => navigation.goBack()} onPick={pick} />;
}

function EntranceCodeRoute() {
  const navigation = useNavigation();
  return (
    <EntranceCodeScreen
      onBack={() => navigation.goBack()}
      onSuccess={() => navigation.navigate('EntranceConfirm')}
    />
  );
}

function EntranceConfirmRoute() {
  const navigation = useNavigation();
  return (
    <EntranceConfirmScreen
      onBack={() => navigation.navigate('EntranceCode')}
      onStart={() => navigation.navigate('EntranceTest')}
    />
  );
}

function EntranceTestRoute() {
  const navigation = useNavigation();
  return <EntranceTestScreen onDone={() => navigation.navigate('EntranceDone')} />;
}

function EntranceDoneRoute() {
  const navigation = useNavigation();
  return (
    <EntranceDoneScreen
      onResult={() => navigation.navigate('EntranceResult')}
      onHome={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }))}
    />
  );
}

function EntranceResultRoute() {
  const navigation = useNavigation();
  return <EntranceResultScreen onBack={() => navigation.goBack()} />;
}

export function RootNavigator() {
  return (
    <Root.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
      <Root.Screen name="Welcome" component={WelcomeScreen} />
      <Root.Screen name="SignIn" component={SignInScreen} />
      <Root.Screen name="FaceID" component={FaceIDScreen} />
      <Root.Screen name="RolePicker" component={RolePickerScreen} />
      <Root.Screen name="StudentApp" component={StudentApp} />
      <Root.Screen name="ParentApp" component={ParentApp} />
      <Root.Screen name="TeacherApp" component={TeacherApp} />
      <Root.Screen name="EntranceCode" component={EntranceCodeRoute} />
      <Root.Screen name="EntranceConfirm" component={EntranceConfirmRoute} />
      <Root.Screen name="EntranceTest" component={EntranceTestRoute} />
      <Root.Screen name="EntranceDone" component={EntranceDoneRoute} />
      <Root.Screen name="EntranceResult" component={EntranceResultRoute} />
    </Root.Navigator>
  );
}
