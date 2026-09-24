import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { MonthStepper, StateView } from '@shared/components/ui';
import { ChildPickerSheet, ChildSwitcherPill } from '@shared/ui/childSwitcher';
import { useAttendanceSummary } from '@shared/hooks/useAttendance';
import { useParentChildren } from '@shared/hooks/useSchedule';
import { useSelectedChild } from '@shared/state/SelectedChild';
import { MARK_TOKEN, defaultMonth, monthKey, monthLabel, shiftMonth } from '@shared/api/attendanceJournalMap';
import { dayA11yLabel, learnerDays, learnerMonths } from '@shared/api/learnerAttendanceMap';
import { AttendanceCalendar, CancelledDash, MarkDot } from './AttendanceCalendar';

/**
 * Маркер дня ученика (Figma 2170:5266): точка, «–» или пары «точка + число» смешанного
 * дня (`combo`, `red-count`). Пары переносятся второй строкой, если их больше двух: в
 * клетке 46 pt помещается две, а прятать третью значило бы молчать об опоздании.
 */
function LearnerDayMarker({ marker }) {
  const { c } = useTheme();
  if (!marker) return null;
  if (marker.kind === 'cancelled') return <CancelledDash />;
  if (marker.kind === 'dot') return <MarkDot mark={marker.mark} />;
  return (
    // `stretch` даёт ряду ширину клетки: без неё ряд растёт по содержимому и не переносится.
    <View
      style={{
        alignSelf: 'stretch',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: 4,
        rowGap: 1,
      }}
    >
      {marker.items.map((item) => (
        <View key={item.mark} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <MarkDot mark={item.mark} />
          <Txt style={{ fontSize: 10, lineHeight: 12, fontWeight: '600', color: c[MARK_TOKEN[item.mark]] }}>
            {item.count}
          </Txt>
        </View>
      ))}
    </View>
  );
}

function BackLink({ onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.4} />
      <Txt style={{ fontSize: 16, fontWeight: '500', color: c.blue }}>Назад</Txt>
    </Pressable>
  );
}

/**
 * Календарь месяца: шапка, стрелки и сетка с маркерами дней. Общий для ученика и
 * родителя — разница только в `childId` и пилюле ребёнка над месяцем.
 *
 * `month: null` просит у бэка текущий месяц по часам школы; из первого ответа приходят
 * границы учебного года, и только тогда включаются стрелки.
 */
function LearnerAttendanceView({ nav, childId = null, enabled = true, childSwitcher = null }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const [month, setMonth] = useState(null);
  const { loading, error, summary, reload } = useAttendanceSummary({ month, childId, enabled });

  // Год держится отдельно от ответа: пока грузится соседний месяц, ответа нет, а стрелки
  // и подпись месяца должны оставаться на месте.
  const [year, setYear] = useState(null);
  useEffect(() => {
    if (summary?.academicYear) setYear(summary.academicYear);
  }, [summary]);

  const today = monthKey();
  const months = useMemo(() => learnerMonths(year, today), [year, today]);
  const shown = month ?? summary?.month ?? today;

  // Летом текущий месяц вне учебного года — открываем последний месяц года, а не пустоту.
  useEffect(() => {
    if (month == null && summary?.month && months.length && !months.includes(summary.month)) {
      setMonth(defaultMonth(months, summary.month));
    }
  }, [month, summary, months]);

  const older = shiftMonth(months, shown, -1);
  const newer = shiftMonth(months, shown, 1);

  const days = useMemo(() => learnerDays(summary), [summary]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload(true);
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  let body;
  if (loading && !summary) {
    body = <ActivityIndicator color={c.blue} style={{ paddingVertical: 48 }} />;
  } else if (error && !summary) {
    body = (
      <StateView
        style={{ paddingVertical: 40 }}
        icon="alertTriangle"
        tone="error"
        title="Не удалось загрузить посещаемость"
        subtitle="Проверьте соединение и попробуйте снова"
        actionLabel="Повторить"
        onAction={() => reload()}
      />
    );
  } else {
    body = (
      <>
        <AttendanceCalendar
          framed
          month={shown}
          renderMarks={(cell) => <LearnerDayMarker marker={days[cell.date]} />}
          cellLabel={(cell) => dayA11yLabel(cell.day, days[cell.date])}
        />
        {summary && !(summary.lessons ?? []).length ? (
          <Txt style={{ fontSize: 13, color: c.inkMuted, textAlign: 'center' }}>
            В этом месяце уроков не было
          </Txt>
        ) : null}
      </>
    );
  }

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 32, gap: 20 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <BackLink onPress={() => nav?.back?.()} />
      <Txt style={{ fontSize: 20, fontWeight: '600', color: c.ink }}>Посещаемость</Txt>
      {childSwitcher}
      <MonthStepper
        label={monthLabel(shown)}
        canOlder={Boolean(older)}
        canNewer={Boolean(newer)}
        onOlder={() => older && setMonth(older)}
        onNewer={() => newer && setMonth(newer)}
        style={{ alignSelf: 'center' }}
      />
      {body}
    </Screen>
  );
}

/**
 * Посещаемость ученика за месяц (Figma 2170:5100, 2170:5266): вход — плитка на главной.
 *
 * <p>Уроки всех предметов, поэтому маркер ставится на день, а не на урок; правило —
 * `learnerAttendanceMap.learnerDays`. Черновика учителя здесь нет: неопубликованный урок
 * виден только как факт — серой точкой «Не опубл.».
 */
export function StudentAttendanceScreen({ nav }) {
  return <LearnerAttendanceView nav={nav} />;
}

/**
 * Посещаемость ребёнка (Figma 2170:5692, 2170:5864) — тот же календарь в контексте
 * выбранного ребёнка.
 *
 * <p>Выбор ребёнка общий на всё приложение родителя (`SelectedChildProvider`): переключив
 * здесь, родитель вернётся на главную к тому же ребёнку. Пилюля и шит — те же, что в
 * расписании, заданиях и оценках (`shared/ui/childSwitcher`).
 */
export function ParentAttendanceScreen({ nav }) {
  const { c } = useTheme();
  const { loading, error, children, reload } = useParentChildren();
  const { childId, setChildId } = useSelectedChild(children);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedIndex = children.findIndex((item) => item.id === childId);
  const child = selectedIndex >= 0 ? children[selectedIndex] : null;

  if (loading || (children.length > 0 && !child)) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        <ActivityIndicator color={c.blue} style={{ paddingVertical: 96 }} />
      </Screen>
    );
  }

  if (error || children.length === 0) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
          <StateView
            icon={error ? 'alertTriangle' : 'users'}
            tone={error ? 'warn' : 'neutral'}
            title={error ? 'Не удалось загрузить' : 'Дети не привязаны к аккаунту'}
            subtitle={
              error
                ? 'Проверьте соединение и попробуйте снова'
                : 'Обратитесь к администратору школы — он свяжет вас с ребёнком'
            }
            actionLabel={error ? 'Повторить' : undefined}
            onAction={error ? () => reload() : undefined}
          />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <LearnerAttendanceView
        nav={nav}
        childId={childId}
        enabled={childId != null}
        childSwitcher={
          <ChildSwitcherPill
            child={child}
            index={selectedIndex}
            canSwitch={children.length > 1}
            onPress={() => setPickerOpen(true)}
          />
        }
      />
      <ChildPickerSheet
        visible={pickerOpen}
        items={children}
        selectedId={childId}
        onSelect={(nextId) => {
          setChildId(nextId);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
