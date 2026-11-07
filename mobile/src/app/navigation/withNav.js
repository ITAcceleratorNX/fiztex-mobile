import React, { useMemo, useCallback } from 'react';
import { useNavigation, useRoute, CommonActions, StackActions } from '@react-navigation/native';
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
  /**
   * Вернуться к вкладкам из экрана стека (центр уведомлений, шаг формы) и открыть нужную.
   *
   * `popTo`, а не `navigate`: в React Navigation 7 `navigate` больше **не** возвращается к
   * экрану, который уже лежит в стеке, — он кладёт сверху второй (в 6 возвращался, и код
   * написан был под него). Из центра уведомлений переход на «Главную» поэтому оставлял под
   * ней и сам центр: «назад» вело обратно в уведомления, а стек рос с каждым нажатием.
   *
   * `popTo` разбирает все три случая сам: вкладки ниже в стеке — вернуться к ним и закрыть
   * всё над ними; вкладки и есть текущий экран — остаться, сменив вкладку; вкладок в стеке
   * нет — заменить текущий экран, а не добавить. Со вкладки действие не обрабатывается её
   * навигатором и всплывает в стек, где `Tabs` и живёт.
   */
  nav.tabs = (screen, payload) => navigation.dispatch(StackActions.popTo('Tabs', {
    screen,
    params: payload !== undefined ? { payload } : undefined,
  }));
  /**
   * Уйти на экран, не оставляя текущий в стеке.
   *
   * Нужно там, где возвращаться к пройденному шагу бессмысленно: после создания заявки
   * открывается её карточка, и «назад» с неё обязано вести в список, а не к форме с
   * полями уже созданной заявки.
   */
  nav.replace = (screen, payload) =>
    navigation.dispatch(StackActions.replace(screen, payload !== undefined ? { payload } : undefined));
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
        CommonActions.reset({ index: 0, routes: [{ name: 'SignIn' }] }),
      );
    }, [navigation, signOut]);
    return <Component {...props} nav={nav} payload={route.params?.payload} onSignOut={onSignOut} />;
  }
  Wrapped.displayName = `withNav(${Component.displayName || Component.name || 'Screen'})`;
  return Wrapped;
}
