import React from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthWelcome, AuthSignIn, AuthFaceID, AuthRolePicker } from '../screens/auth';
import { StudentApp, ParentApp, TeacherApp } from './RoleNavigators';

const Root = createNativeStackNavigator();

const ROLE_ROUTE = { student: 'StudentApp', parent: 'ParentApp', teacher: 'TeacherApp' };

function WelcomeScreen() {
  const navigation = useNavigation();
  return <AuthWelcome onContinue={() => navigation.navigate('SignIn')} />;
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
    </Root.Navigator>
  );
}
