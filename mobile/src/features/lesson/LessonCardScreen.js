import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Pill, Banner, OutlineButton } from '@shared/components/ui';
import { EditableField, LessonActionTile } from '@shared/ui/rows';
import { useLesson, useLessonEditing } from '@shared/hooks/useLesson';
import { countLabel, plural } from '@shared/format';
import { useLessonAttendanceSheet } from '@shared/hooks/useAttendance';
import { useTeacherLessonHomework } from '@shared/hooks/useTeacherHomework';
import { sheetStateLabel } from '@shared/api/attendanceMap';
import { sheetBadge } from '@shared/api/gradesMap';
import {
  homeworkNeedsTeacherAction,
  homeworkStateColor,
  homeworkStateLabel,
} from '@shared/api/lessonHomeworkState';
import { useLessonGrades } from '@shared/hooks/useGrades';
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
 * Подпись плитки ДЗ. Первым словом — состояние урока, а не число заданий: плитку читают,
 * чтобы понять, закрыт ли вопрос с домашним заданием, и «2 задания» на уроке, где всё
 * лежит в черновиках, отвечало на другой вопрос.
 *
 * Черновик назван отдельно потому, что для учеников его не существует.
 */
function homeworkTileValue(state, homeworkState) {
  if (state.loading) return 'Загружаем…';
  if (state.error) return 'Нет данных';
  const label = homeworkStateLabel(homeworkState);
  if (state.rows.length === 0) return label || 'Заданий нет';
  const drafts = state.rows.filter((row) => row.status === 'DRAFT').length;
  const total = `${state.rows.length} ${plural(state.rows.length, ['задание', 'задания', 'заданий'])}`;
  const counts = drafts > 0 ? `${total} · ${drafts} черн.` : total;
  return label ? `${label} · ${counts}` : counts;
}

/**
 * Состояние блока ДЗ и единственное действие, которого у урока раньше не было, —
 * «ДЗ не задано».
 *
 * Стоит в учебной части рядом с темой и комментарием, а не у плитки: это такое же
 * решение учителя по уроку, и закрывается оно здесь, не уходя на другой экран.
 *
 * Кнопки нет при выданном ДЗ: бэкенд отвечает 409 — два финальных состояния
 * одновременно ТЗ запрещает, и предлагать заведомо невозможное нажатие нельзя.
 */
function HomeworkStateRow({ state, canEdit, saving, onMark, onClear }) {
  const { c } = useTheme();
  if (!state) return null;

  return (
    <View style={{ gap: 8 }}>
      {/* Разделитель внутри, а не снаружи: без состояния строки нет, и висящая
          линия читалась бы как пустой раздел. */}
      <View style={{ height: 1, backgroundColor: c.border, marginBottom: 4 }} />
      <Txt style={{ fontSize: 12, fontWeight: '600', color: c.ink3 }}>Домашнее задание</Txt>

      {/* Столбиком, а не строкой с кнопкой справа: «Домашнее задание пока не указано»
          и «ДЗ не задано» вместе шире карточки на телефоне, а строка в React Native
          детей не сжимает — кнопку выносило за край. Сокращать формулировку нельзя,
          она общая с вебом и взята из ТЗ. */}
      <Pill color={homeworkStateColor(state)}>{homeworkStateLabel(state)}</Pill>

      {canEdit && homeworkNeedsTeacherAction(state) ? (
        <Txt style={{ fontSize: 12, fontWeight: '400', color: c.ink3 }}>
          Действие по ДЗ не завершено
        </Txt>
      ) : null}

      {canEdit && state !== 'ASSIGNED' ? (
        <OutlineButton
          style={{ alignSelf: 'flex-start', marginTop: 2 }}
          disabled={saving}
          onPress={state === 'NOT_ASSIGNED' ? onClear : onMark}
        >
          {state === 'NOT_ASSIGNED' ? 'Отменить отметку' : 'ДЗ не задано'}
        </OutlineButton>
      ) : null}
    </View>
  );
}

