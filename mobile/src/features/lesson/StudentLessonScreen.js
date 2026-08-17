import React, { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card, Banner } from '@shared/components/ui';
import { ModuleRow } from '@shared/ui/rows';
import { useLesson, useLessonHomework } from '@shared/hooks/useLesson';
import { useMyLessonAttendance } from '@shared/hooks/useAttendance';
import { attendanceLabel } from '@shared/api/attendanceMap';
import { LessonHero } from './LessonHero';
import { LessonCardFallback, LessonCardHeader } from './LessonCardStates';

/** Подпись раздела: маленькая иконка и капсом название (Figma `Label`). */
function CardLabel({ icon, children }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={16} color={c.blue} strokeWidth={2} />
      <Txt style={{ fontSize: 11, fontWeight: '700', color: c.blue, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {children}
      </Txt>
    </View>
  );
}

/**
 * Figma `LessonTopicCard` — что проходят и что учитель просил подготовить.
 *
 * Тема и комментарий у ученика живут одной карточкой, а не двумя полями с подписями, как
 * у учителя: ученик их не правит, ему важно прочитать сообщение целиком.
 */
function TopicCard({ topic, comment }) {
  const { c } = useTheme();
  return (
    <Card elevated style={{ gap: 12 }}>
      <CardLabel icon="bookOpen">Тема урока</CardLabel>
      <View style={{ gap: 10 }}>
        <Txt
          style={{
            fontSize: 14,
            fontWeight: topic ? '600' : '400',
            lineHeight: 20,
            color: topic ? c.ink : c.ink3,
          }}
        >
          {topic || 'Тема не указана'}
        </Txt>
        {comment ? (
          <Txt style={{ fontSize: 13, fontWeight: '400', lineHeight: 20, color: c.inkMuted }}>
            {comment}
          </Txt>
        ) : null}
      </View>
    </Card>
  );
}

/**
 * Figma `HomeworkCard` — задание и отметка о выполнении.
 *
 * Отметка — единственное действие ученика на этом экране, поэтому её состояние читается
 * с бэка (`homework.completed`), а не из локального стейта: то же «готово» видит родитель
 * и считает учитель, и разъехаться они не должны.
 *
 * «Готово ✓» остаётся нажимаемым: промах по кнопке иначе не откатить, а отметку ставит
 * сам ученик — значит, он же вправе её снять.
 */
function HomeworkCard({ homework, canSubmit, saving, error, onDone, onUndo }) {
  const { c } = useTheme();

  return (
    <Card elevated style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.green,
            }}
          >
            <Icon name="bookOpen" size={14} color={c.heroInk} strokeWidth={2.2} />
          </View>
          <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>Домашнее задание</Txt>
        </View>
        {homework?.dueLabel ? (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: c.goldSoft,
            }}
          >
            <Txt style={{ fontSize: 11, fontWeight: '600', color: c.goldDeep }}>
              {homework.dueLabel}
            </Txt>
          </View>
        ) : null}
      </View>

      {homework ? (
        <Txt style={{ fontSize: 14, fontWeight: '400', lineHeight: 21, color: c.ink }}>
          {homework.body}
        </Txt>
      ) : (
        <Txt style={{ fontSize: 14, fontWeight: '400', color: c.ink3 }}>Задание отсутствует</Txt>
      )}

      {error ? (
        <Txt style={{ fontSize: 12, fontWeight: '500', color: c.red }}>{error}</Txt>
      ) : null}

      {homework && !canSubmit ? (
        // Родитель отметку не ставит, поэтому у него не кнопка и не блок во всю ширину,
        // а чип состояния (Figma «Родитель — полный экран», `status-done`).
        <HomeworkStatusChip done={homework.completed} />
      ) : null}

      {homework && canSubmit ? (
        homework.completed ? (
          <DoneBlock onUndo={onUndo} saving={saving} />
        ) : (
          <View style={{ gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onDone}
              style={({ pressed }) => ({
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.green,
                opacity: saving ? 0.6 : pressed ? 0.9 : 1,
              })}
            >
              <Txt style={{ fontSize: 14, fontWeight: '600', color: c.heroInk }}>
                {saving ? 'Сохраняем…' : 'Отметить готово'}
              </Txt>
            </Pressable>

            {/* Фото-отчёт по ДЗ — отдельный модуль (хранилище файлов и проверка учителем).
                Кнопка из макета остаётся на месте, но честно говорит, что ещё не работает. */}
            <View
              accessibilityState={{ disabled: true }}
              style={{
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: c.border,
                opacity: 0.65,
              }}
            >
              <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink3 }}>Прикрепить фото</Txt>
              <Txt style={{ fontSize: 10, fontWeight: '700', color: c.ink3 }}>СКОРО</Txt>
            </View>
          </View>
        )
      ) : null}
    </Card>
  );
}

/**
 * Figma `status-done` (экран родителя) — состояние задания без действия: «Не выполнено»
 * фирменным оранжевым, «Выполнено» — цветом успеха, как блок «Готово» у ученика.
 */
function HomeworkStatusChip({ done }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: done ? c.successSoft : c.greenSoft,
      }}
    >
      <Txt style={{ fontSize: 12, fontWeight: '700', color: done ? c.success : c.green }}>
        {done ? 'Выполнено' : 'Не выполнено'}
      </Txt>
    </View>
  );
}

