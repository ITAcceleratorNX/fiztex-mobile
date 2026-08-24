import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { GradeChip } from '@shared/ui/grades';
import { formatAverage, longDate, studentTimeline } from '@shared/api/gradesMap';
import { NoGradesState } from './GradeStates';

/**
 * Оценки одного ученика за четверть (Figma `mobile-journal-student-grades`).
 *
 * <b>Второго запроса нет.</b> Экран строится из того же ответа журнала, который уже
 * загрузил список: в нём есть и колонки, и клетки, а лента ученика — это они же,
 * сложенные по датам. Ходить за тем, что уже на руках, значит показать спиннер там,
 * где данные есть.
 *
 * Оценка отсюда не меняется: её ставят на уроке, где у неё есть источник и автор.
 * Тап по дню открывает этот урок.
 *
 * `payload` — из списка журнала: `journal`, `studentProfileId`, `finalGrade`.
 */
export function JournalStudentScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const journal = payload?.journal || null;
  const studentProfileId = payload?.studentProfileId ?? null;

  const row = useMemo(
    () => (journal?.rows || []).find((item) => item.studentProfileId === studentProfileId) || null,
    [journal, studentProfileId],
  );
  const timeline = useMemo(
    () => studentTimeline(journal, studentProfileId),
    [journal, studentProfileId],
  );

  const onBack = useCallback(() => nav?.back?.(), [nav]);

  const period = journal?.period?.name || '';
  const subtitle = [payload?.subjectName, period, payload?.className].filter(Boolean).join(' · ');

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + 120 }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="chevronLeft" size={14} color={c.blue} strokeWidth={2.4} />
          <Txt style={{ fontSize: 15, fontWeight: '500', color: c.blue }}>Журнал</Txt>
        </Pressable>

        <View style={{ gap: 4 }}>
          <Txt style={{ fontSize: 24, fontWeight: '700', color: c.ink }}>
            {row?.studentName || 'Ученик'}
          </Txt>
          {subtitle ? (
            <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink3 }}>{subtitle}</Txt>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              backgroundColor: c.blueSoft,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Txt style={{ fontSize: 13, fontWeight: '600', color: c.blue }}>
              Ср. балл: {formatAverage(row?.average?.value)}
            </Txt>
          </View>
          {payload?.finalGrade != null ? (
            <View
              style={{
                backgroundColor: c.bg2,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink2 }}>
                Итог. четв.: {payload.finalGrade}
              </Txt>
            </View>
          ) : null}
        </View>
      </View>

      {timeline.entries.length === 0 ? (
        <NoGradesState />
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 10 }}>
          <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Оценки</Txt>
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              overflow: 'hidden',
            }}
          >
            {timeline.entries.map((entry) => (
              <Pressable
                key={entry.key}
                accessibilityRole={entry.lessonId ? 'button' : 'text'}
                disabled={!entry.lessonId}
                onPress={
                  entry.lessonId
                    ? () => nav?.('lesson-grades', { lessonInstanceId: entry.lessonId })
                    : undefined
                }
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 60,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                  backgroundColor: pressed ? c.bg2 : 'transparent',
                })}
              >
                <Txt style={{ flex: 1, fontSize: 15, fontWeight: '500', color: c.ink }}>
                  {longDate(entry.date)}
                </Txt>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {entry.grades.map((grade) => (
                    <GradeChip key={grade.id} value={grade.scaleCode} />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
          <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink3 }}>
            {timeline.lessonCount} {pluralLessons(timeline.lessonCount)} ·{' '}
            {timeline.gradeCount} {pluralGrades(timeline.gradeCount)}
          </Txt>
        </View>
      )}
    </Screen>
  );
}

function pluralLessons(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'урок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'урока';
  return 'уроков';
}

function pluralGrades(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'оценка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'оценки';
  return 'оценок';
}
