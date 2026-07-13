# fiztex — мобильное приложение (React Native + Expo)

Перенос веб-прототипа fiztex на React Native. Сборщик — Metro (встроен в Expo).
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
    theme/tokens.js           бренд-цвета Fiztex
    theme/ThemeContext.js     light/dark палитры (замена CSS-переменных), useTheme()
    data/mock.js              демо-данные (расписание, предметы, кружки, ивенты и т.д.)
    state/AppState.js         глобальное состояние прототипа (ДЗ, кружки, звёзды, тосты)
    components/               дизайн-система (Hex, Icon, Card, Pill, Avatar, кнопки, шапки)
    navigation/               RootNavigator + вкладки и стеки по ролям
    screens/                  экраны: auth / student / parent / teacher
    features/entrance/        вступительные тесты (код → тест → результат)
```

## Вступительные тесты

На welcome-экране кнопка **«Вступительный тест»**. Flow (API `/api/admissions/*`):

1. Ввод персонального кода → `POST /api/admissions/access-code/verify`
2. Подтверждение ФИО («Это я» / «Данные неверные»)
3. Список назначенных тестов → выбор → экран инструкции
4. «Начать тест» → `POST /api/admissions/attempts/start` (таймер стартует здесь)
5. Прохождение: автосейв, фото с камеры, таймер с бэка, античит-события
6. Экран «завершено» — без баллов (результат после проверки школой)
7. «Посмотреть результат» — только когда бэкенд выставил `OPEN_FOR_VIEWING`

Сессия (токен + attemptId) хранится в AsyncStorage — resume после перезапуска приложения.

Бэкенд по умолчанию: `http://localhost:8080` (iOS) / `http://10.0.2.2:8080` (Android).
Переопределение: `EXPO_PUBLIC_API_URL=http://192.168.x.x:8080`.

Перед тестом запустите бэкенд: `cd fiztex-back && ./gradlew bootRun`.

## Темы

Светлая/тёмная тема следует системной по умолчанию; переключатель — в профиле любой роли.

## Заметки по переносу

- Веб-примитивы (`div`/`span`/`svg`) переписаны на `View`/`Text`/`react-native-svg`.
- CSS-переменные заменены палитрой темы через `useTheme()`.
- Градиенты — `expo-linear-gradient`. Шрифт Onest — `@expo-google-fonts/onest`.
- Кастомная стековая навигация прототипа отображена на React Navigation.
