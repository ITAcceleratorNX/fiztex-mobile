# Tamos Education — мобильное приложение (React Native + Expo)

Перенос веб-прототипа Tamos Education на React Native. Сборщик — Metro (встроен в Expo).
Три роли: ученик, родитель, учитель. Навигация — React Navigation (стек авторизации + вкладки по роли).

## Требования

- Node.js 18+ и npm
- Приложение **Expo Go** на телефоне (App Store / Google Play), либо эмулятор Android (Android Studio) / симулятор iOS (Xcode, только macOS)

## Установка и запуск

```bash
cd mobile
npm install
npx expo start
```

Если при старте Expo сообщает о несовпадении версий пакетов с текущим SDK, выровняйте их одной командой:

```bash
npx expo install --fix
```

После `npx expo start`:

- отсканируйте QR-код камерой (iOS) или из приложения Expo Go (Android);
- либо нажмите `a` — запуск в Android-эмуляторе, `i` — в iOS-симуляторе, `w` — в браузере.

## Структура

```
mobile/
  App.js                      точка входа: шрифты + темы + состояние + навигация
  src/
    theme/tokens.js           бренд-цвета Tamos
    theme/ThemeContext.js     light/dark палитры (замена CSS-переменных), useTheme()
    data/mock.js              демо-данные (расписание, предметы, кружки, ивенты и т.д.)
    state/AppState.js         глобальное состояние прототипа (ДЗ, кружки, звёзды, тосты)
    components/               дизайн-система (Hex, Icon, Card, Pill, Avatar, кнопки, шапки)
    navigation/               RootNavigator + вкладки и стеки по ролям
    screens/                  экраны: auth / student / parent / teacher
```

## Темы

Светлая/тёмная тема следует системной по умолчанию; переключатель — в профиле любой роли.

## Заметки по переносу

- Веб-примитивы (`div`/`span`/`svg`) переписаны на `View`/`Text`/`react-native-svg`.
- CSS-переменные заменены палитрой темы через `useTheme()`.
- Градиенты — `expo-linear-gradient`. Шрифт Onest — `@expo-google-fonts/onest`.
- Кастомная стековая навигация прототипа отображена на React Navigation.
```
