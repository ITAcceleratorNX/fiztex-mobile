import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { PhysTechMark } from '@shared/components/Hex';
import { LessonRow } from '@shared/ui/rows';
import {
  useMySchedule,
  useChildSchedule,
  useParentChildren,
  buildDayStrip,
  startOfWeek,
  lessonsForDate,
  workingDayOffsets,
  nearestSchoolDay,
} from '@shared/hooks/useSchedule';
import { localDateKey } from '@shared/api/scheduleMap';
import {
  InfoBanner,
  ScheduleSkeleton,
  ScheduleStateView,
  resolveDayState,
} from './ScheduleStates';
import { ChildPickerSheet, ChildSwitcherPill, childShortLabel } from './ChildSwitcher';
import { mockAttendanceFor } from './attendanceMock';

const STRIP_GAP = 8;
const STRIP_PAD = 16;
const VISIBLE_CHIPS = 5;

/** Subtle repeating Φ watermark behind the lesson list (Figma `lessons-scroll`). */
function ScheduleWatermark() {
  const { c } = useTheme();
  const marks = Array.from({ length: 48 });
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        opacity: 0.045,
        overflow: 'hidden',
      }}
    >
      {marks.map((_, i) => (
        <View key={i} style={{ width: '25%', height: 110, alignItems: 'center', justifyContent: 'center' }}>
          <PhysTechMark size={36} color={c.blue} />
        </View>
      ))}
    </View>
  );
}

