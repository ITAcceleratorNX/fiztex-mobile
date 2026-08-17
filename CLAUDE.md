# fiztex-mobile

Приложение для трёх ролей (ученик / родитель / учитель). Expo SDK 54,
React Native 0.81, React Navigation 7. Чистый JS, без TypeScript.

```bash
cd mobile && npx expo start        # a — Android, i — iOS, w — web
```

Бэк должен быть поднят (см. корневой `CLAUDE.md`). Базовый URL API вычисляется
в `src/shared/api/config.js`: `EXPO_PUBLIC_API_URL` → LAN-хост Metro →
`10.0.2.2:8080` (эмулятор Android) / `localhost:8080`. На реальном устройстве
через Expo Go ничего настраивать не нужно.

## Что где

| Путь | Что |
|---|---|
| `mobile/` | **реальное приложение** — только здесь пишется код |
| `app/*.jsx`, `Tamos App*.html` | HTML-прототип «Tamos App» — **макет**, источник дизайна |
| `export/` | копия прототипа, не трогать |

Экраны прототипа: `app/screens-student.jsx` (1440 строк), `screens-teacher.jsx`,
`screens-parent.jsx`, `screens-auth.jsx`; дизайн-система прототипа — `app/ds.jsx`.
Это референс вёрстки, а не код для копирования: в RN нет CSS, компоненты берутся
из `mobile/src/shared`.

## Структура приложения

```
mobile/src/
  app/navigation/     RootNavigator, RoleNavigators, CustomTabBar
  features/<роль>/    screens/ — экраны роли (auth, student, parent, teacher,
                      schedule, entrance, journey, notifications)
  shared/api/         client.js (fetch + 401 + таймаут), config.js, *Api.js
  shared/components/  дизайн-система: ui.js, Icon, Hex, Txt, Screen, Grad
  shared/ui/          rows.js
  shared/theme/       tokens.js (PHYSTECH, FONT, brand()), ThemeContext (light/dark)
  shared/state/       AppState.js
  shared/math/        MathText (формулы: WebView + KaTeX), katexAsset.js — генерируется
  shared/data/mock.js демо-данные — при подключении реального API убирать
```

## Правила

**Контракт API.** Эндпоинты искать грепом по `fiztex-back/docs/api-map.md`,
детали — `jq` по `fiztex-back/docs/openapi.json`. В Java-контроллеры за формой
запроса/ответа не ходить. Сгенерированные TS-типы (`fiztex-web/src/lib/api-types.ts`)
здесь не подключены — это JS-проект, но как справочник по полям они точнее мока.

**Запросы.** Новый вызов — метод в соответствующем `src/shared/api/*Api.js`
через `request()` из `client.js`. `fetch` в экранах не писать. Токен приходит
из `features/auth/AuthContext`.

**Дизайн-система.** Экран собирается из `shared/components/ui.js`
(`Card`, `Pill`, `PrimaryButton`, `CircleButton`, `ScreenHeader`, `SectionTitle`,
`Avatar`, `AppHeader`) и `shared/ui/rows.js`. Нет нужного компонента — сначала
завести его в `shared/`, потом собирать экран.

**Цвета и шрифты.** Только из `shared/theme/tokens.js` и `useTheme()`. Хардкод
hex в экранах не заводить. Имена слотов исторические: `green` — оранжевый CTA
`#f5923b`, `blue` — фирменный navy `#274185`.

**Формулы.** Текст вопроса и вариантов ответа может содержать `$…$` — выводить только через
`MathText` из `shared/math`, иначе ученик увидит разметку. Формулы рисует KaTeX внутри
`WebView`; страница с библиотекой и шрифтами лежит в бандле и пересобирается после
обновления katex:

```bash
cd mobile && node scripts/build-katex-asset.mjs
```

Контракт разметки — `fiztex-back/docs/formula-contract.md`.

**Мок → API.** `shared/data/mock.js` — временные данные прототипа. Экран
считается готовым, когда данные идут с бэка, а не из мока.

**Посещаемость учителя.** Лист урока — экран `attendance` в стеке учителя
(`features/attendance`), вход с плитки на карточке урока. Просмотр и правка — один
экран в двух режимах, как в макете. Вся логика отметки (какие сочетания
`status`/`mark`/`reason` допустимы, что чистится при смене статуса, что уходит в
`PATCH`) живёт в `shared/api/attendanceMap.js`, состояние и команды — в
`useAttendanceEditor`. Экран не вычисляет, можно ли заполнять и публиковать:
`canFill`/`canPublish`/`reminder` приходят с бэка посчитанными. Контракт экрана —
`.cursor/tasks/attendance/screens/AttendanceScreen.md`, проверка логики —
`node scripts/verify-attendance-logic.cjs [ответ /attendance]`.

**Посещаемость ученика.** Чип на карточке урока (`AttendanceBadge` в `shared/ui/rows.js`)
рисуется из `GET /api/attendance/my-marks?dateFrom&dateTo` — один запрос на неделю,
хук `useMyAttendanceMarks`. Трёхчастную модель бэка (`status` + `mark` + `reason`)
в плоский чип схлопывает `shared/api/attendanceMap.js`, и только он: правило
«опоздание — это посещение, освобождение — не пропуск» живёт в одном месте, иначе
экраны разойдутся с цифрами месячной сводки. Чипа нет, когда отметки нет — включая
неопубликованный черновик учителя и отменённый урок. Контракт —
`fiztex-back/docs/attendance-read-contract.md`.
