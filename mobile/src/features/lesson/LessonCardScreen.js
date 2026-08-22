import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Pill, Banner } from '@shared/components/ui';
import { EditableField, LessonActionTile } from '@shared/ui/rows';
import { useLesson, useLessonEditing } from '@shared/hooks/useLesson';
import { useLessonAttendanceSheet } from '@shared/hooks/useAttendance';
import { useTeacherLessonHomework } from '@shared/hooks/useTeacherHomework';
import { sheetStateLabel } from '@shared/api/attendanceMap';
import { TextEditSheet } from '@shared/components/TextEditSheet';
import { LessonCardFallback, LessonCardHeader } from './LessonCardStates';

const TOPIC_MAX = 300;
const COMMENT_MAX = 2000;

/** Строка «иконка + значение», с необязательной пометкой «Изменено» (Figma step-1-info). */
function MetaRow({ icon, children, changed }) {
  const { c } = useTheme();
  if (!children) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={16} color={c.blue} strokeWidth={2} />
      <Txt style={{ fontSize: 14, fontWeight: '400', color: c.ink }}>{children}</Txt>
      {changed ? (
        <Pill color="gold" style={{ paddingVertical: 2, paddingHorizontal: 8, fontSize: 10 }}>
          Изменено
        </Pill>
      ) : null}
    </View>
  );
}

/**
 * Карточка урока — рабочее пространство одного урока (Figma «Учитель · Карточка урока»).
 *
 * Экран один на все роли: что показывать и что разрешено править, решают `capabilities`
 * из ответа бэка, а не роль, вычисленная на клиенте. Поэтому админ видит ту же карточку
 * без карандашей (у него нет EDIT_TEACHING_PART), а замещающий учитель — с ними.
 *
 * `payload` приходит из расписания: строка урока с `lessonInstanceId` (id LessonInstance,
 * а не слота расписания) и статусом, по которому понятно, что урок — следующий.
 */
/**
 * Подпись плитки ДЗ: сколько заданий у урока и сколько из них ещё черновики. Черновик
 * назван отдельно потому, что для учеников его не существует — «2 задания» на уроке, где
 * опубликовано одно, ввело бы в заблуждение самого учителя.
 */
function homeworkTileValue(state) {
  if (state.loading) return 'Загружаем…';
  if (state.error) return 'Нет данных';
  if (state.rows.length === 0) return 'Заданий нет';
  const drafts = state.rows.filter((row) => row.status === 'DRAFT').length;
  const total = `${state.rows.length} ${plural(state.rows.length, ['задание', 'задания', 'заданий'])}`;
  return drafts > 0 ? `${total} · ${drafts} черн.` : total;
}

