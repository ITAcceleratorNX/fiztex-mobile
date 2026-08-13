import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { shadowSm } from '@shared/components/Screen';
import { scheduleStatusMessage } from '@shared/api/scheduleMap';

// Decorative tints for the state blocks. Kept next to the states that use them
// (rather than in the global theme) — they are one-off accents, not app-wide roles.
function tints(dark) {
  return dark
    ? {
        neutralBg: '#243149',
        warnBg: '#3A2412',
        warnBorder: '#B4670F',
        okBg: '#12301F',
        okBorder: '#1E693C',
        okInk: '#4ADE80',
        errBg: '#3A1C1C',
        errBorder: '#8C3B3B',
        bannerBg: '#33240F',
        bannerBorder: '#7A4B18',
        skeletonStrong: '#2E3D57',
        skeletonSoft: '#243149',
      }
    : {
        neutralBg: '#F1F5F9',
        warnBg: '#FFF7EB',
        warnBorder: '#FB923C',
        okBg: '#F0FDF4',
        okBorder: '#BBF7D0',
        okInk: '#16A34A',
        errBg: '#FEF2F2',
        errBorder: '#FCA5A5',
        bannerBg: '#FFF8EF',
        bannerBorder: '#FEDABF',
        skeletonStrong: '#E5E7EB',
        skeletonSoft: '#F3F4F6',
      };
}

/** Figma `skeleton-card` — same shell as a lesson card, with shimmer bars. */
function SkeletonCard() {
  const { c, dark } = useTheme();
  const t = tints(dark);
  const bar = (w, h, color) => (
    <View style={{ width: w, height: h, borderRadius: 4, backgroundColor: color }} />
  );
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 20,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        ...shadowSm,
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
    >
      <View style={{ width: 72, gap: 4 }}>
        {bar(48, 14, t.skeletonStrong)}
        {bar(36, 12, t.skeletonSoft)}
      </View>
      <View style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', backgroundColor: t.skeletonStrong }} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        {bar(140, 14, t.skeletonStrong)}
        {bar(180, 12, t.skeletonSoft)}
      </View>
    </View>
  );
}

/** Figma `skeleton-lessons-container` (node 2022:12514) — the loading state. */
export function ScheduleSkeleton({ count = 4 }) {
  return (
    <View style={{ gap: 12, paddingHorizontal: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

/** Figma `info-banner` (node 2022:12443) — an INFO calendar event above the lessons. */
export function InfoBanner({ title }) {
  const { c, dark } = useTheme();
  const t = tints(dark);
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.bannerBorder,
        backgroundColor: t.bannerBg,
      }}
    >
      <Icon name="calendar" size={20} color={c.green} />
      <Txt style={{ flex: 1, fontSize: 14, fontWeight: '700', color: c.green }}>{title}</Txt>
    </View>
  );
}

function IconWrap({ bg, border, children }) {
  return (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: border ? 1.5 : 0,
        borderColor: border,
      }}
    >
      {children}
    </View>
  );
}

/**
 * The empty / holiday / unpublished / error blocks share one layout:
 * 72px tinted circle + 32px icon, then a title (and optional subtitle / action).
 * Figma nodes 2022:12068, 2022:12115, 2022:12164, 2022:12211.
 */
