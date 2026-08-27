import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { shadowSm } from '@shared/components/Screen';
import { initialsOf, childPillLabel, homeLessonWindow } from './homeDate';

/**
 * Общие блоки главного экрана (Figma `glavnaya-*`).
 *
 * Три роли делят шапку, карточку расписания и плитку оценок — различаются только
 * данными и составом строки. Поэтому здесь примитивы, а роли живут отдельными
 * экранами: развилка `if (role === …)` внутри одного экрана разошлась бы с макетами
 * при первой же правке одного из них.
 */

/** Шапка: имя и школьная дата. */
export function HomeHeader({ title, subtitle, topGap = 8 }) {
  const { c } = useTheme();
  // Отступ сверху — только этот: сам безопасный отступ под чёлку добавляет `Screen`,
  // и дублировать его в contentStyle нельзя — там он затирает системный.
  return (
    <View style={{ gap: 4, paddingLeft: 4, marginTop: topGap }}>
      <Txt style={{ fontSize: 24, fontWeight: '800', color: c.blue, letterSpacing: -0.4 }}>
        {title}
      </Txt>
      {subtitle ? (
        <Txt style={{ fontSize: 14, fontWeight: '500', color: c.inkMuted }}>{subtitle}</Txt>
      ) : null}
    </View>
  );
}

/**
 * Заголовок секции. У учителя он мельче (16/600) — так в макете: его экран плотнее,
 * и одинаковый с ученическим кегль ломал бы ритм пятистрочного расписания.
 */
export function HomeSectionTitle({ children, compact = false }) {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        fontSize: compact ? 16 : 18,
        fontWeight: compact ? '600' : '700',
        color: c.ink,
        paddingLeft: compact ? 0 : 4,
      }}
    >
      {children}
    </Txt>
  );
}

/** Белая карточка со скруглением 20 — контейнер расписания и плитки оценок. */
function SurfaceCard({ children, radius = 20, padding = 16, style }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radius,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Строка урока у ученика и родителя: предмет, время с кабинетом, учитель.
 *
 * Чип оценки справа появляется только там, где оценка уже выставлена и опубликована —
 * пустой чип на каждом уроке превратил бы список в сетку прочерков.
 */
function LearnerLessonRow({ lesson, grades, last, onPress }) {
  const { c } = useTheme();
  const meta = [
    lesson.time && lesson.end ? `${lesson.time} - ${lesson.end}` : lesson.time,
    lesson.roomLabel,
  ].filter(Boolean).join(' · ');
  const teacher = lesson.substituteTeacherShort || lesson.teacherShort;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <Txt
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: lesson.cancelled ? c.ink3 : c.ink,
            textDecorationLine: lesson.cancelled ? 'line-through' : 'none',
          }}
        >
          {lesson.subject}
        </Txt>
        {meta ? (
          <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink2 }}>{meta}</Txt>
        ) : null}
        {teacher ? (
          <Txt style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>
            {lesson.substituteTeacherShort ? `Замена · ${teacher}` : teacher}
          </Txt>
        ) : null}
      </View>
      {grades?.length ? <GradeChip code={grades[grades.length - 1]} /> : null}
    </Pressable>
  );
}

function GradeChip({ code }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        minWidth: 32,
        height: 32,
        paddingHorizontal: 6,
        borderRadius: 8,
        backgroundColor: c.blue,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{code}</Txt>
    </View>
  );
}

/** Карточка «Сегодня» ученика и родителя. */
export function LearnerLessonsCard({ lessons, gradesByLesson, onOpenLesson, onShowAll, emptyText }) {
  const { c } = useTheme();
  const { visible, hidden, fromStart } = homeLessonWindow(lessons);
  return (
    <SurfaceCard>
      {visible.length === 0 ? (
        <Txt style={{ fontSize: 14, color: c.inkMuted, paddingVertical: 12 }}>{emptyText}</Txt>
      ) : (
        <>
          {!fromStart ? <EarlierLessonsHint /> : null}
          {visible.map((lesson, i) => (
            <LearnerLessonRow
              key={lesson.lessonInstanceId ?? `${lesson.lessonId}-${i}`}
              lesson={lesson}
              grades={gradesByLesson?.[lesson.lessonInstanceId]}
              last={i === visible.length - 1}
              onPress={lesson.lessonInstanceId ? () => onOpenLesson?.(lesson) : null}
            />
          ))}
        </>
      )}
      <Pressable
        onPress={onShowAll}
        style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 2 }}
      >
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.green }}>
          {hidden > 0 ? showAllLabel(hidden) : 'Показать всё расписание'}
        </Txt>
      </Pressable>
    </SurfaceCard>
  );
}

