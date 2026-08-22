import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  Banner,
  Card,
  FilledButton,
  OutlineButton,
  PickerSheet,
  ScreenHeader,
} from '@shared/components/ui';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkApi } from '@shared/api/homeworkApi';
import {
  useHomeworkSave,
  useTeacherHomeworkCard,
  useTeacherTeachingContext,
} from '@shared/hooks/useTeacherHomework';
import { HomeworkCardSkeleton } from '@features/homework/HomeworkStates';
import { teachingPairs } from './context';

const DUE_TYPES = [
  { value: 'EXACT', label: 'Дата' },
  { value: 'NEXT_LESSON', label: 'До след. урока' },
  { value: 'NONE', label: 'Без срока' },
];

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

/**
 * Создание и правка домашнего задания в приложении (ТЗ HOMEWORK-001 §3, §9, §10).
 *
 * Форма одна на оба случая — разница только в том, чем её заполняют и что уходит на сервер.
 * При правке контекст задания уже определён: класс, предмет и привязку к уроку менять
 * нельзя, бэкенд их и не примет — `PUT` знает только название, описание и срок.
 *
 * Привязка к уроку не косметика: от неё зависит, увидит ли задание тот, кто открыл урок
 * в расписании. Уроки берутся из своего расписания (`/api/schedule/me/week`) — школьные
 * справочники учителю недоступны.
 */
