import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PHYSTECH } from './tokens';

// Light + dark palettes — matches web's slate-based admin/entrance UI
// (slate-50 background, white surfaces, slate-900/500 ink, slate-200 borders).
// Brand colours are merged in so screens can read `c.green`, `c.goldDeep`, etc.
// Шапка карточки урока — всегда фирменный navy, в обеих темах одна и та же подложка.
// Поэтому цвета поверх неё тоже одинаковые: если бы они «переключались» вместе с темой,
// в тёмной теме белый текст поехал бы на светлый, а фон под ним остался бы синим.
const hero = {
  // Подложка шапки карточки урока. У ученика она фирменная navy, у родителя —
  // оранжевая (Figma «Родитель — полный экран»): роль видно по цвету, ещё до чтения.
  heroBg: '#274185',
  heroBgParent: '#FB923C',
  heroInk: '#FFFFFF',
  heroInkSoft: 'rgba(255,255,255,0.82)',
  heroSurface: 'rgba(255,255,255,0.09)',
  heroChipBg: '#E2E8F0',
  heroChipInk: '#64748B',
  // Фирменные знаки на подложке (Figma `ЛОГО`, node 2077:918): на navy — заливка
  // #88A7F9 с прозрачностью 3%, на оранжевой — белая с 6%. Альфа задаётся не в цвете,
  // а прозрачностью слоя знаков — так значение читается ровно как в макете
  // (fill + fill-opacity).
  heroWatermark: '#88A7F9',
  heroWatermarkOpacity: 0.03,
  heroWatermarkParent: '#FFFFFF',
  heroWatermarkParentOpacity: 0.06,
};

// Недельная сетка (Figma «Расписание – Сетка», node 2085:9402). Значения сняты
// пиксель-в-пиксель из макета: линии таблицы там свой серый (#E5E7EB), а не
// общий `border`, а точки-маркеры — свои акценты, а не brand-палитра.
// Точки одинаковы в обеих темах: это статус, а не оформление.
const grid = {
  gridLine: '#E5E7EB',
  gridToday: '#EDF1F8',
  gridOff: '#F5F6F9',
  dotNow: '#FB923C',
  dotSubstitute: '#FF3B30',
};

const gridDark = {
  gridLine: '#2E3D57',
  gridToday: '#1B2745',
  gridOff: '#182338',
  dotNow: '#FB923C',
  dotSubstitute: '#FF453A',
};

// Чип посещаемости на карточке урока (Figma «Посещаемость – Смешанный день»,
// node 2086:9882). Заливка одна на обе темы — она полупрозрачная и ложится и на
// белую карточку, и на тёмную; меняется только контур и текст, иначе на тёмном
// фоне #16A34A читался бы как грязное пятно.
//
// «Освобождён» в макете не нарисован: бэк считает освобождение отдельно от
// пропусков (attendance-read-contract §8), и красный чип «Пропустил» на нём
// расходился бы с цифрами месячной сводки. Взят фирменный navy — тот же, что у
// статуса «Следующий», с заливкой из семейства чипов (12 %).
const attendance = {
  attPresentTint: 'rgba(34,197,94,0.12)',
  attLateTint: 'rgba(245,158,11,0.12)',
  attAbsentTint: 'rgba(239,68,68,0.12)',
  attExcusedTint: 'rgba(39,65,133,0.12)',
};

const attendanceInk = {
  attPresentInk: '#16A34A',
  attLateInk: '#FB923C',
  attAbsentInk: '#DC2626',
  attExcusedInk: '#274185',
};

const attendanceInkDark = {
  attPresentInk: '#4ADE80',
  attLateInk: '#FBBF6C',
  attAbsentInk: '#F87171',
  attExcusedInk: '#88A7F9',
};

// Статусы работы по домашнему заданию (Figma «ДЗ (моб.)», node 853:19518, и карточки
// 897:26384…). Заливка одна на обе темы — она полупрозрачная и ложится и на белый фон,
// и на тёмный; меняется только чернило, иначе #16A34A на тёмном читался бы как пятно.
//
// Пять слотов, а не четыре статуса: «Не выполнено» — это не пятый
// HomeworkSubmissionStatus, а NOT_SUBMITTED у закрытого задания, и красным его красит
// экран, а не бэк.
const homework = {
  hwPendingTint: 'rgba(156,163,175,0.12)',
  hwReviewTint: 'rgba(59,130,246,0.12)',
  hwReturnedTint: 'rgba(251,146,60,0.12)',
  hwDoneTint: 'rgba(34,197,94,0.12)',
  hwFailedTint: 'rgba(239,68,68,0.12)',
  // Блок обратной связи учителя на возвращённой работе (Figma `feedback-box`).
  hwFeedbackTint: 'rgba(245,158,11,0.08)',
};

