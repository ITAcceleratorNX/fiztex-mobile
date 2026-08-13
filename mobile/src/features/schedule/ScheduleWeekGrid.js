import React, { useMemo, useRef } from 'react';
import { View, Pressable, PanResponder } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { ScheduleStateView } from './ScheduleStates';
import { cellAccessibilityLabel, cellLabel } from './weekGrid';

const TIME_COL_WIDTH = 44;
const HEADER_HEIGHT = 56;
const ROW_HEIGHT = 64;
const HEADER_RADIUS = 8;
// Дальше этого сдвига по горизонтали жест считается листанием недели, а не
// промахом по ячейке. Вертикальная составляющая должна быть меньше — иначе
// сетка перехватывала бы обычную прокрутку экрана.
const SWIPE_DISTANCE = 48;

/** Точка-маркер в углу ячейки: «идёт сейчас» и «замена» (Figma `dot-now`). */
function CellDots({ lessons }) {
  const { c } = useTheme();
  const now = lessons.some((l) => l.status === 'now' && !l.cancelled);
  const substituted = lessons.some((l) => l.substituteTeacher && !l.cancelled);
  if (!now && !substituted) return null;
  return (
    <View style={{ position: 'absolute', top: 3, right: 3, flexDirection: 'row', gap: 2 }}>
      {now ? <View style={dotStyle(c.dotNow)} /> : null}
      {substituted ? <View style={dotStyle(c.dotSubstitute)} /> : null}
    </View>
  );
}

function dotStyle(color) {
  return { width: 6, height: 6, borderRadius: 3, backgroundColor: color };
}

/** Чип предмета внутри ячейки (Figma 56×20, r6, текст 11). */
function LessonChip({ lesson, role }) {
  const { c } = useTheme();
  return (
    <Txt
      numberOfLines={1}
      ellipsizeMode="tail"
      style={{
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 14,
        color: lesson.cancelled ? c.ink3 : c.ink,
        textDecorationLine: lesson.cancelled ? 'line-through' : 'none',
      }}
    >
      {cellLabel(lesson, role)}
    </Txt>
  );
}

function GridCell({ lessons, column, role, onOpenLesson, holidayLabel = false }) {
  const { c } = useTheme();
  const background = column.isToday ? c.gridToday : column.holiday ? c.gridOff : 'transparent';
  const openable = lessons.find((l) => l.lessonInstanceId);

  const body = (
    <>
      <View style={{ paddingHorizontal: 4, paddingVertical: 4, gap: 2 }}>
        {lessons.slice(0, 2).map((lesson, i) => (
          <LessonChip key={lesson.lessonId || i} lesson={lesson} role={role} />
        ))}
        {lessons.length > 2 ? (
          <Txt style={{ fontSize: 10, fontWeight: '600', color: c.inkMuted }}>
            +{lessons.length - 2}
          </Txt>
        ) : null}
      </View>
      <CellDots lessons={lessons} />
    </>
  );

  const style = {
    flex: 1,
    height: ROW_HEIGHT,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: c.gridLine,
    backgroundColor: background,
  };

  if (!lessons.length) {
    // Подпись «Выходной» стоит в середине нерабочей колонки — Figma «Сетка – Выходной».
    return (
      <View style={[style, { alignItems: 'center' }]}>
        {holidayLabel && column.holiday ? (
          <Txt numberOfLines={1} style={{ fontSize: 11, fontWeight: '500', color: c.ink3 }}>
            {column.holiday}
          </Txt>
        ) : null}
      </View>
    );
  }

  // Карточка урока открывается по фактическому уроку; за горизонтом генерации
  // его нет, и ячейка честно перестаёт быть кнопкой.
  if (!openable || !onOpenLesson) {
    return (
      <View style={style} accessibilityLabel={cellAccessibilityLabel(lessons[0], role)}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cellAccessibilityLabel(openable, role)}
      onPress={() => onOpenLesson(openable)}
      style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

/** Шапка таблицы: пустая клетка над временем + дни недели с числами. */
function GridHeader({ columns }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        height: HEADER_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: c.gridLine,
      }}
    >
      <View style={{ width: TIME_COL_WIDTH, borderRightWidth: 1, borderRightColor: c.gridLine }} />
      {columns.map((col) => (
        <View
          key={col.date}
          accessibilityLabel={`${col.label} ${col.dayNum}${col.isToday ? ', сегодня' : ''}`}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            borderRightWidth: 1,
            borderRightColor: c.gridLine,
            backgroundColor: col.isToday ? c.blue : 'transparent',
            borderTopLeftRadius: col.isToday ? HEADER_RADIUS : 0,
            borderTopRightRadius: col.isToday ? HEADER_RADIUS : 0,
          }}
        >
          <Txt style={{ fontSize: 12, fontWeight: '500', color: col.isToday ? '#fff' : c.ink2 }}>
            {col.label}
          </Txt>
          <Txt
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: col.isToday ? (col.holiday ? 'rgba(255,255,255,0.55)' : '#fff') : c.ink,
            }}
          >
            {col.dayNum}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/** Колонка времени: номер урока и время начала (время известно не всегда). */
function TimeCell({ row }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: TIME_COL_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderRightWidth: 1,
        borderRightColor: c.gridLine,
      }}
    >
      <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>
        {row.number != null ? row.number : '·'}
      </Txt>
      {row.time ? (
        <Txt style={{ fontSize: 10, fontWeight: '500', color: c.inkMuted }}>{row.time}</Txt>
      ) : null}
    </View>
  );
}