export function TeacherHomeworkFormScreen({ nav, payload }) {
  const editId = payload?.homeworkId;
  const presetLessonId = payload?.lessonId;
  const editing = editId != null;

  const { c } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const card = useTeacherHomeworkCard(editing ? editId : null);
  const context = useTeacherTeachingContext({ enabled: !editing });
  const { save, saving, error, clearError } = useHomeworkSave();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueType, setDueType] = useState('NEXT_LESSON');
  const [dueDate, setDueDate] = useState(() => shiftDays(new Date(), 1));
  const [lessonId, setLessonId] = useState(presetLessonId ?? null);
  /**
   * Задание вне урока (ТЗ HOMEWORK-001 §3.2) — то же, что в вебе: класс и предмет вместо
   * урока, никакой фиктивный урок под него не заводится. Пара выбирается целиком, а не
   * двумя списками: учитель ведёт предмет не во всех своих классах, и свободная
   * комбинация «математика + 9Б» упёрлась бы в отказ сервера уже после сохранения.
   */
  const [standalone, setStandalone] = useState(false);
  const [pairKey, setPairKey] = useState(null);
  const [recipientType, setRecipientType] = useState('CLASS');
  const [tempGroupId, setTempGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [picker, setPicker] = useState(null);

  // Правка начинается с текущих значений, а не с пустой формы.
  useEffect(() => {
    const homework = card.homework;
    if (!editing || !homework) return;
    setTitle(homework.title ?? '');
    setDescription(homework.description ?? '');
    setDueType(homework.dueType ?? 'NONE');
    if (homework.dueAt) setDueDate(new Date(homework.dueAt));
  }, [editing, card.homework]);

  const lessons = context.lessons;
  const lesson = useMemo(
    () => lessons.find((item) => item.lessonInstanceId === lessonId) ?? null,
    [lessons, lessonId],
  );

  const pairs = useMemo(() => teachingPairs(lessons), [lessons]);

  const pair = useMemo(() => pairs.find((item) => item.key === pairKey) ?? null, [pairs, pairKey]);

  // Контекст задания: урок либо пара. Дальше экран смотрит только сюда — правила
  // получателей и групп у обоих входов одни и те же.
  const targetClassId = standalone ? pair?.classId : lesson?.classId;
  const targetSubjectId = standalone ? pair?.subjectId : lesson?.subjectId;

  // Предвыбор — ближайший урок: задание выдают на уроке или сразу после него. Выбор
  // остаётся видимым и меняемым, включая «без привязки».
  useEffect(() => {
    if (editing || presetLessonId || lessons.length === 0 || standalone) return;
    setLessonId((current) => current ?? nearestLesson(lessons)?.lessonInstanceId ?? null);
  }, [editing, presetLessonId, lessons, standalone]);

  // Временные группы существуют у пары «класс + предмет», а её задаёт выбранный урок.
  useEffect(() => {
    let cancelled = false;
    if (!token || targetClassId == null) {
      setGroups([]);
      return undefined;
    }
    homeworkApi
      .groups(token, targetClassId, targetSubjectId)
      .then((list) => {
        if (!cancelled) setGroups(list ?? []);
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, targetClassId, targetSubjectId]);

  // Задание из урока подгруппы по умолчанию адресовано этой подгруппе.
  useEffect(() => {
    if (!editing && lesson?.subgroupId) setRecipientType('SUBGROUP');
  }, [editing, lesson]);

  const valid = title.trim().length > 0
    && description.trim().length > 0
    && (editing || (standalone ? pair != null : lessonId != null))
    && (recipientType !== 'TEMP_GROUP' || tempGroupId != null);

  const onSave = useCallback(async (publish) => {
    clearError();
    const body = editing
      ? {
          title: title.trim(),
          description: description.trim(),
          dueType,
          dueAt: dueType === 'EXACT' ? endOfDay(dueDate).toISOString() : undefined,
        }
      : {
          // Либо урок, либо класс с предметом: у контекста задания один источник, и слать
          // и то и другое значило бы спорить с бэкендом о том, к чему задание относится.
          lessonId: standalone ? undefined : lessonId,
          classId: standalone ? pair?.classId : undefined,
          subjectId: standalone ? pair?.subjectId : undefined,
          title: title.trim(),
          description: description.trim(),
          recipientType,
          tempGroupId: recipientType === 'TEMP_GROUP' ? tempGroupId : undefined,
          dueType,
          dueAt: dueType === 'EXACT' ? endOfDay(dueDate).toISOString() : undefined,
        };

    const saved = await save({ homeworkId: editId, body, publish });
    if (!saved) return;
    // Возврат туда, откуда пришли, а не переход в карточку: экран, с которого открыли
    // форму, перечитывает себя на фокусе и сразу показывает результат. Иначе форма
    // осталась бы в стеке под карточкой, и «назад» приводило бы к ней с теми же полями.
    nav.back();
  }, [clearError, editing, title, description, dueType, dueDate, lessonId, standalone, pair,
      recipientType, tempGroupId, save, editId, nav]);

  if (editing && card.loading) {
    return (
      <Screen>
        <ScreenHeader title="Редактирование" back={nav.back} />
        <HomeworkCardSkeleton />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScreenHeader title={editing ? 'Редактирование' : 'Новое задание'} back={nav.back} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 140, gap: 12 }}>
          {error ? <Banner icon="alertTriangle" tone="soft">{error}</Banner> : null}

          {editing ? (
            <Card elevated style={{ gap: 4 }}>
              <Txt style={{ fontSize: 12, fontWeight: '700', color: c.ink3, textTransform: 'uppercase' }}>
                Задание
              </Txt>
              <Txt style={{ fontSize: 14, color: c.ink }}>
                {[card.homework?.subjectName, card.homework?.className].filter(Boolean).join(' · ')}
              </Txt>
              <Txt style={{ fontSize: 12, color: c.ink3 }}>
                Класс, предмет и привязку к уроку после создания не меняют.
              </Txt>
            </Card>
          ) : (
            <Card elevated style={{ gap: 10 }}>
              <FieldLabel>Урок</FieldLabel>
              <SelectRow
                label={standalone ? 'Без привязки к уроку' : lesson ? lessonLabel(lesson) : 'Выберите урок'}
                muted={!standalone && !lesson}
                disabled={context.loading || (lessons.length === 0 && pairs.length === 0)}
                onPress={() => setPicker('lesson')}
              />

              {standalone ? (
                <>
                  <FieldLabel>Класс и предмет</FieldLabel>
                  <SelectRow
                    label={pair ? pair.label : 'Выберите класс и предмет'}
                    muted={!pair}
                    disabled={pairs.length === 0}
                    onPress={() => setPicker('pair')}
                  />
                </>
              ) : null}

              <Txt style={{ fontSize: 12, color: c.ink3, lineHeight: 17 }}>
                {context.loading
                  ? 'Загружаем расписание…'
                  : lessons.length === 0
                    ? 'В ближайшие две недели уроков нет — выбирать не из чего.'
                    : standalone
                      ? 'Задание не привязано к уроку. На карточке урока оно появится только по сроку сдачи — в день того урока, к которому его сдают.'
                      : 'Класс и предмет берутся из урока. Задание появится на его карточке — и у вас, и у учеников.'}
              </Txt>
            </Card>
          )}

          <Card elevated style={{ gap: 10 }}>
            <FieldLabel>Название</FieldLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Например: Параграф 12, упражнения 1–5"
              placeholderTextColor={c.ink3}
              maxLength={300}
              style={inputStyle(c)}
            />

            <FieldLabel>Описание и инструкция</FieldLabel>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Что нужно сделать и как сдать"
              placeholderTextColor={c.ink3}
              maxLength={4000}
              multiline
              style={{ ...inputStyle(c), minHeight: 120, textAlignVertical: 'top', paddingTop: 12 }}
            />
          </Card>

          <Card elevated style={{ gap: 10 }}>
            <FieldLabel>Срок сдачи</FieldLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DUE_TYPES.map((item) => {
                const selected = item.value === dueType;
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setDueType(item.value)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? c.ink : c.bg2,
                    }}
                  >
                    <Txt style={{ fontSize: 12, fontWeight: '700', color: selected ? c.surface : c.inkMuted }}>
                      {item.label}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>

            {dueType === 'EXACT' ? (
              <DayStepper value={dueDate} onChange={setDueDate} />
            ) : dueType === 'NEXT_LESSON' ? (
              <Txt style={{ fontSize: 12, color: c.ink3, lineHeight: 17 }}>
                Дату подставит сервер при публикации — по ближайшему уроку этого предмета.
                Если урока впереди не окажется, публикация попросит выбрать дату.
              </Txt>
            ) : (
              <Txt style={{ fontSize: 12, color: c.ink3 }}>Задание останется без дедлайна.</Txt>
            )}
          </Card>

          {!editing ? (
            <Card elevated style={{ gap: 10 }}>
              <FieldLabel>Получатели</FieldLabel>
              <SelectRow
                label={recipientLabel(recipientType, lesson, groups, tempGroupId)}
                onPress={() => setPicker('recipients')}
              />
              {recipientType === 'TEMP_GROUP' && groups.length === 0 ? (
                <Txt style={{ fontSize: 12, color: c.ink3 }}>
                  Временных групп у этого класса нет — их собирают в веб-версии.
                </Txt>
              ) : null}
            </Card>
          ) : null}
        </ScrollView>

        <View
          style={{
            padding: 16,
            paddingBottom: insets.bottom + 16,
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: c.border,
            backgroundColor: c.surface,
          }}
        >
          {editing ? (
            <FilledButton disabled={!valid || saving} onPress={() => onSave(false)}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </FilledButton>
          ) : (
            <>
              <FilledButton disabled={!valid || saving} onPress={() => onSave(true)}>
                {saving ? 'Сохраняем…' : 'Опубликовать'}
              </FilledButton>
              <OutlineButton size="lg" disabled={!valid || saving} onPress={() => onSave(false)}>
                Сохранить черновик
              </OutlineButton>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <PickerSheet
        visible={picker === 'lesson'}
        title="Урок"
        value={standalone ? 'none' : lessonId}
        options={[
          { value: 'none', label: 'Без привязки к уроку', hint: 'Класс и предмет выбираются отдельно' },
          ...lessons.map((item) => ({ value: item.lessonInstanceId, label: lessonLabel(item) })),
        ]}
        onSelect={(value) => {
          const withoutLesson = value === 'none';
          setStandalone(withoutLesson);
          setLessonId(withoutLesson ? null : value);
          // Получатели считаются от контекста: у прежнего урока могла быть подгруппа,
          // а у нового контекста её нет — оставленный выбор стал бы недействительным.
          setRecipientType('CLASS');
          setTempGroupId(null);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />

      <PickerSheet
        visible={picker === 'pair'}
        title="Класс и предмет"
        value={pairKey}
        options={pairs.map((item) => ({ value: item.key, label: item.label }))}
        onSelect={(value) => {
          setPairKey(value);
          setRecipientType('CLASS');
          setTempGroupId(null);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />

      <PickerSheet
        visible={picker === 'recipients'}
        title="Получатели"
        value={recipientType === 'TEMP_GROUP' ? `group:${tempGroupId}` : recipientType}
        options={[
          { value: 'CLASS', label: 'Весь класс' },
          // Подгруппа приходит из урока: у задания вне урока её взять неоткуда.
          ...(!standalone && lesson?.subgroupId
            ? [{ value: 'SUBGROUP', label: `Подгруппа урока${lesson.subgroupName ? ` · ${lesson.subgroupName}` : ''}` }]
            : []),
          ...groups.map((group) => ({
            value: `group:${group.id}`,
            label: `${group.name}${group.studentCount != null ? ` · ${group.studentCount} уч.` : ''}`,
          })),
        ]}
        onSelect={(value) => {
          if (typeof value === 'string' && value.startsWith('group:')) {
            setRecipientType('TEMP_GROUP');
            setTempGroupId(Number(value.slice('group:'.length)));
          } else {
            setRecipientType(value);
            setTempGroupId(null);
          }
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

function FieldLabel({ children }) {
  const { c } = useTheme();
  return (
    <Txt style={{ fontSize: 12, fontWeight: '700', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {children}
    </Txt>
  );
}

function inputStyle(c) {
  return {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    fontSize: 15,
    color: c.ink,
    backgroundColor: c.bg,
  };
}

function SelectRow({ label, muted, disabled, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
        backgroundColor: c.bg,
      })}
    >
      <Txt style={{ flex: 1, fontSize: 15, color: muted ? c.ink3 : c.ink }} numberOfLines={1}>
        {label}
      </Txt>
      <Icon name="chevronDown" size={16} color={c.ink3} />
    </Pressable>
  );
}

/**
 * Выбор даты стрелками, а не календарём: библиотеки пикера в зависимостях нет, а вводить
 * дату руками на телефоне — верный способ ошибиться месяцем. Срок ставится на конец
 * выбранного дня: «сдать до конца дня» — то, как дедлайн понимают и учитель, и ученик.
 */
function DayStepper({ value, onChange }) {
  const { c } = useTheme();
  const presets = [
    { label: 'Завтра', days: 1 },
    { label: 'Через 3 дня', days: 3 },
    { label: 'Через неделю', days: 7 },
  ];

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <StepButton icon="chevronLeft" onPress={() => onChange(shiftDays(value, -1))} />
        <View
          style={{
            flex: 1,
            height: 46,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.bg,
          }}
        >
          <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{dayLabel(value)}</Txt>
          <Txt style={{ fontSize: 11, color: c.ink3 }}>до 23:59</Txt>
        </View>
        <StepButton icon="chevronRight" onPress={() => onChange(shiftDays(value, 1))} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {presets.map((preset) => (
          <Pressable
            key={preset.label}
            accessibilityRole="button"
            onPress={() => onChange(shiftDays(new Date(), preset.days))}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.bg2,
            }}
          >
            <Txt style={{ fontSize: 12, fontWeight: '600', color: c.inkMuted }}>{preset.label}</Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StepButton({ icon, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'chevronLeft' ? 'На день раньше' : 'На день позже'}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.bg2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={18} color={c.ink} />
    </Pressable>
  );
}

function shiftDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function endOfDay(date) {
  const end = new Date(date);
  end.setHours(23, 59, 0, 0);
  return end;
}

function dayLabel(date) {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function lessonLabel(lesson) {
  const date = lesson.date ? new Date(`${lesson.date}T12:00:00`) : null;
  return [
    lesson.subjectName,
    date ? dayLabel(date) : null,
    lesson.startTime ? lesson.startTime.slice(0, 5) : null,
    lesson.subgroupName || lesson.className,
  ]
    .filter(Boolean)
    .join(' · ');
}

function nearestLesson(lessons) {
  const now = Date.now();
  return [...lessons].sort(
    (a, b) => Math.abs(startMs(a) - now) - Math.abs(startMs(b) - now),
  )[0];
}

function startMs(lesson) {
  const parsed = new Date(`${lesson.date}T${lesson.startTime || '00:00:00'}`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function recipientLabel(type, lesson, groups, tempGroupId) {
  if (type === 'SUBGROUP') {
    return `Подгруппа урока${lesson?.subgroupName ? ` · ${lesson.subgroupName}` : ''}`;
  }
  if (type === 'TEMP_GROUP') {
    const group = groups.find((item) => item.id === tempGroupId);
    return group ? `Группа · ${group.name}` : 'Выберите группу';
  }
  return 'Весь класс';
}
