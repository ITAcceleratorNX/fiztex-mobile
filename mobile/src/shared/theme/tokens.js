// Brand colours — matches web's tailwind brand/navy palette
// (navy #274185 is the exact logo blue; orange #f5923b is the primary CTA colour).
// Key names are kept ("green"/"blue"/"red"/"gold") so existing call sites
// (`color="green"`, `c.blue`, etc.) don't need touching — only the hues change:
// `green` is now the primary/CTA slot (orange), `blue` is the structural/brand slot (navy).
export const PHYSTECH = {
  green: '#f5923b',
  greenDeep: '#c2620f',
  blue: '#274185',
  blueDeep: '#182A5C',
  red: '#DC2626',
  redDeep: '#B91C1C',
  gold: '#EAB308',
  goldDeep: '#A16207',
};

// Font family aliases (loaded in App.js via @expo-google-fonts/onest).
export const FONT = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  extrabold: 'Onest_800ExtraBold',
};

// Long-form lesson documents share one readable measure and spacing rhythm.
export const DOCUMENT = {
  gutter: 16, gap: 16, sectionGap: 32, inset: 24, maxWidth: 720,
  titleSize: 24, titleLine: 32, headingSize: 18, headingLine: 26,
  bodySize: 16, bodyLine: 26, captionSize: 14, captionLine: 22,
};

export const FORMULA = { gap: 8, size: 20 };

export const DEMO = {
  gutter: 20, inset: 16, gap: 12, compactGap: 8, touchSize: 44,
  titleSize: 24, bodySize: 14, bodyLine: 22, roleSize: 18, borderWidth: 1,
};

// Parent comments: one typography and spacing scale for editor, feed and detail.
export const COMMENT = {
  iconSize: 14, iconStrokeWidth: 4,
  gutter: 16, inset: 12, gap: 8, radius: 12, buttonSize: 32, editorHeight: 220,
  bodySize: 14, bodyLine: 23, labelSize: 13, captionSize: 12, titleSize: 18,
  avatarSize: 20, dotSize: 6, limit: 1000,
  avatarTextSize: 10, modalMaxWidth: 560, modalInset: 24, actionGap: 12,
};

// Map a brand colour name ("green" | "blue" | "red" | "gold") to its hex.
export function brand(name) {
  return PHYSTECH[name] || PHYSTECH.green;
}

export const HISTORY = {
  gutter: 16, inset: 16, gap: 12, radius: 16, sheetRadius: 24,
  bodySize: 14, captionSize: 12, titleSize: 18, buttonSize: 44,
  maxWidth: 560, maxHeight: '85%', borderWidth: 1,
};

// Вход и заявка на доступ (Figma `Admin_Admissions`: M1–M7, A1–A5, S1–S6, коды у учителя и
// родителя). Своё у блоков — шапка со знаком и лист поверх неё, клетки PIN, значки ролей и
// итогов, шкала статуса, выданный код; поля, кнопки и заголовки берутся из `TextField`,
// `PrimaryButton` и `ScreenHeader`. Поля стоят на отступе 16, как заголовок `ScreenHeader`:
// макетные 20 развели бы их по вертикали.
//
// Выданный код и маска вместо него стоят в строке одной высоты (`codeLine`): иначе карточка
// прыгала бы на «Выдать код» и «Скрыть».
//
// Шапка M1 — как в кадре 2460:1002 и в конце видео первого запуска: под статус-баром видно
// 163 pt синего (`heroHeight − sheetOverlap`), знак высотой 48 pt по её центру. Анимация
// запуска приводит знак и лист ровно сюда, так что расхождение было бы видно скачком.
export const AUTH = {
  gutter: 16, gap: 16, sectionGap: 24, captionGap: 6,
  heroHeight: 191, logoHeight: 48, sheetRadius: 28, sheetOverlap: 28,
  titleSize: 30, titleLine: 36, bodySize: 15, bodyLine: 22,
  captionSize: 13, captionLine: 18, valueSize: 17, codeSpacing: 1.5, iconSize: 16,
  pinCellWidth: 52, pinCellHeight: 60, pinCellRadius: 14, pinGap: 12, pinDot: 12,
  badgeSize: 36, badgeRadius: 10, markSize: 64, markIconSize: 30,
  numberSize: 34, stepDot: 20, stepLine: 2, avatarSize: 40,
  codeSize: 28, codeLine: 36, codeTracking: 3, maskSize: 20, maskTracking: 6, heroAvatar: 52,
};

// Запуск приложения (заметки дизайнера рядом с M1 и кадр «Повторный запуск» 2468:22): знак по
// центру тёмно-синего экрана, 279×72 pt — как в видео дизайнера на экране 390 pt. В конце
// первого запуска он уезжает в шапку M1 и становится `AUTH.logoHeight`.
export const LAUNCH = { logoHeight: 72 };