/**
 * Скелетон недели (Figma «Сетка – Загрузка»): та же таблица, вместо предметов — плашки.
 * Рисунок фиксированный, а не случайный: иначе плашки прыгали бы на каждом ре-рендере.
 */
const SKELETON_PATTERN = [
  [40, 40, 30, 36, 36],
  [44, 30, 36, 40, 36],
  [28, 0, 30, 34, 0],
  [30, 0, 34, 0, 0],
  [40, 36, 30, 0, 0],
  [0, 0, 30, 0, 0],
  [0, 0, 0, 0, 0],
];

function SkeletonBar({ width, column }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        height: ROW_HEIGHT,
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderRightWidth: 1,
        borderRightColor: c.gridLine,
        backgroundColor: column?.isToday ? c.gridToday : 'transparent',
      }}
    >
      {width ? (
        <View style={{ maxWidth: width, height: 10, flex: 1, borderRadius: 4, backgroundColor: c.gridLine }} />
      ) : null}
    </View>
  );
}

function Legend({ items }) {
  const { c } = useTheme();
  if (!items.length) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 16,
        paddingTop: 8,
        paddingHorizontal: 16,
      }}
    >
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* У отмены нет точки — её видно по самому предмету, поэтому и в легенде
              подпись показана тем же зачёркиванием, а не выдуманным маркером. */}
          {item.strike ? null : <View style={dotStyle(item.color)} />}
          <Txt
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: item.strike ? c.ink3 : c.inkMuted,
              textDecorationLine: item.strike ? 'line-through' : 'none',
            }}
          >
            {item.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/**
 * Недельный режим расписания — Figma «Расписание – Сетка» (node 2085:9402).
 *
 * Компонент только рисует уже посчитанную модель (`buildWeekGrid`): что в какой
 * ячейке оказалось, решает `weekGrid.js`, и это же решение прогоняется тестами.
 *
 * Недели листаются свайпом: в макете нет ни стрелок, ни подписи недели, а по ТЗ
 * доступны предыдущая, текущая и следующая. Границы диапазона задаёт контейнер —
 * сетка только сообщает направление.
 */
export function ScheduleWeekGrid({ grid, state, role = 'student', onRetry, onOpenLesson, onSwipeWeek }) {
  const { c } = useTheme();
  const loading = state.kind === 'loading';

  // PanResponder создаётся один раз и живёт дольше рендера, поэтому колбэк
  // берётся через ref — иначе он навсегда запомнил бы обработчик первого рендера.
  const onSwipeWeekRef = useRef(onSwipeWeek);
  onSwipeWeekRef.current = onSwipeWeek;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > SWIPE_DISTANCE && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < SWIPE_DISTANCE) return;
        onSwipeWeekRef.current?.(g.dx < 0 ? 1 : -1);
      },
    }),
  ).current;

  const legend = useMemo(() => {
    if (loading || !grid || grid.isEmpty) return [];
    const all = grid.columns.flatMap((col) => grid.rows.flatMap((row) => grid.lessonsAt(row.key, col.date)));
    const items = [{ label: 'Идёт сейчас', color: c.dotNow }];
    if (all.some((l) => l.substituteTeacher && !l.cancelled)) {
      items.push({ label: 'Замена', color: c.dotSubstitute });
    }
    if (all.some((l) => l.cancelled)) {
      items.push({ label: 'Отменён', color: c.ink3, strike: true });
    }
    return items;
  }, [grid, loading, c.dotNow, c.dotSubstitute, c.ink3]);

  // Таблица рисуется только там, где ей есть на чём стоять. Нет класса, периода
  // или учебных дней — показываем то же объяснение, что и дневной режим, а не
  // пустую сетку: она читалась бы как «уроков нет».
  if (state.kind !== 'grid' && state.kind !== 'loading') {
    return <ScheduleStateView state={state} onRetry={onRetry} />;
  }

  const rows = grid.rows;
  const middleRow = Math.floor(rows.length / 2);

  return (
    <View {...pan.panHandlers}>
      <View
        style={{
          marginHorizontal: 16,
          borderWidth: 1,
          borderColor: c.gridLine,
          borderRadius: 12,
          backgroundColor: c.surface,
          overflow: 'hidden',
        }}
      >
        <GridHeader columns={grid.columns} />

        <View>
          {rows.map((row, rowIndex) => (
            <View
              key={row.key}
              style={{
                flexDirection: 'row',
                borderBottomWidth: rowIndex === rows.length - 1 ? 0 : 1,
                borderBottomColor: c.gridLine,
              }}
            >
              <TimeCell row={row} />
              {grid.columns.map((col, colIndex) =>
                loading ? (
                  <SkeletonBar
                    key={col.date}
                    column={col}
                    width={SKELETON_PATTERN[rowIndex % SKELETON_PATTERN.length][colIndex % 5]}
                  />
                ) : (
                  <GridCell
                    key={col.date}
                    column={col}
                    role={role}
                    lessons={grid.lessonsAt(row.key, col.date)}
                    onOpenLesson={onOpenLesson}
                    holidayLabel={rowIndex === middleRow}
                  />
                ),
              )}
            </View>
          ))}
        </View>
      </View>

      <Legend items={legend} />
    </View>
  );
}
