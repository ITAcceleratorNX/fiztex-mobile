import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { StateView } from '@shared/components/ui';
import { GradeChip } from '@shared/ui/grades';
import { useMyBreakdown, useMySubjectDetail } from '@shared/hooks/useGrades';
import {
  COMPONENT_SHORT,
  formatAverage,
  formatPercent,
  gradeTypeLabel,
  gradeValueLabel,
  resultStatusHint,
  longDate,
  myFinalsForSubject,
  subjectSubtitle,
} from '@shared/api/gradesMap';
import { GradesEmptyBody, GradesSkeleton } from './GradeStates';

/** Заголовок блока — «Оценки за четверть», «Итог четверти», «Годовая оценка». */
function BlockTitle({ children }) {
  const { c } = useTheme();
  return (
    <Txt style={{ fontSize: 13, fontWeight: '700', color: c.ink2, paddingHorizontal: 16 }}>
      {children}
    </Txt>
  );
}

/** Карточка-строка «подпись + значение справа» — общая форма трёх нижних блоков. */
function ValueCard({ title, hint, value }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 16,
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{title}</Txt>
        {hint ? (
          <Txt style={{ fontSize: 12, fontWeight: '500', color: c.ink3 }}>{hint}</Txt>
        ) : null}
      </View>
      {value}
    </View>
  );
}

/**
 * Предмет ученика: оценки за четверть, итог и годовая
 * (Figma `student-grades-subject-detail`, `student-grades-no-grades`).
 *
 * <b>Черновиков здесь нет по построению.</b> Итоги приходят из `/api/final-grades/my`, а
 * эта выборка возвращает только опубликованное (контракт §7): фильтровать статусы на
 * клиенте не нужно и нельзя — иначе однажды покажем ученику то, что учитель ещё думает.
 *
 * <b>Средний балл не считается здесь.</b> Он приходит вместе с лентой, тот же, что видит
 * учитель в журнале.
 *
 * <b>Четверть по политике оценивания</b> (GRADES-003) вместо среднего показывает процент:
 * доли ФО, СОР и СОЧ и формулу с числами — из расшифровки сервера. Рекомендации итоговой
 * здесь нет: до публикации итога это подсказка учителю, а не оценка ученика.
 *
 * `payload` — из раздела «Оценки»: предмет, период, профиль ученика и список четвертей.
 */