function plural(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export function LessonCardScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  // Только `lessonInstanceId`. Отката на `payload.lessonId` здесь намеренно нет:
  // это id слота расписания, и карточка по нему открыла бы чужой урок или 404.
  const lessonId = payload?.lessonInstanceId ?? null;
  const highlight = payload?.status === 'next' ? 'next' : null;
  const childId = payload?.childId ?? null;

  const { loading, error, forbidden, lesson, historyCount, reload } = useLesson(lessonId, {
    childId,
    highlight,
  });
  const editing = useLessonEditing(lessonId, reload);
  // Лист посещаемости — отдельный запрос и только при праве на него: без
  // VIEW_ATTENDANCE бэк ответит 403, и ходить туда ради выключенной плитки незачем.
  const {
    loading: attendanceLoading,
    sheet: attendanceSheet,
    reload: reloadAttendance,
  } = useLessonAttendanceSheet(lessonId, {
    enabled: Boolean(lesson?.can.viewAttendance),
  });
  // Задания урока приходят своим запросом: в карточке урока лежит только отметка «сделал»
  // из LESSON-002, а выданные задания живут в модуле ДЗ. Спрашиваем их лишь у того, кто
  // урок ведёт: остальным этот список бэкенд не отдаёт.
  const lessonHomework = useTeacherLessonHomework(lessonId, {
    enabled: Boolean(lesson?.can.editTeaching),
  });
  const [sheet, setSheet] = useState(null); // 'topic' | 'comment' | null

  // Возврат с листа посещаемости — состояние плитки могло измениться там, а не здесь.
  // Первый показ пропускается: хук уже сходил за листом при монтировании, и второй
  // запрос на открытие карточки был бы чистым дублем.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) reloadAttendance();
      else focusedBefore.current = true;
    }, [reloadAttendance]),
  );

  const closeSheet = useCallback(() => {
    setSheet(null);
    editing.clearSaveError();
  }, [editing]);

  const onBack = useCallback(() => nav?.back?.(), [nav]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Лист посещаемости правит не только этот учитель (админ и замещающий — тоже),
      // поэтому обновляется он вместе с карточкой, а не только при входе на экран.
      await Promise.all([reload(true), reloadAttendance()]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadAttendance]);

  // ─── Состояния до карточки ──────────────────────────────────────────────────
  // Экран ошибки — только когда показывать нечего. Если карточка уже на экране,
  // а обновление не прошло, она остаётся, а про сбой сообщает строка ниже.
  if (loading || forbidden || !lesson) {
    return (
      <LessonCardFallback
        kind={loading ? 'loading' : forbidden ? 'forbidden' : 'error'}
        dateLabel={payload?.dateLabel}
        onBack={onBack}
        onRetry={() => reload()}
      />
    );
  }

  // ─── Карточка ───────────────────────────────────────────────────────────────
  const canEdit = lesson.can.editTeaching;
  const audience = [lesson.className, lesson.subgroupName].filter(Boolean).join(' · ');

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + 32 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <LessonCardHeader dateLabel={lesson.dateLabel} onBack={onBack} />

      <View style={{ padding: 16, gap: 12 }}>
        {/* Обновление не прошло, но карточка на экране актуальна на момент
            последней удачной загрузки — говорим об этом, а не стираем её. */}
        {error ? (
          <Banner icon="alertTriangle" tone="soft">
            Не удалось обновить — показаны последние загруженные данные
          </Banner>
        ) : null}

        {lesson.periodClosed ? (
          <Banner icon="lock" tone="solid">
            Период закрыт — только просмотр
          </Banner>
        ) : null}

        {lesson.substituteName ? (
          <Banner icon="swap" tone="soft">
            {`Урок проводит: ${lesson.substituteName} · замена`}
          </Banner>
        ) : null}

        {/* Шапка урока — Figma `step-1-info` */}
        <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {lesson.badge ? <Pill color={lesson.badge.color}>{lesson.badge.label}</Pill> : <View />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt style={{ fontSize: 14, fontWeight: '600', color: c.blue }}>{lesson.timeRange}</Txt>
              {lesson.changed.time ? (
                <Pill color="gold" style={{ paddingVertical: 2, paddingHorizontal: 8, fontSize: 10 }}>
                  Изменено
                </Pill>
              ) : null}
            </View>
          </View>

          <Txt style={{ fontSize: 22, fontWeight: '700', color: c.blue }}>{lesson.subject}</Txt>

          <View style={{ gap: 8 }}>
            <MetaRow icon="users" changed={lesson.changed.subject}>{audience}</MetaRow>
            <MetaRow icon="mapPin" changed={lesson.changed.room}>{lesson.room}</MetaRow>
            <MetaRow icon="userCheck" changed={lesson.changed.teacher}>{lesson.teacherName}</MetaRow>
          </View>

          {lesson.status === 'CANCELLED' && lesson.cancellationComment ? (
            <Txt style={{ fontSize: 13, fontWeight: '400', color: c.red }}>
              {lesson.cancellationComment}
            </Txt>
          ) : null}
        </View>

        {/* Учебная часть — тема и комментарий */}
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, gap: 12 }}>
          <EditableField
            label="Тема урока"
            value={lesson.topic}
            placeholder="Тема не указана"
            addLabel="Добавить тему"
            onEdit={canEdit ? () => setSheet('topic') : undefined}
          />
          <View style={{ height: 1, backgroundColor: c.border }} />
          <EditableField
            label="Комментарий для учеников"
            value={lesson.comment?.body}
            placeholder="Комментария пока нет"
            addLabel="Добавить комментарий"
            onEdit={canEdit ? () => setSheet('comment') : undefined}
            footer={
              lesson.comment
                ? [lesson.comment.author, lesson.comment.stamp].filter(Boolean).join(' · ')
                : null
            }
          />
        </View>

        {/* Разделы урока. Посещаемость читается с бэка; ДЗ, материалы и оценки —
            отдельные домены, которых в API ещё нет, поэтому их плитки неактивны. */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Плитка ведёт на лист посещаемости — но только тому, кому он положен:
                без VIEW_ATTENDANCE экран ответил бы 403, и переход был бы обещанием,
                которого карточка сдержать не может. */}
            <LessonActionTile
              icon="userCheck"
              tint="green"
              label="Посещаемость"
              value={attendanceLoading
                ? 'Загружаем…'
                : sheetStateLabel(attendanceSheet, { cancelled: lesson.status === 'CANCELLED' })}
              onPress={lesson.can.viewAttendance
                ? () => nav?.('attendance', { lessonInstanceId: lessonId })
                : undefined}
              soon={!lesson.can.viewAttendance}
            />
            {/* Плитка ведёт в задания этого урока: их выдают и проверяют там же, где
                в вебе. Подпись — реальное состояние, а не «выдано / не выдано»: у урока
                заданий бывает несколько, и число говорит больше, чем факт наличия. */}
            <LessonActionTile
              icon="bookOpen"
              tint="gold"
              label="Домашнее задание"
              value={homeworkTileValue(lessonHomework)}
              onPress={lesson.can.editTeaching
                ? () => nav?.('lesson-homework', {
                    lessonInstanceId: lessonId,
                    subjectName: lesson.subjectName,
                  })
                : undefined}
              soon={!lesson.can.editTeaching}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LessonActionTile icon="paperclip" tint="blue" label="Материалы" value="Нет файлов" soon />
            <LessonActionTile icon="award" tint="red" label="Оценки" value="Не выставлены" soon />
          </View>
        </View>

        {lesson.can.viewHistory && historyCount != null ? (
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>
              {`История изменений (${historyCount})`}
            </Txt>
            <Icon name="chevronRight" size={16} color={c.ink3} />
          </View>
        ) : null}
      </View>

      <TextEditSheet
        visible={sheet === 'topic'}
        title="Тема урока"
        label="Тема"
        placeholder="Например: Present Perfect — практика"
        initialValue={lesson.topic || ''}
        maxLength={TOPIC_MAX}
        saving={editing.saving}
        error={editing.saveError}
        onSave={async (v) => {
          if (await editing.saveTopic(v)) closeSheet();
        }}
        onDelete={async () => {
          if (await editing.clearTopic()) closeSheet();
        }}
        onClose={closeSheet}
      />

      <TextEditSheet
        visible={sheet === 'comment'}
        title="Комментарий для учеников"
        label="Комментарий"
        placeholder="Что подготовить к уроку"
        initialValue={lesson.comment?.body || ''}
        maxLength={COMMENT_MAX}
        multiline
        saving={editing.saving}
        error={editing.saveError}
        onSave={async (v) => {
          if (await editing.saveComment(v)) closeSheet();
        }}
        onDelete={async () => {
          if (await editing.deleteComment()) closeSheet();
        }}
        onClose={closeSheet}
      />
    </Screen>
  );
}