function DayChip({ day, selected, isToday, width, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${day.label} ${day.dayNum}${isToday ? ', сегодня' : ''}`}
      onPress={onPress}
      style={{
        width,
        height: 64,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? c.blue : 'transparent',
        borderWidth: !selected && isToday ? 1.5 : 0,
        borderColor: c.blue,
      }}
    >
      <Txt style={{ fontSize: 12, fontWeight: '600', color: selected ? '#fff' : isToday ? c.blue : c.inkMuted }}>
        {day.label}
      </Txt>
      <Txt style={{ fontSize: 16, fontWeight: '700', color: selected ? '#fff' : c.ink }}>{day.dayNum}</Txt>
    </Pressable>
  );
}

/**
 * Figma `weekday-strip` (node 2022:12344), extended to scroll across weeks:
 * the selected day is kept centred, so previous and next days stay reachable.
 * Five chips are visible at a time, matching the mockup's geometry.
 */
function DayStrip({ days, selectedDate, todayStr, onSelect }) {
  const listRef = useRef(null);
  const [width, setWidth] = useState(0);
  const didInitialScroll = useRef(false);

  const chipWidth = width
    ? (width - STRIP_PAD * 2 - STRIP_GAP * (VISIBLE_CHIPS - 1)) / VISIBLE_CHIPS
    : 0;
  const itemSize = chipWidth + STRIP_GAP;
  const index = days.findIndex((d) => d.date === selectedDate);

  // Keep the selected chip centred (viewPosition 0.5). The first positioning
  // must not animate, otherwise the strip visibly flies in on mount.
  useEffect(() => {
    if (!listRef.current || !chipWidth || index < 0) return;
    const animated = didInitialScroll.current;
    didInitialScroll.current = true;
    listRef.current.scrollToIndex({ index, viewPosition: 0.5, animated });
  }, [index, chipWidth]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ paddingVertical: 8 }}
    >
      {chipWidth > 0 ? (
        <FlatList
          ref={listRef}
          data={days}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(d) => d.date}
          initialScrollIndex={index >= 0 ? index : 0}
          getItemLayout={(_, i) => ({ length: itemSize, offset: itemSize * i, index: i })}
          onScrollToIndexFailed={() => {}}
          contentContainerStyle={{ paddingHorizontal: STRIP_PAD, gap: STRIP_GAP }}
          renderItem={({ item }) => (
            <DayChip
              day={item}
              width={chipWidth}
              selected={item.date === selectedDate}
              isToday={item.date === todayStr}
              onPress={() => onSelect(item.date)}
            />
          )}
        />
      ) : (
        <View style={{ height: 64 }} />
      )}
    </View>
  );
}

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
 * Shared Figma schedule screen for student / parent / teacher.
 * @param {'student'|'parent'|'teacher'} role
 */
export function ScheduleScreen({ nav, role = 'student' }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const isParent = role === 'parent';
  const isTeacher = role === 'teacher';

  const { children, loading: childrenLoading, reload: reloadChildren } = useParentChildren(isParent);
  const [childId, setChildId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (isParent && children.length && !childId) setChildId(children[0].id);
  }, [isParent, children, childId]);

  const todayStr = localDateKey();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const userPickedDay = useRef(false);

  // Refetch only when the *week* changes, not on every day tap.
  const weekAnchor = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const me = useMySchedule({ week: true, date: weekAnchor });
  const child = useChildSchedule(isParent ? childId : null, { week: true, date: weekAnchor });
  const { loading, error, data, reload } = isParent ? child : me;

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

  const rawLessons = lessonsForDate(data, selectedDate);
  const lessons = markNextLesson(rawLessons, selectedDate === todayStr);
  const selectedIndex = children.findIndex((ch) => ch.id === childId);
  const selectedChild = selectedIndex >= 0 ? children[selectedIndex] : null;

  const dayState = resolveDayState({ loading, error, view: data, lessons, dateStr: selectedDate });
  const onRetry = useCallback(() => reload?.(), [reload]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // `silent` keeps the current lessons on screen instead of flashing skeletons.
      await Promise.all([reload?.(true), isParent ? reloadChildren?.() : null]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadChildren, isParent]);

  return (
    <Screen
      scroll
      contentStyle={{ paddingBottom: insets.bottom + 100 }}
      style={{ backgroundColor: c.bg }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScheduleWatermark />

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Txt style={{ fontSize: 24, fontWeight: '800', color: c.blue }}>Расписание</Txt>
      </View>

      {isParent ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          {childrenLoading ? (
            <ActivityIndicator color={c.blue} />
          ) : selectedChild ? (
            <ChildSwitcherPill
              child={selectedChild}
              index={selectedIndex}
              canSwitch={children.length > 1}
              onPress={() => setPickerOpen(true)}
            />
          ) : (
            <Txt style={{ color: c.ink3, fontSize: 14 }}>Нет связанных детей</Txt>
          )}
        </View>
      ) : null}

      <DayStrip days={days} selectedDate={selectedDate} todayStr={todayStr} onSelect={onSelectDay} />

      {dayState.kind === 'loading' ? (
        <ScheduleSkeleton />
      ) : dayState.kind === 'lessons' ? (
        <>
          {dayState.infoEvents.map((e) => (
            <InfoBanner key={e.id} title={e.title} />
          ))}
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            {lessons.map((l, i) => (
              <LessonRow
                key={l.lessonId || i}
                lesson={l}
                teacherView={isTeacher}
                // A single attendance mark belongs to one pupil, so it is
                // meaningless on a teacher's own schedule (a whole class).
                attendance={isTeacher ? null : mockAttendanceFor(l)}
                // Карточка урока грузится по id фактического урока, а его нет ни за
                // горизонтом генерации, ни на прошедших днях (генерация идёт от сегодня
                // вперёд) — такая строка не ведёт никуда. Правило одно на все роли:
                // с переездом ученика и родителя на ту же карточку исключений не осталось.
                onPress={
                  l.lessonInstanceId
                    ? () => nav?.('lesson', {
                        ...l,
                        childId: isParent ? childId : null,
                        // Имя ребёнка знает расписание, а не карточка урока: в ответе
                        // урока его нет, и запрашивать список детей ради подзаголовка
                        // было бы лишним походом в сеть.
                        childName: isParent && selectedChild ? childShortLabel(selectedChild) : null,
                      })
                    : undefined
                }
              />
            ))}
          </View>
        </>
      ) : (
        <ScheduleStateView state={dayState} onRetry={onRetry} />
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
