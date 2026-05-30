import React, { useMemo, useCallback } from 'react';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';

// Climb to the root navigator (the auth/role stack).
function rootOf(navigation) {
  let n = navigation;
  while (n.getParent()) n = n.getParent();
  return n;
}

// Recreates the prototype's `nav(screen, payload)` / `nav.back()` / `nav.reset()`
// API on top of React Navigation, so ported screens work unchanged.
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

// Injects `nav`, `payload`, and `onSignOut` into a ported screen component.
export function withNav(Component) {
  function Wrapped(props) {
    const navigation = useNavigation();
    const route = useRoute();
    const nav = useMemo(() => makeNav(navigation), [navigation]);
    const onSignOut = useCallback(() => {
      rootOf(navigation).dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] })
      );
    }, [navigation]);
    return <Component {...props} nav={nav} payload={route.params?.payload} onSignOut={onSignOut} />;
  }
  Wrapped.displayName = `withNav(${Component.displayName || Component.name || 'Screen'})`;
  return Wrapped;
}
