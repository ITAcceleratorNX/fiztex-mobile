import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { StateView } from '@shared/components/ui';
import { useLesson } from '@shared/hooks/useLesson';
import { useGradeScale, useLessonGrades } from '@shared/hooks/useGrades';
import { sheetBadge, writeStateBanner } from '@shared/api/gradesMap';
import { LessonGradeRow } from './LessonGradeRow';
import { LessonGradeSheet } from './LessonGradeSheet';
import {
  EmptyRosterState,
  GradesSkeleton,
  LessonCancelledState,
} from './GradeStates';

/** Возврат к карточке урока (Figma `back-button`). */
function BackRow({ onBack }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Назад к уроку"
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
        <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.4} />
        <Txt style={{ fontSize: 18, fontWeight: '500', color: c.blue }}>К уроку</Txt>
      </Pressable>
    </View>
  );
}

/**
 * Полоса о временном доступе (Figma `substitute-banner`, `expired-access-banner`).
 *
 * Два тона: предупреждение — «доступ есть, но кончится», нейтральный — «уже нельзя».
 * Разница не косметическая: первое требует поторопиться, второе — обратиться к
 * основному учителю.
 */
function AccessBanner({ banner }) {
  const { c } = useTheme();
  const warn = banner.tone === 'warn';
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
        backgroundColor: warn ? c.greenSoft : c.bg2,
        borderWidth: 1,
        borderColor: warn ? c.green : c.border,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Icon name="clock" size={18} color={warn ? c.green : c.ink3} strokeWidth={2} />
      <Txt
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 18,
          color: warn ? c.green : c.ink2,
        }}
      >
        {banner.text}
      </Txt>
    </View>
  );
}

/**
 * Оценки за урок — рабочий экран учителя (Figma `mobile-grades-list`, `…-bottom-sheet`,
 * `…-cancelled`).
 *
 * <b>Что разрешено, решает бэк.</b> `canManageGrades`, `writeState` и `canEdit` у каждой
 * оценки приходят посчитанными (`grades-read-contract.md` §3.1): экран не проверяет ни
 * роль, ни время урока, ни авторство — иначе правило окна замещающего существовало бы в
 * трёх местах и разошлось бы.
 *
 * <b>Одно нажатие — одно действие.</b> Кнопки «Сохранить» нет: выбранный балл уходит на
 * сервер сразу, лист перечитывается, шит закрывается.
 *
 * `payload` — из карточки урока: `lessonInstanceId`.
 */