/**
 * Подпись ссылки, когда день не поместился. Число в ней важнее слова «всё»:
 * «ещё 6 уроков» отвечает на вопрос «я всё увидел?», а «показать всё» — нет.
 */
function showAllLabel(hidden) {
  const n = Math.abs(hidden) % 100;
  const tail = n % 10;
  let word = 'уроков';
  if (n < 11 || n > 14) {
    if (tail === 1) word = 'урок';
    else if (tail >= 2 && tail <= 4) word = 'урока';
  }
  return `Ещё ${hidden} ${word} · всё расписание`;
}

/** Окно начинается не с утра — говорим об этом, иначе список выглядит обрезанным. */
function EarlierLessonsHint() {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        fontSize: 12,
        fontWeight: '500',
        color: c.ink3,
        paddingBottom: 8,
      }}
    >
      Прошедшие уроки — в расписании
    </Txt>
  );
}

/**
 * Строка расписания учителя: время, «класс предмет», кабинет.
 *
 * Учителю важно не «что за предмет», а «куда идти и к кому»: класс стоит перед
 * предметом, кабинет вынесен вправо отдельной колонкой.
 */
export function TeacherAgendaCard({ lessons, onOpenLesson, onShowAll, emptyText }) {
  const { c } = useTheme();
  const { visible, hidden, fromStart } = homeLessonWindow(lessons);
  return (
    <SurfaceCard radius={12} style={shadowSm}>
      {visible.length === 0 ? (
        <Txt style={{ fontSize: 14, color: c.inkMuted, paddingVertical: 12 }}>{emptyText}</Txt>
      ) : (
        <>
        {!fromStart ? <EarlierLessonsHint /> : null}
        {visible.map((lesson, i) => (
          <View key={lesson.lessonInstanceId ?? `${lesson.lessonId}-${i}`}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: c.border }} /> : null}
            <Pressable
              onPress={lesson.lessonInstanceId ? () => onOpenLesson?.(lesson) : null}
              disabled={!lesson.lessonInstanceId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                paddingVertical: 12,
              }}
            >
              <Txt style={{ fontSize: 13, fontWeight: '500', color: c.inkMuted }}>
                {lesson.time}{lesson.end ? ` – ${lesson.end}` : ''}
              </Txt>
              <Txt
                numberOfLines={1}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: '600',
                  color: lesson.cancelled ? c.ink3 : c.ink,
                  textDecorationLine: lesson.cancelled ? 'line-through' : 'none',
                }}
              >
                {[lesson.className, lesson.subject].filter(Boolean).join(' ')}
              </Txt>
              <Txt style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>
                {lesson.roomLabel}
              </Txt>
            </Pressable>
          </View>
        ))}
        </>
      )}
      {hidden > 0 ? (
        <Pressable onPress={onShowAll} style={{ alignItems: 'center', paddingTop: 10 }}>
          <Txt style={{ fontSize: 13, fontWeight: '600', color: c.green }}>
            {showAllLabel(hidden)}
          </Txt>
        </Pressable>
      ) : null}
    </SurfaceCard>
  );
}

/** Плитка «Оценки» ученика и родителя: иконка в кружке, подпись, шеврон. */
export function GradesTile({ title, subtitle, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <SurfaceCard
        radius={16}
        padding={12}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.blueSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="award" size={18} color={c.blue} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{title}</Txt>
          <Txt numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>
            {subtitle}
          </Txt>
        </View>
        <Icon name="chevronRight" size={20} color={c.ink3} strokeWidth={2} />
      </SurfaceCard>
    </Pressable>
  );
}

/** Плитка «Оценки» учителя: заливка без рамки, иконка и шеврон в одну строку сверху. */
export function TeacherGradesTile({ title, subtitle, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: c.bg2, borderRadius: 12, padding: 16, gap: 12 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Icon name="award" size={24} color={c.blue} strokeWidth={2} />
        <Icon name="chevronRight" size={16} color={c.inkMuted} strokeWidth={2} />
      </View>
      <View style={{ gap: 2 }}>
        <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>{title}</Txt>
        <Txt style={{ fontSize: 12, color: c.inkMuted }}>{subtitle}</Txt>
      </View>
    </Pressable>
  );
}

/** Пилюля выбора ребёнка у родителя. Одна кнопка — лист выбора открывает экран. */
export function ChildSwitcherPill({ child, onPress, disabled }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 10,
          paddingRight: 14,
          paddingVertical: 6,
          borderRadius: 24,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
        },
        shadowSm,
      ]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: c.blue,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
          {initialsOf(child?.fullName)}
        </Txt>
      </View>
      <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink }}>
        {childPillLabel(child)}
      </Txt>
      {!disabled ? <Icon name="chevronDown" size={14} color={c.ink2} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}