/**
 * Подпись плитки оценок: скольким ученикам уже что-то поставили.
 *
 * Считается по строкам листа, а не по числу оценок: за урок ученику ставят до трёх, и
 * «7 оценок» на классе из 25 не отвечает на вопрос «кого я ещё не оценил».
 */
/**
 * Подпись плитки материалов. Ноль назван словами, а не «0 материалов»: плитка всё равно
 * открывается — там учителю сказано, где их прикладывают.
 */
function materialsTileValue(count) {
  if (!count) return 'Материалов нет';
  return countLabel(count, ['материал', 'материала', 'материалов']);
}

function gradesTileValue(lesson, sheet, loading) {
  if (lesson?.status === 'CANCELLED') return 'Недоступны — урок отменён';
  if (!lesson?.can?.viewGrades) return 'Нет доступа';
  if (loading) return 'Загружаем…';
  if (!sheet) return 'Не выставлены';
  const rows = sheet.students || [];
  if (rows.length === 0) return 'В уроке нет учеников';
  return rows.some((row) => (row.grades || []).length > 0) ? sheetBadge(sheet) : 'Не выставлены';
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
  // Лист оценок — тоже отдельный запрос и тоже только при праве на него: подпись
  // плитки должна говорить «оценено 7 из 25», а не «оценки», иначе переход слепой.
  const { loading: gradesLoading, sheet: gradesSheet } = useLessonGrades(lessonId, {
    enabled: Boolean(lesson?.can.viewGrades),
  });
  // Задания урока приходят своим запросом: в карточке урока лежит только отметка «сделал»
  // из LESSON-002, а выданные задания живут в модуле ДЗ. Спрашиваем их лишь у того, кто
  // урок ведёт: остальным этот список бэкенд не отдаёт.
  const lessonHomework = useTeacherLessonHomework(lessonId, {
    enabled: Boolean(lesson?.can.editTeaching),
  });
  const reloadLessonHomework = lessonHomework.reload;
  const [sheet, setSheet] = useState(null); // 'topic' | 'comment' | null

  // Возврат с листа посещаемости или из заданий урока — состояние плитки могло
  // измениться там, а не здесь. Карточка перечитывается вместе с ними: публикация
  // задания снимает отметку «ДЗ не задано», и `homeworkState` живёт в самой карточке.
  // Первый показ пропускается: хуки уже сходили за данными при монтировании, и второй
  // запрос на открытие карточки был бы чистым дублем.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) {
        reloadAttendance();
        reloadLessonHomework(true);
        reload(true);
      } else {
        focusedBefore.current = true;
      }
    }, [reloadAttendance, reloadLessonHomework, reload]),
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
          <HomeworkStateRow
            state={lesson.homeworkState}
            canEdit={canEdit}
            saving={editing.saving}
            onMark={editing.markHomeworkNotAssigned}
            onClear={editing.clearHomeworkNotAssigned}
          />
        </View>

        {/* Разделы урока. Все четыре плитки читают бэк; каждая ведёт на свой экран,
            и активна лишь та, чей экран смотрящему положен. */}
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
              value={homeworkTileValue(lessonHomework, lesson.homeworkState)}
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
            {/* Подпись — счётчик из карточки: он уже посчитан по правам смотрящего,
                и отдельный запрос за списком ради числа был бы лишним кругом к серверу
                на каждом открытии урока. */}
            <LessonActionTile
              icon="paperclip"
              tint="blue"
              label="Материалы"
              value={materialsTileValue(lesson.materialCount)}
              onPress={() => nav?.('lesson-materials', {
                lessonInstanceId: lessonId,
                // Пустое состояние учителю и ученику говорит разное, а роль экран
                // материалов сам не спрашивает — карточка её уже знает.
                canManage: canEdit,
              })}
            />
            <LessonActionTile
              icon="award"
              tint="red"
              label="Оценки"
              value={gradesTileValue(lesson, gradesSheet, gradesLoading)}
              onPress={lesson.can.viewGrades
                ? () => nav?.('lesson-grades', { lessonInstanceId: lessonId })
                : undefined}
              soon={!lesson.can.viewGrades}
            />
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
