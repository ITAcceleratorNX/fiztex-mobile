import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { FilledButton, Pill, ScreenHeader, StateView } from '@shared/components/ui';
import { homeworkStatusChip, progressLabel } from '@shared/api/homeworkMap';
import { useTeacherLessonHomework } from '@shared/hooks/useTeacherHomework';
import { HomeworkSkeleton } from '@features/homework/HomeworkStates';
import { dueRowLabel } from './dueLabel';

/**
 * Задания одного урока у учителя — вход с карточки урока (ТЗ FE-Teacher-002 §2.1).
 *
 * Отдельный экран, а не фильтр общей ленты: сюда приходят из урока и ждут увидеть только
 * его задания, а вкладки «Актуальные / История» здесь были бы лишним шумом. Заданий у
 * урока бывает несколько — связь «урок → ДЗ» намеренно не единичная.
 */
export function TeacherLessonHomeworkScreen({ nav, payload }) {
  const lessonId = payload?.lessonInstanceId ?? payload?.lessonId;
  const { c } = useTheme();
  const { loading, error, rows, reload } = useTeacherLessonHomework(lessonId);
  const [refreshing, setRefreshing] = useState(false);

  // Возврат с правки или с проверки работы: и то и другое меняет то, что здесь показано.
  // Первый показ пропускается — экран только что загрузился сам.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) reload(true);
      else focusedBefore.current = true;
    }, [reload]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  return (
    <Screen scroll={false}>
      <ScreenHeader title="Домашние задания" back={nav.back} sub={payload?.subjectName} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.ink3} />}
      >
        {loading ? (
          <HomeworkSkeleton rows={3} />
        ) : error ? (
          <StateView
            style={{ marginTop: 64 }}
            icon={error === 'forbidden' ? 'lock' : 'alertTriangle'}
            tone={error === 'forbidden' ? 'default' : 'error'}
            title={error === 'forbidden' ? 'Раздел недоступен' : 'Не удалось загрузить'}
            subtitle={
              error === 'forbidden'
                ? 'Задания урока видит тот, кто его ведёт'
                : 'Проверьте подключение к интернету'
            }
            actionLabel={error === 'forbidden' ? null : 'Повторить'}
            onAction={error === 'forbidden' ? null : () => reload()}
          />
        ) : rows.length === 0 ? (
          <StateView
            style={{ marginTop: 64 }}
            title="К этому уроку заданий нет"
            subtitle="Создайте задание — класс и предмет подставятся из урока"
            actionLabel="Создать задание"
            onAction={() => nav('homework-create', { lessonId })}
          />
        ) : (
          <>
            <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: c.surface }}>
              {rows.map((row, index) => (
                <LessonHomeworkRow
                  key={row.id}
                  row={row}
                  first={index === 0}
                  onPress={() => nav('homework-card', { homeworkId: row.id })}
                />
              ))}
            </View>
            <FilledButton onPress={() => nav('homework-create', { lessonId })}>
              Создать ещё задание
            </FilledButton>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function LessonHomeworkRow({ row, first, onPress }) {
  const { c } = useTheme();
  const chip = homeworkStatusChip(row);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Открыть задание «${row.title ?? ''}»`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: c.border,
        backgroundColor: pressed ? c.bg2 : 'transparent',
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }} numberOfLines={1}>
          {row.title}
        </Txt>
        <Txt style={{ fontSize: 12, color: c.ink3 }}>{dueRowLabel(row)}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {chip ? <Pill color={chip.color}>{chip.label}</Pill> : null}
        <Txt style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>{progressLabel(row)}</Txt>
      </View>
    </Pressable>
  );
}
