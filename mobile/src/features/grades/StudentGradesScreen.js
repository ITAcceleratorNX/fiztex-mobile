import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { PickerSheet, StateView } from '@shared/components/ui';
import { GradeChip } from '@shared/ui/grades';
import { useMySubjectGrades } from '@shared/hooks/useGrades';
import { formatAverage } from '@shared/api/gradesMap';
import { GradesSkeleton, NoGradesState, NoPeriodDataState } from './GradeStates';

/**
 * Раздел «Оценки» ученика и родителя (Figma `student-grades-subjects`,
 * `parent-multi-grades`, `parent-single-grades` и их состояния).
 *
 * <b>Один запрос на весь экран.</b> Названия предметов, оценки, средние и список четвертей
 * приходят вместе (`/api/grades/my/subjects`): собирать это из «моих оценок» и десяти
 * запросов за средним значило бы посчитать средний балл на телефоне — а он обязан
 * совпадать с журналом учителя до последнего знака.
 *
 * <b>Родителю тот же экран</b> — в контексте выбранного ребёнка (`childStudentProfileId`).
 * Отдельного «родительского» раздела не будет: у них одинаковое содержимое и одинаковые
 * права, разная только область, и её задаёт параметр.
 */
export function StudentGradesScreen({
  nav,
  childStudentProfileId = null,
  /** Переключатель ребёнка у родителя — рядом с заголовком (Figma `child-switcher-pill`). */
  titleRight = null,
  /** «Айгерим Б. · 7А» — подпись ребёнка, которую экран предмета покажет в шапке. */
  childLabel = null,
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const [periodId, setPeriodId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    loading, error, forbidden, view, subjects, periods, period, reload,
  } = useMySubjectGrades({ academicPeriodId: periodId, childStudentProfileId });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const subtitle = [period?.name, view?.className ? `${view.className} класс` : null]
    .filter(Boolean)
    .join(' · ');

  const header = (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => nav?.back?.()}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.4} />
        <Txt style={{ fontSize: 16, fontWeight: '500', color: c.blue }}>Назад</Txt>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt style={{ flex: 1, fontSize: 28, fontWeight: '700', color: c.ink }}>Оценки</Txt>
        {titleRight}
      </View>

      {/* Подпись — она же переключатель четверти: список периодов уже пришёл с ответом,
          и прятать его за отдельным фильтром на экране из одного заголовка незачем. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Выбрать учебный период"
        disabled={periods.length < 2}
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink3 }}>
          {subtitle || 'Учебный период не выбран'}
        </Txt>
        {periods.length > 1 ? (
          <Icon name="chevronDown" size={14} color={c.ink3} strokeWidth={2.2} />
        ) : null}
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        {header}
        <View style={{ padding: 16 }}>
          <GradesSkeleton header={false} />
        </View>
      </Screen>
    );
  }

  if (forbidden || error) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        {header}
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
          <StateView
            icon={forbidden ? 'lock' : 'alertTriangle'}
            tone={forbidden ? 'brand' : 'warn'}
            title={forbidden ? 'Раздел недоступен' : 'Не удалось загрузить'}
            subtitle={
              forbidden
                ? 'Свои оценки видит ученик, а родитель — оценки своего ребёнка'
                : 'Проверьте соединение и попробуйте снова'
            }
            actionLabel={forbidden ? undefined : 'Повторить'}
            onAction={forbidden ? undefined : () => reload()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + 120 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {header}

      {!period ? (
        <NoPeriodDataState />
      ) : subjects.length === 0 ? (
        <NoGradesState />
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.subjectId}
              subject={subject}
              onPress={() =>
                nav?.('subject', {
                  subjectId: subject.subjectId,
                  subjectName: subject.subjectName,
                  studentProfileId: view?.studentProfileId,
                  academicPeriodId: period?.id,
                  academicYearId: view?.academicYearId,
                  periodName: period?.name,
                  className: view?.className,
                  periods,
                  childStudentProfileId,
                  childLabel,
                })}
            />
          ))}
        </View>
      )}

      <PickerSheet
        visible={pickerOpen}
        title="Учебный период"
        options={periods.map((item) => ({
          value: item.id,
          label: item.name,
          hint: item.current ? 'Текущая четверть' : undefined,
        }))}
        value={period?.id ?? null}
        onSelect={(value) => {
          setPeriodId(value);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

/**
 * Карточка предмета: все оценки за четверть подряд и средний балл под ними.
 *
 * Оценки не сворачиваются в «последние три»: их за четверть немного, а обрезанный ряд
 * заставил бы открывать предмет ради того, что помещается на экране.
 */
function SubjectCard({ subject, onPress }) {
  const { c } = useTheme();
  const grades = subject.grades || [];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
        <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }} numberOfLines={1}>
          {subject.subjectName}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {grades.map((grade) => (
            <GradeChip key={grade.id} value={grade.scaleCode} size={28} />
          ))}
        </View>
        <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink3 }}>
          Ср. балл: {formatAverage(subject.average?.average)}
        </Txt>
      </View>
      <Icon name="chevronRight" size={20} color={c.ink3} strokeWidth={2} />
    </Pressable>
  );
}