export function ScheduleStateView({ state, onRetry }) {
  const { c, dark } = useTheme();
  const t = tints(dark);

  const variants = {
    empty: {
      bg: t.neutralBg,
      border: null,
      icon: 'calendarCheck',
      iconColor: c.inkMuted,
      title: state.message || 'На этот день уроков нет',
      titleColor: c.inkMuted,
      titleWeight: '600',
    },
    unpublished: {
      bg: t.warnBg,
      border: t.warnBorder,
      icon: 'fileLock',
      iconColor: c.green,
      title: 'Расписание ещё не опубликовано',
      titleColor: c.ink,
      titleWeight: '700',
      subtitle: 'Загляните позже',
    },
    holiday: {
      bg: t.okBg,
      border: t.okBorder,
      icon: 'leaf',
      iconColor: t.okInk,
      title: state.title ? `${state.title} · занятий нет` : 'Каникулы · занятий нет',
      titleColor: c.ink,
      titleWeight: '700',
    },
    error: {
      bg: t.errBg,
      border: t.errBorder,
      icon: 'alertTriangle',
      iconColor: c.red,
      title: 'Не удалось загрузить расписание',
      titleColor: c.ink,
      titleWeight: '600',
    },
  };

  const v = variants[state.kind] || variants.empty;
  const isError = state.kind === 'error';

  return (
    <View
      style={{
        paddingHorizontal: isError ? 32 : 24,
        paddingTop: 72,
        alignItems: 'center',
        gap: isError ? 24 : 16,
      }}
    >
      <View style={{ alignItems: 'center', gap: 16 }}>
        <IconWrap bg={v.bg} border={v.border}>
          <Icon name={v.icon} size={32} color={v.iconColor} strokeWidth={2} />
        </IconWrap>
        <View style={{ gap: 6 }}>
          <Txt
            style={{
              fontSize: 16,
              fontWeight: v.titleWeight,
              color: v.titleColor,
              textAlign: 'center',
            }}
          >
            {v.title}
          </Txt>
          {v.subtitle ? (
            <Txt style={{ fontSize: 14, fontWeight: '400', color: c.inkMuted, textAlign: 'center' }}>
              {v.subtitle}
            </Txt>
          ) : null}
        </View>
      </View>

      {isError && onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => ({
            height: 44,
            paddingHorizontal: 32,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.blue,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Txt style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Повторить</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Calendar events covering `dateStr` (dateFrom/dateTo are inclusive). */
export function eventsForDate(view, dateStr) {
  if (!view?.events?.length || !dateStr) return [];
  return view.events.filter((e) => {
    const from = e.dateFrom || null;
    const to = e.dateTo || from;
    // Without a range the event can't be tied to a day — keep it out of per-day UI.
    if (!from) return false;
    return from <= dateStr && dateStr <= to;
  });
}

/**
 * Приоритет состояний, общий для дня и недели: сначала то, что делает экран
 * бессмысленным (ошибка, загрузка), потом то, что объясняет пустоту.
 * Вынесено отдельно, чтобы два режима не разъехались в трактовке одного ответа.
 */
function baseState({ loading, error }) {
  if (error) return { kind: 'error' };
  if (loading) return { kind: 'loading' };
  return null;
}

// Формулировки, которые в неделе звучат иначе, чем в дне: «Неучебный день» про
// целую неделю — неправда.
const WEEK_MESSAGES = {
  non_working_day: 'На этой неделе нет учебных дней',
};

// Единственные два статуса, при которых пустая таблица честна: расписание есть,
// просто уроков в нём нет (Figma «Сетка – Пустая неделя»). Всё остальное —
// «сетку строить не из чего», и рисовать её значит врать: пустая таблица
// выглядит как «уроков нет», хотя на деле нет класса, периода или учебных дней.
const GRID_STATUSES = new Set(['ok', 'no_lessons', 'no_assigned_lessons']);

/**
 * Состояние недельной сетки. Приоритет тот же, что у дня, и объяснения те же —
 * иначе один и тот же ответ бэка в двух режимах читался бы по-разному.
 *
 * @returns {{kind: 'loading'|'error'|'unpublished'|'holiday'|'empty'|'grid', message?: string, title?: string}}
 */
export function resolveWeekState({ loading, error, view }) {
  const base = baseState({ loading, error });
  if (base) return base;

  const status = view?.status;
  if (status === 'schedule_not_published') return { kind: 'unpublished' };
  // Вся неделя закрыта календарём — то же самое, что каникулы в дневном виде.
  if (status === 'calendar_no_lessons') return { kind: 'holiday', title: null };
  if (!status || GRID_STATUSES.has(status)) return { kind: 'grid' };

  return { kind: 'empty', message: WEEK_MESSAGES[status] || scheduleStatusMessage(status) };
}

/**
 * Single place that turns (loading / error / status / events) into the state the
 * screen renders, so the states stay consistent instead of ad-hoc `if`s.
 *
 * @returns {{kind: 'loading'|'error'|'holiday'|'unpublished'|'empty'|'lessons', title?: string, message?: string}}
 */
export function resolveDayState({ loading, error, view, lessons, dateStr }) {
  const base = baseState({ loading, error });
  if (base) return base;

  const dayEvents = eventsForDate(view, dateStr);
  const blocking = dayEvents.find((e) => e.effect === 'NO_LESSONS');
  if (blocking) return { kind: 'holiday', title: blocking.title || blocking.reason };

  if (lessons.length > 0) {
    return { kind: 'lessons', infoEvents: dayEvents.filter((e) => e.effect === 'INFO') };
  }

  const status = view?.status;
  if (status === 'schedule_not_published') return { kind: 'unpublished' };
  if (status === 'calendar_no_lessons') return { kind: 'holiday', title: null };

  // no_lessons / non_working_day / no_active_class / … — neutral empty block,
  // using the backend's own wording when it is more specific than the default.
  const message =
    status && status !== 'ok' && status !== 'no_lessons' ? scheduleStatusMessage(status) : null;
  return { kind: 'empty', message };
}
