import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { FilterChip, PickerSheet, StateView } from '@shared/components/ui';
import { useTeacherJournal, useTeacherJournalOptions } from '@shared/hooks/useAttendance';
import {
  LIST_LEGEND,
  MARK_TOKEN,
  defaultMonth,
  monthLabel,
  scopeKey,
  scopeLabel,
  shortNames,
  studentPills,
  yearMonths,
} from '@shared/api/attendanceJournalMap';

/** «‹ Назад» и заголовок (Figma 2170:4404, `back-button` и `Посещаемость за месяц`). */
function Header({ onBack }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
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
      <Txt style={{ fontSize: 20, fontWeight: '600', color: c.ink }}>Посещаемость за месяц</Txt>
    </View>
  );
}

/** Точка легенды и пилла: цвет — токен журнала из темы. */
function Dot({ mark, size }) {
  const { c } = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c[MARK_TOKEN[mark]] }} />;
}

/** Figma `legend-row`: только то, что считают пиллы. */
function Legend() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
      {LIST_LEGEND.map((item) => (
        <View key={item.mark} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Dot mark={item.mark} size={8} />
          <Txt style={{ fontSize: 11, color: c.inkMuted }}>{item.label}</Txt>
        </View>
      ))}
    </View>
  );
}

const PILL_SOFT = { absent: 'markAbsentSoft', late: 'markLateSoft', excused: 'markExcusedSoft' };

/** Figma `pill-red` / `pill-amber` / `pill-blue`: точка и число за месяц. */
function Pill({ mark, count }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: c[PILL_SOFT[mark]],
      }}
    >
      <Dot mark={mark} size={6} />
      <Txt style={{ fontSize: 12, fontWeight: '600', color: c[MARK_TOKEN[mark]] }}>{count}</Txt>
    </View>
  );
}

/** Строка ученика: имя, пиллы или «Без пропусков», шеврон в календарь. */
function StudentRow({ name, student, last, onPress }) {
  const { c } = useTheme();
  const pills = studentPills(student);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. Открыть календарь посещаемости`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
        backgroundColor: pressed ? c.bg2 : 'transparent',
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink }} numberOfLines={1}>
          {name}
        </Txt>
        {pills.length ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {pills.map((pill) => (
              <Pill key={pill.mark} mark={pill.mark} count={pill.count} />
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Dot mark="present" size={6} />
            <Txt style={{ fontSize: 11, color: c.markPresent }}>Без пропусков</Txt>
          </View>
        )}
      </View>
      <Icon name="chevronRight" size={16} color={c.ink3} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * Посещаемость за месяц — журнал учителя компактными пиллами (Figma 2170:4404).
 *
 * <p><b>Ничего не считает.</b> Числа пропусков, опозданий и освобождений приходят с бэка
 * по правилам §8 — те же, что видят веб-журнал учителя и месячная сводка родителя.
 *
 * <p><b>Какие классы есть у учителя, решает сервер</b> (`teacher-journal/options`): пары
 * «класс + подгруппа» считаются по его урокам, включая замены. Первая пара выбирается
 * сразу — как в журнале оценок: экран с пустым списком и просьбой выбрать класс на
 * телефоне был бы лишним шагом.
 *
 * <p>Строка ведёт в календарь ученика; тот получает класс, месяц и границы года из этого
 * экрана и дальше живёт сам — листает месяцы своими стрелками.
 */
export function AttendanceMonthScreen({ nav }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const options = useTeacherJournalOptions();
  const months = useMemo(() => yearMonths(options.year), [options.year]);

  const [scope, setScope] = useState(null);
  const [month, setMonth] = useState(null);
  const [picker, setPicker] = useState(null); // 'scope' | 'month'

  useEffect(() => {
    if (!scope && options.scopes.length) setScope(options.scopes[0]);
  }, [scope, options.scopes]);
  useEffect(() => {
    if (!month && months.length) setMonth(defaultMonth(months));
  }, [month, months]);

  const journal = useTeacherJournal({
    month,
    classId: scope?.classId,
    subgroupId: scope?.subgroupId ?? null,
  });

  const students = journal.journal?.students ?? [];
  const names = useMemo(() => shortNames(students.map((student) => student.fullName)), [students]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([options.reload(), journal.reload(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [options, journal]);

  const openStudent = (student) =>
    nav?.('attendance-student', {
      classId: scope.classId,
      subgroupId: scope.subgroupId ?? null,
      month,
      months,
      studentProfileId: student.studentProfileId,
      fullName: student.fullName,
    });

  const scopeOptions = options.scopes.map((option) => ({ value: scopeKey(option), label: scopeLabel(option) }));
  const monthOptions = months.map((value) => ({ value, label: monthLabel(value) }));

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 32, gap: 16 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Header onBack={() => nav?.back?.()} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <FilterChip
          label={scope ? scopeLabel(scope) : 'Выберите класс'}
          flex={1.25}
          onPress={() => options.scopes.length && setPicker('scope')}
        />
        <FilterChip
          label={month ? monthLabel(month) : 'Месяц'}
          flex={1}
          onPress={() => months.length && setPicker('month')}
        />
      </View>

      <Legend />

      <Body
        options={options}
        journal={journal}
        hasScope={Boolean(scope && month)}
        students={students}
        names={names}
        onOpenStudent={openStudent}
      />

      <PickerSheet
        visible={picker === 'scope'}
        title="Класс / подгруппа"
        options={scopeOptions}
        value={scope ? scopeKey(scope) : null}
        onSelect={(key) => {
          setPicker(null);
          setScope(options.scopes.find((option) => scopeKey(option) === key) ?? null);
        }}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'month'}
        title="Месяц"
        options={monthOptions}
        value={month}
        onSelect={(value) => {
          setPicker(null);
          setMonth(value);
        }}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

const STATE_SPACING = { paddingVertical: 40 };

function Body({ options, journal, hasScope, students, names, onOpenStudent }) {
  const { c } = useTheme();

  if (options.loading || (hasScope && journal.loading)) {
    return <ActivityIndicator color={c.blue} style={{ paddingVertical: 48 }} />;
  }
  if (options.error) {
    return (
      <StateView style={STATE_SPACING} icon="alertTriangle" tone="error" title="Не удалось загрузить журнал" actionLabel="Повторить" onAction={options.reload} />
    );
  }
  if (!options.year) {
    return <StateView style={STATE_SPACING} icon="calendar" title="Учебный год ещё не заведён — журнала пока нет" />;
  }
  if (!options.scopes.length) {
    return <StateView style={STATE_SPACING} icon="calendar" title="В этом учебном году у вас нет уроков" />;
  }
  if (!hasScope) {
    return <StateView style={STATE_SPACING} icon="calendarCheck" title="Выберите класс и месяц, чтобы увидеть журнал посещаемости" />;
  }
  if (journal.error && !journal.journal) {
    return (
      <StateView
        style={STATE_SPACING}
        icon="alertTriangle"
        tone="error"
        title="Не удалось загрузить журнал"
        actionLabel="Повторить"
        onAction={() => journal.reload()}
      />
    );
  }
  if (!(journal.journal?.lessons ?? []).length) {
    return <StateView style={STATE_SPACING} icon="calendar" title="В этом месяце у вас не было уроков в этом классе" />;
  }

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        overflow: 'hidden',
      }}
    >
      {students.map((student, index) => (
        <StudentRow
          key={student.studentProfileId}
          name={names[index]}
          student={student}
          last={index === students.length - 1}
          onPress={() => onOpenStudent(student)}
        />
      ))}
    </View>
  );
}
