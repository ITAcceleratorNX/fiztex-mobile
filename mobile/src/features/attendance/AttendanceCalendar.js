import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { CALENDAR_LEGEND, MARK_TOKEN, calendarWeeks } from '@shared/api/attendanceJournalMap';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
/** Клетка макета; на узком телефоне сетка ужимается, чтобы не вылезти за карточку. */
const CELL = 46;
const GAP = 4;
/** Отступ сетки от рамки карточки: у макета (2170:5280) сетка 346 в карточке 358. */
const FRAME_INSET = 5;

/** Точка отметки: цвет — токен журнала из темы. */
export function MarkDot({ mark, size = 8 }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c[MARK_TOKEN[mark]] }} />
  );
}

/** «–» отменённого урока (Figma `day-16` и легенда «Отменён»). */
export function CancelledDash({ size = 14 }) {
  const { c } = useTheme();
  return (
    <Txt style={{ fontSize: size, lineHeight: size + 2, fontWeight: '500', color: c.borderStrong }}>–</Txt>
  );
}

/** Легенда в две строки, как в обоих макетах календаря. */
export function AttendanceLegend() {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      {CALENDAR_LEGEND.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {row.map((item) => (
            <View key={item.mark} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {item.mark === 'cancelled' ? <CancelledDash size={11} /> : <MarkDot mark={item.mark} size={6} />}
              <Txt style={{ fontSize: 10, color: c.inkMuted }}>{item.label}</Txt>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Клетка дня (Figma `day-N`): число и маркер под ним. Выходной — серая подложка; маркер
 * у него бывает, если в школе субботние уроки: прятать их значило бы терять отметки.
 */
function DayCell({ cell, size, framed, marks, label }) {
  const { c } = useTheme();
  const weekend = Boolean(cell?.weekend);
  // У ученика пустые клетки до 1-го и после конца месяца серые (2170:5298), у учителя — белые.
  const shaded = weekend || (framed && !cell);
  return (
    <View
      accessible={Boolean(cell)}
      accessibilityLabel={cell ? label ?? String(cell.day) : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        backgroundColor: shaded ? c.surface2 : c.surface,
      }}
    >
      {cell ? (
        <>
          <Txt style={{ fontSize: 13, fontWeight: '500', color: weekend ? c.ink3 : c.ink }}>{cell.day}</Txt>
          {marks}
        </>
      ) : null}
    </View>
  );
}

/**
 * Календарь месяца посещаемости: шапка дней недели, сетка с понедельника и легенда.
 *
 * Общий для двух макетов — календаря ученика в журнале учителя (Figma 2170:4586) и
 * календаря самого ученика и родителя (2170:5266). Клетки, шапка и легенда одни; разное —
 * что стоит в дне, поэтому маркер рисует вызывающий (`renderMarks`): у учителя точка на
 * каждый урок его класса, у ученика — маркер всего дня.
 *
 * @param {object} props
 * @param {string} props.month «2026-09»
 * @param {(cell) => React.ReactNode} [props.renderMarks] маркер под числом дня
 * @param {(cell) => string} [props.cellLabel] подпись клетки для скринридера
 * @param {boolean} [props.framed] макет ученика: карточка с рамкой, недели вплотную,
 *   пустые клетки серые, легенда внутри карточки
 */
export function AttendanceCalendar({ month, renderMarks, cellLabel, framed = false }) {
  const { c } = useTheme();
  const weeks = useMemo(() => calendarWeeks(month), [month]);

  // Ширину знает только разметка: сетка 7 × 46 не помещается на телефон уже 390 pt.
  const [width, setWidth] = useState(null);
  const inner = width == null ? null : width - (framed ? 2 * (FRAME_INSET + 1) : 0);
  const size = inner == null ? CELL : Math.min(CELL, Math.floor((inner - 6 * GAP) / 7));

  const grid = (
    <View style={{ alignSelf: 'center', gap: framed ? 0 : 2 }}>
      <View style={{ flexDirection: 'row', gap: GAP }}>
        {WEEKDAYS.map((label, index) => (
          <View key={label} style={{ width: size, height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 11, fontWeight: '500', color: index >= 5 ? c.ink3 : c.inkMuted }}>{label}</Txt>
          </View>
        ))}
      </View>
      {weeks.map((week, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: GAP }}>
          {week.map((cell, day) => (
            <DayCell
              key={cell?.date ?? `empty-${index}-${day}`}
              cell={cell}
              size={size}
              framed={framed}
              marks={cell ? renderMarks?.(cell) ?? null : null}
              label={cell ? cellLabel?.(cell) : undefined}
            />
          ))}
        </View>
      ))}
    </View>
  );

  const onLayout = (event) => setWidth(event.nativeEvent.layout.width);

  if (!framed) {
    return (
      <View onLayout={onLayout} style={{ gap: 16 }}>
        {grid}
        <AttendanceLegend />
      </View>
    );
  }
  return (
    <View
      onLayout={onLayout}
      style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: 12,
        paddingHorizontal: FRAME_INSET,
        gap: 12,
      }}
    >
      {grid}
      <AttendanceLegend />
    </View>
  );
}