export function StudentSubjectGradesScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const subjectId = payload?.subjectId ?? null;
  const subjectName = payload?.subjectName || 'Предмет';
  const periodId = payload?.academicPeriodId ?? null;

  const { loading, error, history, finals, reload } = useMySubjectDetail({
    studentProfileId: payload?.studentProfileId,
    subjectId,
    academicPeriodId: periodId,
    academicYearId: payload?.academicYearId,
    childStudentProfileId: payload?.childStudentProfileId ?? null,
  });

  const result = history?.result ?? null;
  const breakdown = useMyBreakdown({
    enabled: Boolean(result),
    subjectId,
    academicPeriodId: periodId,
    childStudentProfileId: payload?.childStudentProfileId ?? null,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const subjectFinals = useMemo(
    () => myFinalsForSubject(finals, subjectId),
    [finals, subjectId],
  );

  // Оценки — свежие сверху: ученик открывает предмет, чтобы увидеть последнюю.
  const events = useMemo(
    () => [...(history?.events || [])].reverse(),
    [history],
  );

  const otherPeriods = (payload?.periods || []).filter((item) => item.id !== periodId);
  const currentFinal = subjectFinals.periodValues?.[String(periodId)]
    ?? subjectFinals.periodValues?.[periodId]
    ?? null;

  const header = (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
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
        <Txt style={{ flex: 1, fontSize: 26, fontWeight: '700', color: c.ink }} numberOfLines={2}>
          {subjectName}
        </Txt>
        <View
          style={{
            backgroundColor: c.blueSoft,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <Txt style={{ fontSize: 13, fontWeight: '600', color: c.blue }}>
            {result
              ? `Итог: ${result.roundedPercent != null ? `${result.roundedPercent}%` : '—'}`
              : `Ср. балл: ${formatAverage(history?.average?.average)}`}
          </Txt>
        </View>
      </View>

      <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink3 }}>
        {subjectSubtitle({
          childLabel: payload?.childLabel,
          className: payload?.className,
          periodName: payload?.periodName,
        })}
      </Txt>
    </View>
  );

  if (loading) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        {header}
        <View style={{ padding: 16 }}>
          <GradesSkeleton header={false} rows={5} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        {header}
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
          <StateView
            icon="alertTriangle"
            tone="warn"
            title="Не удалось загрузить"
            subtitle="Проверьте соединение и попробуйте снова"
            actionLabel="Повторить"
            onAction={() => reload()}
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

      <View style={{ paddingTop: 20, gap: 10 }}>
        <BlockTitle>Оценки за четверть</BlockTitle>
        {events.length === 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: c.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <GradesEmptyBody
              icon="list"
              title="Оценок пока нет"
              subtitle="Оценки появятся после выставления учителем"
            />
          </View>
        ) : (
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: c.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              overflow: 'hidden',
            }}
          >
            {events.map((event) => (
              <View
                key={`${event.columnKey}-${event.grade?.id}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  minHeight: 58,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>
                    {gradeTypeLabel(event.grade?.gradeType)}
                  </Txt>
                  <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink3 }}>
                    {longDate(event.date)}
                  </Txt>
                </View>
                <GradeChip value={gradeValueLabel(event.grade)} />
              </View>
            ))}
          </View>
        )}
      </View>

      {result ? <ResultBlock result={result} breakdown={breakdown} /> : null}

      <View style={{ paddingTop: 24, gap: 10 }}>
        <BlockTitle>Итог четверти</BlockTitle>
        <ValueCard
          title="Итоговая оценка"
          hint={currentFinal == null ? 'Ещё не выставлена' : null}
          value={
            <Txt style={{ fontSize: 22, fontWeight: '700', color: currentFinal == null ? c.ink3 : c.ink }}>
              {currentFinal ?? '—'}
            </Txt>
          }
        />
      </View>

      {otherPeriods.length > 0 ? (
        <View style={{ paddingTop: 24, gap: 10 }}>
          <BlockTitle>Другие четверти</BlockTitle>
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: c.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              overflow: 'hidden',
            }}
          >
            {otherPeriods.map((item) => {
              const value = subjectFinals.periodValues?.[String(item.id)]
                ?? subjectFinals.periodValues?.[item.id]
                ?? null;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() =>
                    nav?.('subject', {
                      ...payload,
                      academicPeriodId: item.id,
                      periodName: item.name,
                    })}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    minHeight: 52,
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                    backgroundColor: pressed ? c.bg2 : 'transparent',
                  })}
                >
                  <Txt style={{ flex: 1, fontSize: 15, fontWeight: '500', color: c.ink }}>
                    {item.name}
                  </Txt>
                  <GradeChip value={value == null ? null : String(value)} size={28} />
                  <Icon name="chevronRight" size={16} color={c.ink3} strokeWidth={2} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ paddingTop: 24, gap: 10 }}>
        <BlockTitle>Годовая оценка</BlockTitle>
        <ValueCard
          title="Оценка за год"
          /* §7: до публикации — нейтральный текст. Старое «Появится после завершения всех
             четвертей» обещает то, чего система не делает: годовую выставляет учитель, и
             четыре четверти для неё не обязательны. */
          hint={
            subjectFinals.yearValue == null ? 'Годовая оценка ещё не опубликована' : null
          }
          value={
            <Txt
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: subjectFinals.yearValue == null ? c.ink3 : c.ink,
              }}
            >
              {subjectFinals.yearValue ?? '—'}
            </Txt>
          }
        />
      </View>

      {/* GRADES-003: экзаменационная и итоговая есть только у предметов с экзаменом —
          пустых блоков «экзамена нет» ученику не показываем. */}
      {subjectFinals.examValue != null || subjectFinals.finalValue != null ? (
        <View style={{ paddingTop: 24, gap: 10 }}>
          <BlockTitle>Экзамен и итоговая</BlockTitle>
          <ValueCard
            title="Экзаменационная"
            value={<BigValue value={subjectFinals.examValue} />}
          />
          <ValueCard
            title="Итоговая"
            hint={subjectFinals.finalValue == null ? 'Ещё не опубликована' : null}
            value={<BigValue value={subjectFinals.finalValue} />}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function BigValue({ value }) {
  const { c } = useTheme();
  return (
    <Txt style={{ fontSize: 22, fontWeight: '700', color: value == null ? c.ink3 : c.ink }}>
      {value ?? '—'}
    </Txt>
  );
}

/**
 * «Как посчитана четверть» (GRADES-003): процент, доли компонентов и формула. Всё из ответа
 * сервера — экран ничего не складывает и не округляет. Без расшифровки (сбой запроса)
 * блок держится на сводке из ленты.
 */
function ResultBlock({ result, breakdown }) {
  const { c } = useTheme();
  const components = breakdown?.result?.components || result.components || [];
  const hint = resultStatusHint(result);
  return (
    <View style={{ paddingTop: 24, gap: 10 }}>
      <BlockTitle>Расчёт за четверть</BlockTitle>
      <View
        style={{
          marginHorizontal: 16,
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          padding: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt style={{ fontSize: 28, fontWeight: '700', color: c.ink }}>
            {formatPercent(result.percent)}
          </Txt>
          {result.roundedPercent != null ? (
            <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink3 }}>
              округлено до {result.roundedPercent}%
            </Txt>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {components.map((component) => {
            const counted = component.contribution != null;
            return (
              <View
                key={component.code}
                style={{
                  flex: 1,
                  backgroundColor: c.bg2,
                  borderRadius: 12,
                  padding: 10,
                  gap: 2,
                  opacity: counted ? 1 : 0.6,
                }}
              >
                <Txt style={{ fontSize: 11, fontWeight: '700', color: c.ink3 }}>
                  {COMPONENT_SHORT[component.code] || component.code} · {Number(component.weightPercent)}%
                </Txt>
                <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>
                  {component.workCount ? formatPercent(component.percent) : '—'}
                </Txt>
                <Txt style={{ fontSize: 11, color: c.ink3 }}>
                  {component.workCount ? `работ: ${component.workCount}` : 'работ нет'}
                </Txt>
              </View>
            );
          })}
        </View>

        {breakdown?.formula ? (
          <Txt style={{ fontSize: 13, lineHeight: 18, color: c.ink2 }}>{breakdown.formula}</Txt>
        ) : null}
        {/* Формула уже говорит про недостающие компоненты — подсказка нужна, только когда
            расшифровки нет или процент не посчитан. */}
        {hint && !breakdown?.formula ? (
          <Txt style={{ fontSize: 12, color: c.ink3 }}>{hint}</Txt>
        ) : null}
      </View>
    </View>
  );
}

