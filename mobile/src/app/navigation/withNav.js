import React, { useMemo, useCallback } from 'react';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';

function rootOf(navigation) {
  let n = navigation;
  while (n.getParent()) n = n.getParent();
  return n;
}

export function makeNav(navigation) {
  const nav = (screen, payload) =>
    navigation.navigate(screen, payload !== undefined ? { payload } : undefined);
  nav.back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('home');
  };
  nav.reset = (screen) => navigation.navigate(screen);
  return nav;
}

export function withNav(Component) {
  function Wrapped(props) {
    const navigation = useNavigation();
    const route = useRoute();
    const { signOut } = useAuth();
    const nav = useMemo(() => makeNav(navigation), [navigation]);
    const onSignOut = useCallback(async () => {
      await signOut();
      rootOf(navigation).dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }),
      );
    }, [navigation, signOut]);
    return <Component {...props} nav={nav} payload={route.params?.payload} onSignOut={onSignOut} />;
  }
  Wrapped.displayName = `withNav(${Component.displayName || Component.name || 'Screen'})`;
  return Wrapped;
}
