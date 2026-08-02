import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Pill, Banner } from '@shared/components/ui';
import { EditableField, LessonActionTile } from '@shared/ui/rows';
import { useLesson, useLessonEditing } from '@shared/hooks/useLesson';
import { LessonEditSheet } from './LessonEditSheet';
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
  const [sheet, setSheet] = useState(null); // 'topic' | 'comment' | null

  const closeSheet = useCallback(() => {
    setSheet(null);
    editing.clearSaveError();
  }, [editing]);

  const onBack = useCallback(() => nav?.back?.(), [nav]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload(true);
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

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

        {/* Разделы урока. Посещаемость, ДЗ, материалы и оценки — отдельные домены,
            которых в API ещё нет, поэтому плитки показаны, но неактивны. */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LessonActionTile icon="userCheck" tint="green" label="Посещаемость" value="Не отмечена" soon />
            <LessonActionTile
              icon="bookOpen"
              tint="gold"
              label="Домашнее задание"
              // Задание уже приходит в карточке (его видит ученик), а вот выдача и правка
              // из приложения — следующий заход, поэтому плитка остаётся неактивной.
              value={lesson.homework ? 'Выдано' : 'Не выдано'}
              soon
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

      <LessonEditSheet
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

      <LessonEditSheet
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