/** Figma `DoneStatus` — «Готово ✓». Нажимаемо только у того, кто отметку ставил. */
function DoneBlock({ onUndo, saving }) {
  const { c } = useTheme();
  const style = (pressed) => ({
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: c.success,
    backgroundColor: c.successSoft,
    opacity: saving ? 0.6 : pressed ? 0.9 : 1,
  });

  const body = (
    <>
      <Txt style={{ fontSize: 14, fontWeight: '600', color: c.success }}>Готово</Txt>
      <Icon name="check" size={16} color={c.success} strokeWidth={2.6} />
    </>
  );

  if (!onUndo) {
    return <View style={style(false)}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Задание отмечено выполненным. Нажмите, чтобы снять отметку"
      disabled={saving}
      onPress={onUndo}
      style={({ pressed }) => style(pressed)}
    >
      {body}
    </Pressable>
  );
}

/** Подзаголовок родителя: «Ребёнок: Айгерим Б. · 7А» (Figma `child-name-subtitle`). */
function ChildSubtitle({ name, className }) {
  const { c } = useTheme();
  if (!name && !className) return null;
  return (
    <Txt style={{ fontSize: 14, fontWeight: '400', color: c.ink }}>
      <Txt style={{ color: c.inkMuted }}>Ребёнок: </Txt>
      {[name, className].filter(Boolean).join(' · ')}
    </Txt>
  );
}

/**
 * Карточка урока для ученика и родителя (Figma «Ученик / Родитель — полный экран урока»).
 *
 * Экран тот же объект, что и карточка учителя, но другая работа: учитель урок ведёт, а
 * ученик к нему готовится. Отсюда и разница вёрстки — вместо полей с карандашами читаемая
 * шапка, задание с одной кнопкой и сводка разделов. Общее (шапка экрана, скелет, ошибки,
 * загрузка урока) живёт в `LessonCardStates` и `useLesson`, чтобы состояния не разъезжались.
 *
 * Ученик и родитель тоже не разведены по файлам: у родителя те же блоки, но он смотрит на
 * урок чужими глазами — сверху написано, чей это урок, класс из шапки уходит в подзаголовок,
 * а вместо кнопки остаётся состояние задания. Роль берётся из ответа бэка (`viewerRole` и
 * `capabilities`), а не вычисляется на клиенте.
 */
export function StudentLessonScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  // Только id фактического урока: `payload.lessonId` — это слот расписания, по нему
  // карточка открыла бы чужой урок или 404.
  const lessonId = payload?.lessonInstanceId ?? null;
  const highlight = payload?.status === 'next' ? 'next' : null;
  const childId = payload?.childId ?? null;

  const { loading, error, forbidden, lesson, reload } = useLesson(lessonId, { childId, highlight });
  const homework = useLessonHomework(lessonId, reload);
  // Посещаемость живёт своим запросом: она приходит не с карточкой урока, а из
  // модуля посещаемости, и её отсутствие карточку не ломает.
  const {
    loading: attendanceLoading,
    marking,
    reload: reloadAttendance,
  } = useMyLessonAttendance(lessonId, { childId });

  const onBack = useCallback(() => nav?.back?.(), [nav]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Посещаемость — свой запрос, и обновлять её надо вместе с карточкой: учитель
      // публикует лист после урока, и жест «потянуть» затем и делают.
      await Promise.all([reload(true), reloadAttendance()]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadAttendance]);

  // Роль — из ответа бэка: клиент не должен решать «я родитель» по тому, что ему
  // передали childId, иначе экран и права разъедутся на первом же нестандартном заходе.
  const isParent = lesson?.viewerRole === 'PARENT';

  if (loading || forbidden || !lesson) {
    return (
      <LessonCardFallback
        kind={loading ? 'loading' : forbidden ? 'forbidden' : 'error'}
        dateLabel={payload?.dateLabel}
        sections="rows"
        onBack={onBack}
        onRetry={() => reload()}
      />
    );
  }

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + 32 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <LessonCardHeader
        dateLabel={lesson.dateLabel}
        subtitle={isParent
          ? <ChildSubtitle name={payload?.childName} className={lesson.className} />
          : null}
        onBack={onBack}
      />

      <View style={{ padding: 16, gap: 12 }}>
        {/* Обновление не прошло, но карточка на экране актуальна на момент последней
            удачной загрузки — говорим об этом, а не стираем её. */}
        {error ? (
          <Banner icon="alertTriangle" tone="soft">
            Не удалось обновить — показаны последние загруженные данные
          </Banner>
        ) : null}

        <LessonHero lesson={lesson} variant={isParent ? 'parent' : 'student'} />

        <TopicCard topic={lesson.topic} comment={lesson.comment?.body} />

        <HomeworkCard
          homework={lesson.homework}
          canSubmit={lesson.can.submitHomework}
          saving={homework.saving}
          error={homework.error}
          onDone={homework.markDone}
          onUndo={homework.undoDone}
        />

        {/* Посещаемость приходит с бэка; материалы и оценки — отдельные домены,
            которых в API ещё нет, поэтому их строки остаются пустым состоянием. */}
        <ModuleRow
          icon="userCheck"
          tint="green"
          label="Посещаемость"
          // «Не отмечено» покрывает и «учитель ещё не заполнил», и «заполнил, но не
          // опубликовал»: ученику в обоих случаях смотреть не на что, а объяснять ему
          // кухню учительского черновика незачем. Отмена — случай другой: там ждать
          // нечего, и об этом говорится прямо.
          value={attendanceLoading
            ? 'Загружаем…'
            : attendanceLabel(marking, { cancelled: lesson.status === 'CANCELLED' })}
        />
        <ModuleRow icon="paperclip" tint="blue" label="Материалы" value="Нет материалов" />
        <ModuleRow icon="award" tint="red" label="Оценки" value="Не выставлены" />
      </View>
    </Screen>
  );
}
