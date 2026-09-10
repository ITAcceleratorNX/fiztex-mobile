import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { LogoWatermark } from '@shared/components/ui';
import { LessonRow } from '@shared/ui/rows';
import { InfoBanner, ScheduleSkeleton, ScheduleStateView } from './ScheduleStates';

const STRIP_GAP = 8;
const STRIP_PAD = 16;
const VISIBLE_CHIPS = 5;

/**
 * Подложка из макета (`background`, node 2140:15114).
 *
 * Знак 50 при шаге 62,7×66,6 — шесть знаков в ряд на 390 точках. `gap` один на обе оси:
 * шаг по вертикали больше не потому, что зазор другой, а потому что сам знак выше, чем
 * шире (96/89). Цвет и прозрачность — в теме (`schedulePattern`), там же объяснено,
 * откуда взялись 1,6 %.
 */
const MARK_SIZE = 50;
const MARK_GAP = 0.127;

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
 * Дневной режим расписания: полоска дней + карточки уроков выбранного дня.
 *
 * Компонент только рисует. Данные, выбранный день и состояние экрана считает
 * контейнер (`ScheduleScreen`) — тот же самый недельный ответ обслуживает и сетку,
 * поэтому переключение «День / Неделя» не ходит в сеть.
 */
export function ScheduleDayView({
  days,
  selectedDate,
  todayStr,
  onSelectDay,
  state,
  lessons,
  marks = {},
  grades = {},
  role = 'student',
  onRetry,
  onOpenLesson,
}) {
  const { c } = useTheme();
  const isTeacher = role === 'teacher';

  /*
    Слой знаков собирается один раз на тему, а не на каждый выбранный день: сетка на
    экран это под сотню SVG, и пересобирать её при переключении дня незачем — от дня
    она не зависит. Один и тот же элемент React пропускает без повторного рендера.
  */
  const watermark = useMemo(
    () => (
      <LogoWatermark
        color={c.schedulePattern}
        mark={MARK_SIZE}
        gap={MARK_GAP}
        opacity={c.schedulePatternOpacity}
      />
    ),
    [c.schedulePattern, c.schedulePatternOpacity],
  );

  return (
    <>
      <DayStrip days={days} selectedDate={selectedDate} todayStr={todayStr} onSelect={onSelectDay} />

      {/*
        Подложка начинается сразу под полоской дней и тянется до нижнего меню.

        Границы не заданы числом ни сверху, ни снизу. Сверху блок просто стоит следующим
        за полоской, поэтому переезд полоски не сдвигает подложку. Снизу его тянет
        `flexGrow`: контейнер прокрутки растянут на высоту экрана, а нижний отступ
        контента равен высоте плавающего таб-бара, и блок упирается ровно в него.
        `flexShrink: 0` — чтобы длинный список не сжимался ради этого роста.

        Инфо-событие дня внутри блока, а не над ним: у него своя непрозрачная подложка,
        и знак под ней всё равно не виден, зато фон начинается там, где ему сказано.

        `paddingBottom` — запас под тень нижней карточки: на длинном списке блок кончается
        ровно на последнем уроке, и `overflow: hidden` срезал бы её.
      */}
      <View style={{ flexGrow: 1, flexShrink: 0, overflow: 'hidden', paddingBottom: 24 }}>
        {watermark}

        {state.kind === 'loading' ? (
          <ScheduleSkeleton />
        ) : state.kind === 'lessons' ? (
          <>
            {/* У баннера свои горизонтальные поля, поэтому он стоит рядом со списком,
                а не внутри него: вложенный, он получил бы отступ дважды. */}
            {state.infoEvents.map((e) => (
              <InfoBanner key={e.id} title={e.title} />
            ))}
            <View style={{ gap: 12, paddingHorizontal: 16 }}>
              {lessons.map((l, i) => (
                <LessonRow
                  key={l.lessonId || i}
                  lesson={l}
                  teacherView={isTeacher}
                  // Отметка принадлежит одному ученику, поэтому на расписании учителя
                  // (класс целиком) её нет — контейнер за неё даже не ходит.
                  // Ключ — id фактического урока: у слота расписания посещаемости нет.
                  attendance={isTeacher ? null : marks[l.lessonInstanceId] || null}
                  // Оценки за урок — там же и по тем же правилам, что отметка.
                  grades={isTeacher ? null : grades[l.lessonInstanceId] || null}
                  onPress={onOpenLesson && l.lessonInstanceId ? () => onOpenLesson(l) : undefined}
                />
              ))}
            </View>
          </>
        ) : (
          <ScheduleStateView state={state} onRetry={onRetry} />
        )}
      </View>
    </>
  );
}
