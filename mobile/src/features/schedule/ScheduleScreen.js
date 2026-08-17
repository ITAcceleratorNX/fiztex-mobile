import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import {
  useMySchedule,
  useChildSchedule,
  useParentChildren,
  buildDayStrip,
  startOfWeek,
  endOfWeek,
  lessonsForDate,
  workingDayOffsets,
  nearestSchoolDay,
} from '@shared/hooks/useSchedule';
import { useMyAttendanceMarks } from '@shared/hooks/useAttendance';
import { localDateKey } from '@shared/api/scheduleMap';
import { resolveDayState, resolveWeekState } from './ScheduleStates';
import {
  ChildPickerSheet,
  ChildSubtitle,
  ChildSwitcherPill,
  childShortLabel,
} from './ChildSwitcher';
import { ScheduleDayView } from './ScheduleDayView';
import { ScheduleWeekGrid } from './ScheduleWeekGrid';
import { ViewModeToggle, VIEW_MODES } from './ViewModeToggle';
import { buildWeekGrid, shiftWeek } from './weekGrid';

// ТЗ: доступны предыдущая, текущая и следующая недели — не больше.
const WEEKS_BACK = 1;
const WEEKS_FORWARD = 1;

/**
 * «Следующий» is only meaningful for the current day — on any other day the
 * first lesson is not "next up". Past/future days are already resolved to
 * done/upcoming by the date-aware status in scheduleMap.
 */
function markNextLesson(lessons, isToday) {
  if (!isToday) return lessons;
  const list = lessons.map((l) => ({ ...l }));
  const nowIdx = list.findIndex((l) => l.status === 'now');
  const start = nowIdx >= 0 ? nowIdx + 1 : 0;
  for (let i = start; i < list.length; i += 1) {
    if (list[i].status === 'upcoming') {
      list[i] = { ...list[i], status: 'next' };
      break;
    }
  }
  return list;
}

/**
 * Расписание ученика / родителя / учителя — один экран в двух режимах.
 *
 * Контейнер владеет всем, что зависит от данных: роль, выбранный ребёнок, неделя,
 * режим показа, загрузка и обновление. Дневной список и недельная сетка получают
 * уже посчитанное и только рисуют, поэтому переключение «День / Неделя» не ходит
 * в сеть — обе формы живут на одном и том же недельном ответе.
 *
 * @param {'student'|'parent'|'teacher'} role
 */