const homeworkInk = {
  hwPendingInk: '#6B7280',
  hwReviewInk: '#2563EB',
  hwReturnedInk: '#FB923C',
  hwDoneInk: '#16A34A',
  hwFailedInk: '#DC2626',
  hwFeedbackInk: '#D97706',
  // Подложка чипа вложения (Figma `upload-chip`): чуть теплее общего `bg2`.
  hwChipBg: '#EEF2F6',
};

const homeworkInkDark = {
  hwPendingInk: '#9AA6BC',
  hwReviewInk: '#93B4FD',
  hwReturnedInk: '#FBBF6C',
  hwDoneInk: '#4ADE80',
  hwFailedInk: '#F87171',
  hwFeedbackInk: '#FBBF6C',
  hwChipBg: '#243149',
};

// Статусы сервисной заявки (Figma «Сервисные заявки», 1114:7948 и 1118:19046).
//
// В макете чипы залиты плотными светлыми цветами (#DCFCE7 «Выполнена», #FEE2E2
// «Отменена»). Здесь они записаны как те же чернила под 12 % — на белом это ровно
// макетный оттенок, а на тёмной подложке остаётся читаемым; плотный #DCFCE7 в тёмной
// теме превратился бы в светлое пятно. Так же сделаны чипы посещаемости и ДЗ.
//
// «Экстренная» — не пятый статус, а метка поверх него (§6), и цвет у неё свой: красный
// уже занят отменённой заявкой, и одинаковыми они читались бы как одно и то же.
const service = {
  srNewTint: 'rgba(59,130,246,0.12)',
  srProgressTint: 'rgba(251,146,60,0.14)',
  srDoneTint: 'rgba(22,163,74,0.14)',
  srCancelledTint: 'rgba(239,68,68,0.12)',
  srUrgentTint: 'rgba(234,179,8,0.16)',
};

const serviceInk = {
  srNewInk: '#2563EB',
  srProgressInk: '#EA580C',
  srDoneInk: '#16A34A',
  srCancelledInk: '#EF4444',
  srUrgentInk: '#A16207',
};

const serviceInkDark = {
  srNewInk: '#93B4FD',
  srProgressInk: '#FBBF6C',
  srDoneInk: '#4ADE80',
  srCancelledInk: '#F87171',
  srUrgentInk: '#EAB308',
};

const light = {
  bg: '#FAFBFC',
  bg2: '#F1F5F9',
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  ink: '#1A1F36',
  ink2: '#475569',
  ink3: '#94A3B8',
  // Figma mobile greys — lesson meta / weekday labels and the idle accent stripe.
  inkMuted: '#6B7280',
  stripeIdle: '#D1D5DB',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  ...grid,
  greenSoft: '#FFF7ED',
  blueSoft: '#EEF1F8',
  redSoft: '#FEE2E2',
  goldSoft: '#FEF9C3',
  // Успех — отдельный слот: brand-«green» это оранжевый CTA, зелёным ему быть нельзя,
  // а «готово» без зелёного не читается.
  success: '#065F46',
  successSoft: '#E0FBE3',
  ...attendance,
  ...attendanceInk,
  ...homework,
  ...homeworkInk,
  ...service,
  ...serviceInk,
  ...hero,
  ...PHYSTECH,
};

const dark = {
  bg: '#0F172A',
  bg2: '#182338',
  surface: '#1E293B',
  surface2: '#243149',
  ink: '#F1F5F9',
  ink2: '#B6C2D6',
  ink3: '#64748B',
  inkMuted: '#9AA6BC',
  stripeIdle: '#3E4F6D',
  border: '#2E3D57',
  borderStrong: '#3E4F6D',
  ...gridDark,
  greenSoft: '#3A2412',
  blueSoft: '#1B2745',
  redSoft: '#3A1C1C',
  goldSoft: '#3A2E0C',
  success: '#4ADE80',
  successSoft: '#123527',
  ...attendance,
  ...attendanceInkDark,
  ...homework,
  ...homeworkInkDark,
  ...service,
  ...serviceInkDark,
  ...hero,
  ...PHYSTECH,
};

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  // null = follow system; otherwise an explicit override.
  const [override, setOverride] = useState(null);
  const isDark = override == null ? system === 'dark' : override === 'dark';

  const value = useMemo(() => {
    const c = isDark ? dark : light;
    return {
      c,
      dark: isDark,
      following: override == null,
      setScheme: setOverride, // 'light' | 'dark' | null
      toggle: () => setOverride(isDark ? 'light' : 'dark'),
    };
  }, [isDark, override]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    // Safe fallback so components can render outside the provider.
    return { c: light, dark: false, following: true, setScheme: () => {}, toggle: () => {} };
  }
  return ctx;
}

// Soft background variant for a brand colour name.
export function softFor(c, name) {
  return { green: c.greenSoft, blue: c.blueSoft, red: c.redSoft, gold: c.goldSoft }[name] || c.bg2;
}
