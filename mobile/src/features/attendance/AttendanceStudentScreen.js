import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { MonthStepper, StateView } from '@shared/components/ui';
import { useTeacherJournal } from '@shared/hooks/useAttendance';
import { localDateKey } from '@shared/api/scheduleMap';
import { monthLabel, shiftMonth, statsLine, studentDays } from '@shared/api/attendanceJournalMap';
import { AttendanceCalendar, CancelledDash, MarkDot } from './AttendanceCalendar';

/** Маркер дня: точка на урок, две точки (два урока) или «–» у отменённого (Figma `combo`, `day-16`). */
function DayMarks({ marks }) {
  if (!marks?.length) return null;
  if (marks.length === 1 && marks[0] === 'cancelled') return <CancelledDash />;
  const dots = marks.filter((mark) => mark !== 'cancelled').slice(0, 3);
  const size = dots.length > 1 ? 7 : 8;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {dots.map((mark, index) => (
        <MarkDot key={index} mark={mark} size={size} />
      ))}
    </View>
  );
}

/**
 * Посещаемость ученика — календарь месяца (Figma 2170:4586 и 2170:4748).
 *
 * <p>Экран учителя, а не ученика: здесь только уроки класса этого учителя, и точка стоит на
 * каждый урок. Сам ученик и родитель видят месяц по всем предметам другим экраном
 * (`LearnerAttendanceScreen`) — там маркер ставится на день. Открывается из журнала
 * месяца и берёт оттуда класс, месяц и границы года.
 *
 * <p>Данные — тот же журнал класса, что и у списка: отдельного эндпоинта «ученик за месяц»
 * нет и не нужно — итоги и отметки ученика уже есть в ответе журнала. Стрелки месяца
 * перезапрашивают журнал соседнего месяца в пределах учебного года.
 */
export function AttendanceStudentScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const months = payload?.months ?? [];
  const [month, setMonth] = useState(payload?.month ?? null);
  const studentId = payload?.studentProfileId;
  const subgroupId = payload?.subgroupId ?? null;

  const journal = useTeacherJournal({ month, classId: payload?.classId, subgroupId });
  const student = journal.journal?.students?.find((row) => row.studentProfileId === studentId) ?? null;

  const today = localDateKey();
  const days = useMemo(
    () => studentDays(journal.journal, studentId, { subgroupFiltered: subgroupId != null, today }),
    [journal.journal, studentId, subgroupId, today],
  );

  const older = shiftMonth(months, month, -1);
  const newer = shiftMonth(months, month, 1);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await journal.reload(true);
    } finally {
      setRefreshing(false);
    }
  }, [journal]);

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 32, gap: 16 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => nav?.back?.()}
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

      <Txt style={{ fontSize: 18, fontWeight: '600', color: c.ink }}>{payload?.fullName}</Txt>

      <MonthStepper
        label={monthLabel(month)}
        canOlder={Boolean(older)}
        canNewer={Boolean(newer)}
        onOlder={() => older && setMonth(older)}
        onNewer={() => newer && setMonth(newer)}
        style={{ alignSelf: 'center' }}
      />

      {journal.loading ? (
        <ActivityIndicator color={c.blue} style={{ paddingVertical: 48 }} />
      ) : journal.error && !journal.journal ? (
        <StateView
          style={{ paddingVertical: 40 }}
          icon="alertTriangle"
          tone="error"
          title="Не удалось загрузить журнал"
          actionLabel="Повторить"
          onAction={() => journal.reload()}
        />
      ) : (
        <>
          <Txt style={{ fontSize: 12, color: c.inkMuted, textAlign: 'center' }}>
            {statsLine(student)}
          </Txt>

          <AttendanceCalendar
            month={month}
            renderMarks={(cell) => <DayMarks marks={days[cell.date]} />}
          />
        </>
      )}
    </Screen>
  );
}