export function ScheduleScreen({ nav, role = 'student' }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const isParent = role === 'parent';

  const { children, loading: childrenLoading, reload: reloadChildren } = useParentChildren(isParent);
  const [childId, setChildId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (isParent && children.length && !childId) setChildId(children[0].id);
  }, [isParent, children, childId]);

  const todayStr = localDateKey();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [mode, setMode] = useState(VIEW_MODES.day);
  const userPickedDay = useRef(false);

  // Refetch only when the *week* changes, not on every day tap.
  const weekAnchor = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const me = useMySchedule({ week: true, date: weekAnchor });
  const child = useChildSchedule(isParent ? childId : null, { week: true, date: weekAnchor });
  const source = isParent ? child : me;
  const { error, data, reload } = source;

  // Пока список детей не пришёл (или ребёнок ещё не выбран), расписание даже не
  // запрошено, а хук уже отдаёт loading=false. Без этой поправки экран успевал
  // мигнуть пустым состоянием вместо загрузки.
  const childPending = isParent && (childrenLoading || (children.length > 0 && !childId));
  const loading = source.loading || childPending;
  // У родителя без привязанных детей показывать нечего: сообщение об этом уже
  // стоит под заголовком, а пустая сетка под ним читалась бы как «уроков нет».
  const noChildren = isParent && !childrenLoading && children.length === 0;

  // Учебные дни приходят с расписанием, поэтому первая отрисовка идёт на
  // пятидневке по умолчанию, а после ответа полоска перестраивается под школу.
  const offsets = useMemo(() => workingDayOffsets(data), [data]);
  const days = useMemo(() => buildDayStrip(todayStr, offsets), [todayStr, offsets]);

  // В выходной «сегодня» в полоске нет — без этого не подсвечивался ни один чип,
  // и пустой день читался как поломка. Ручной выбор дня уважаем и не перебиваем.
  useEffect(() => {
    if (userPickedDay.current) return;
    const snapped = nearestSchoolDay(todayStr, offsets);
    if (snapped !== selectedDate) setSelectedDate(snapped);
  }, [todayStr, offsets, selectedDate]);

  const onSelectDay = useCallback((date) => {
    userPickedDay.current = true;
    setSelectedDate(date);
  }, []);

  /**
   * Листание недель свайпом по сетке. Диапазон ограничен ТЗ (пред / тек / след),
   * поэтому шаг за границу просто игнорируется — упереться в край честнее, чем
   * показать неделю, которой по требованиям быть не должно.
   */
  const onSwipeWeek = useCallback(
    (direction) => {
      const currentWeek = startOfWeek(todayStr);
      const nextAnchor = shiftWeek(weekAnchor, direction);
      if (nextAnchor < shiftWeek(currentWeek, -WEEKS_BACK)) return;
      if (nextAnchor > shiftWeek(currentWeek, WEEKS_FORWARD)) return;
      userPickedDay.current = true;
      setSelectedDate(nextAnchor);
    },
    [weekAnchor, todayStr],
  );

  const rawLessons = lessonsForDate(data, selectedDate);
  const lessons = markNextLesson(rawLessons, selectedDate === todayStr);
  const selectedIndex = children.findIndex((ch) => ch.id === childId);
  const selectedChild = selectedIndex >= 0 ? children[selectedIndex] : null;

  /**
   * Отметки посещаемости на ту же неделю, что и уроки, — один запрос на весь экран.
   *
   * Учителю чипы не запрашиваются вовсе: отметка принадлежит одному ученику, а на
   * своём расписании учитель смотрит на класс целиком — одна отметка там не значит
   * ничего. Родителю нужен ребёнок, поэтому до его выбора запрос не уходит.
   */
  const { marks, reload: reloadMarks } = useMyAttendanceMarks({
    dateFrom: weekAnchor,
    dateTo: endOfWeek(weekAnchor),
    childId: isParent ? childId : null,
    enabled: role !== 'teacher' && (!isParent || Boolean(childId)),
  });

  const dayState = resolveDayState({ loading, error, view: data, lessons, dateStr: selectedDate });
  const weekState = resolveWeekState({ loading, error, view: data });
  const grid = useMemo(
    () => buildWeekGrid({ view: data, weekStart: weekAnchor, offsets, todayStr }),
    [data, weekAnchor, offsets, todayStr],
  );

  const onRetry = useCallback(() => reload?.(), [reload]);

  /**
   * Карточка урока грузится по id фактического урока, а его нет ни за горизонтом
   * генерации, ни на прошедших днях — такая строка никуда не ведёт. Правило одно
   * на все роли и на оба режима, поэтому переход живёт в контейнере.
   */
  const onOpenLesson = useCallback(
    (lesson) => {
      if (!lesson?.lessonInstanceId) return;
      nav?.('lesson', {
        ...lesson,
        childId: isParent ? childId : null,
        // Имя ребёнка знает расписание, а не карточка урока: в ответе урока его
        // нет, и запрашивать список детей ради подзаголовка было бы лишней сетью.
        childName: isParent && selectedChild ? childShortLabel(selectedChild) : null,
      });
    },
    [nav, isParent, childId, selectedChild],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // `silent` keeps the current lessons on screen instead of flashing skeletons.
      // Посещаемость обновляется вместе с расписанием: учитель публикует лист уже
      // после урока, и жест «потянуть» затем и делают, чтобы увидеть отметку.
      await Promise.all([
        reload?.(true),
        reloadMarks?.(),
        isParent ? reloadChildren?.() : null,
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadMarks, reloadChildren, isParent]);

  return (
    <Screen
      scroll
      contentStyle={{ paddingBottom: insets.bottom + 100 }}
      style={{ backgroundColor: c.bg }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Txt style={{ fontSize: 24, fontWeight: '800', color: c.blue }}>Расписание</Txt>
        <ViewModeToggle mode={mode} onChange={setMode} />
      </View>

      {isParent ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          {childrenLoading ? (
            <ActivityIndicator color={c.blue} />
          ) : selectedChild ? (
            mode === VIEW_MODES.week && children.length <= 1 ? (
              <ChildSubtitle child={selectedChild} />
            ) : (
              <ChildSwitcherPill
                child={selectedChild}
                index={selectedIndex}
                canSwitch={children.length > 1}
                onPress={() => setPickerOpen(true)}
              />
            )
          ) : (
            <Txt style={{ color: c.ink3, fontSize: 14 }}>Нет связанных детей</Txt>
          )}
        </View>
      ) : null}

      {noChildren ? null : mode === VIEW_MODES.week ? (
        <View style={{ paddingTop: 12 }}>
          <ScheduleWeekGrid
            grid={grid}
            state={weekState}
            role={role}
            onRetry={onRetry}
            onOpenLesson={onOpenLesson}
            onSwipeWeek={onSwipeWeek}
          />
        </View>
      ) : (
        <ScheduleDayView
          days={days}
          selectedDate={selectedDate}
          todayStr={todayStr}
          onSelectDay={onSelectDay}
          state={dayState}
          lessons={lessons}
          marks={marks}
          role={role}
          onRetry={onRetry}
          onOpenLesson={onOpenLesson}
        />
      )}

      <ChildPickerSheet
        visible={pickerOpen}
        items={children}
        selectedId={childId}
        onSelect={(id) => {
          setChildId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}