export function LessonGradesScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const lessonId = payload?.lessonInstanceId ?? null;
  const { lesson } = useLesson(lessonId, { history: false });
  const scale = useGradeScale();
  const {
    loading, error, forbidden, sheet, busy, reload,
    createGrade, updateGrade, removeGrade,
  } = useLessonGrades(lessonId);

  // Какая клетка открыта: ученик плюс место в его строке. Один слот на весь экран —
  // открыть два шита сразу нельзя, а два независимых состояния разошлись бы.
  const [picker, setPicker] = useState(null); // { studentProfileId, slot, gradeId }
  const [sheetError, setSheetError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const rows = sheet?.students || [];
  const picked = useMemo(
    () => rows.find((row) => row.studentProfileId === picker?.studentProfileId) || null,
    [rows, picker],
  );
  const pickedGrade = useMemo(
    () => (picked?.grades || []).find((grade) => grade.id === picker?.gradeId) || null,
    [picked, picker],
  );

  const closePicker = useCallback(() => {
    setPicker(null);
    setSheetError(null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const onBack = useCallback(() => nav?.back?.(), [nav]);

  if (loading || forbidden || (!sheet && error)) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        <BackRow onBack={onBack} />
        {loading ? (
          <View style={{ padding: 16 }}>
            <GradesSkeleton />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
            {forbidden ? (
              <StateView
                icon="lock"
                tone="brand"
                title="У вас нет доступа к оценкам этого урока"
                subtitle="Оценки видят администратор и учителя урока"
                actionLabel="Вернуться к уроку"
                onAction={onBack}
              />
            ) : (
              <StateView
                icon="alertTriangle"
                tone="warn"
                title="Не удалось загрузить"
                subtitle="Проверьте соединение и попробуйте снова"
                actionLabel="Повторить"
                onAction={() => reload()}
              />
            )}
          </View>
        )}
      </Screen>
    );
  }

  const cancelled = lesson?.status === 'CANCELLED' || sheet?.writeState === 'LESSON_CANCELLED';
  const canManage = Boolean(sheet?.canManageGrades);
  const maxGrades = sheet?.maxGradesPerStudent ?? 3;
  const banner = cancelled ? null : writeStateBanner(sheet);
  const audience = [lesson?.className, lesson?.subgroupName].filter(Boolean).join(' · ');

  async function pickValue(scaleCode, gradeType) {
    setSheetError(null);
    const message = pickedGrade
      ? await updateGrade(pickedGrade.id, scaleCode, pickedGrade.gradeType ?? null)
      : await createGrade(picker.studentProfileId, scaleCode, gradeType ?? null);
    if (message) setSheetError(message);
    else closePicker();
  }

  /** Тип у существующей оценки сохраняется сразу — отдельной кнопки в макете нет. */
  async function pickType(type) {
    if (!pickedGrade) return;
    setSheetError(null);
    const message = await updateGrade(pickedGrade.id, pickedGrade.scaleCode, type);
    if (message) setSheetError(message);
  }

  async function remove() {
    if (!pickedGrade) return;
    setSheetError(null);
    const message = await removeGrade(pickedGrade.id);
    if (message) setSheetError(message);
    else closePicker();
  }

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + 96 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <BackRow onBack={onBack} />

      <View style={{ padding: 16, gap: 12 }}>
        {error ? (
          <Txt style={{ fontSize: 12, color: c.red }}>
            Не удалось обновить — показаны последние загруженные данные
          </Txt>
        ) : null}

        {/* Шапка — Figma `step-1-info` */}
        <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt style={{ flex: 1, fontSize: 22, fontWeight: '700', color: c.blue }}>Оценки</Txt>
            {cancelled ? null : (
              <View
                style={{
                  backgroundColor: c.bg2,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Txt style={{ fontSize: 10, fontWeight: '700', color: c.ink2 }}>
                  {sheetBadge(sheet)}
                </Txt>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }} numberOfLines={1}>
              {lesson?.subject || 'Урок'}
            </Txt>
            {lesson?.badge ? (
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Txt style={{ fontSize: 11, fontWeight: '700', color: c.ink2 }}>
                  {lesson.badge.label}
                </Txt>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink2 }}>
              {lesson?.timeRange || ''}
            </Txt>
          </View>

          {audience ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="users" size={16} color={c.ink3} strokeWidth={2} />
              <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink2 }}>{audience}</Txt>
            </View>
          ) : null}
        </View>

        {banner ? <AccessBanner banner={banner} /> : null}
      </View>

      {cancelled ? (
        <LessonCancelledState />
      ) : rows.length === 0 ? (
        <EmptyRosterState />
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Список учеников</Txt>
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              overflow: 'hidden',
            }}
          >
            {rows.map((row) => (
              <LessonGradeRow
                key={row.studentProfileId}
                row={row}
                maxGrades={maxGrades}
                canManage={canManage}
                openSlot={picker?.studentProfileId === row.studentProfileId ? picker.slot : null}
                onOpen={(slot, grade) => {
                  setSheetError(null);
                  setPicker({
                    studentProfileId: row.studentProfileId,
                    slot,
                    gradeId: grade?.id ?? null,
                  });
                }}
              />
            ))}
          </View>
        </View>
      )}

      <LessonGradeSheet
        visible={Boolean(picker)}
        studentName={picked?.fullName || ''}
        slotLabel={picker ? `Оценка ${picker.slot + 1}` : ''}
        scale={scale}
        grade={pickedGrade}
        busy={busy}
        error={sheetError}
        onPickValue={pickValue}
        onPickType={pickType}
        onRemove={remove}
        onClose={closePicker}
      />
    </Screen>
  );
}
