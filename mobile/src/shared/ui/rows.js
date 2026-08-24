import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { Card, Pill, Avatar } from '@shared/components/ui';
import { HexBadge } from '@shared/components/Hex';
import Icon from '@shared/components/Icon';
import { SUBJECT_COLORS } from '@shared/data/mock';
import { shadowSm } from '@shared/components/Screen';
import { GradeChip } from '@shared/ui/grades';

// Resolve a brand colour-name to a theme hex (falls back to muted ink).
export function brandColor(c, name) {
  return {
    green: c.green,
    greenDeep: c.greenDeep,
    blue: c.blue,
    blueDeep: c.blueDeep,
    red: c.red,
    redDeep: c.redDeep,
    gold: c.gold,
    goldDeep: c.goldDeep,
  }[name] || c.ink3;
}

export function softColor(c, name) {
  return { green: c.greenSoft, blue: c.blueSoft, red: c.redSoft, gold: c.goldSoft }[name] || c.bg2;
}

// Outlined status chip from the Figma lesson-card (`status-badge`):
// 1px border + 8%-alpha fill of the same brand colour, 11px bold label.
function StatusBadge({ label, color, tint }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: tint,
      }}
    >
      <Txt style={{ fontSize: 11, fontWeight: '700', color }} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * Figma `attendance-badge` (node 2086:9919 и соседние варианты) — четыре вида
 * отметки. «Нет отметки» — это не пятый вид, а отсутствие чипа: в макете урок
 * без отметки («История», 12:00) просто не показывает ничего справа от предмета.
 *
 * Цвета — из темы (`attPresentTint`/`attPresentInk` и т. д.), а не из литералов:
 * заливка одна на обе темы, контур и текст переключаются вместе со схемой.
 */
const ATTENDANCE = {
  present: { label: 'Посетил', icon: 'check', tint: 'attPresentTint', ink: 'attPresentInk' },
  late: { label: 'Опоздал', icon: 'clock', tint: 'attLateTint', ink: 'attLateInk' },
  absent: { label: 'Пропустил', icon: 'x', tint: 'attAbsentTint', ink: 'attAbsentInk' },
  // Щит — единственный замкнутый контур в наборе: на 10px жирная обводка съедает
  // его внутренность, и глиф превращается в пятно. Открытым «галочке» и «крестику»
  // толщина 3 наоборот нужна, чтобы они не потерялись.
  excused: {
    label: 'Освобождён', icon: 'shield', tint: 'attExcusedTint', ink: 'attExcusedInk', stroke: 2,
  },
};

export function AttendanceBadge({ status }) {
  const { c } = useTheme();
  const v = ATTENDANCE[status];
  if (!v) return null;
  const color = c[v.ink];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Посещаемость: ${v.label.toLowerCase()}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 8,
        paddingRight: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: c[v.tint],
      }}
    >
      <Icon name={v.icon} size={10} color={color} strokeWidth={v.stroke ?? 3} />
      <Txt style={{ fontSize: 11, fontWeight: '700', color }}>{v.label}</Txt>
    </View>
  );
}

// Figma `class-badge` (node 2022:14002) — the class a teacher's lesson belongs to.
// Square-ish (r6) and tinted, unlike the outlined pill used for lesson status.
function ClassBadge({ label }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: c.bg2,
        maxWidth: 110,
      }}
    >
      <Txt style={{ fontSize: 11, fontWeight: '700', color: c.ink }} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * Figma `lesson-card` — time column | accent stripe | details.
 * Student/parent: node 2022:12361. Teacher: node 2022:13993.
 *
 * Status drives the accent stripe and the badge:
 *   done     → grey stripe, whole card at 50% opacity, no badge
 *   now      → orange stripe + «Сейчас»
 *   next     → navy stripe + «Следующий»
 *   upcoming → no stripe, no badge
 *
 * `teacherView` switches to the teacher card: a class badge next to the subject,
 * and a meta line without the teacher's own name.
 *
 * `attendance` ('present' | 'late' | 'absent' | 'excused') renders the attendance
 * badge from node 2086:9882. Per the design it only applies to finished lessons —
 * a lesson that is «Сейчас»/«Следующий» keeps its status badge instead, and a
 * finished lesson without a published mark shows nothing at all.
 *
 * Accepts both API rows (`teacherShort`/`roomLabel` from scheduleMap) and the
 * legacy mock rows (`teacher`/`room`) still used by the home previews.
 */
export function LessonRow({ lesson, onPress, teacherView = false, attendance = null, grades = null }) {
  const { c } = useTheme();
  const status = lesson.status || 'upcoming';
  const done = status === 'done';
  // Отменённый урок не «идёт» и не «следующий»: подсветка расписания на нём
  // врала бы сильнее, чем помогала.
  const cancelled = Boolean(lesson.cancelled);

  const stripeColor = cancelled
    ? c.stripeIdle
    : status === 'now'
      ? c.green
      : status === 'next'
        ? c.blue
        : done
          ? c.stripeIdle
          : null;

  // Student/parent: «Учитель · каб. · подгруппа». Teacher: «подгруппа · каб.»
  // — their own name would be noise on their own schedule.
  // Замена подменяет в мете именно учителя: ученику важно, кто придёт на урок,
  // а не кто числится в расписании. У учителя его собственного ФИО в мете нет,
  // поэтому и замена туда не попадает — она видна бейджем.
  const teacher = lesson.substituteTeacherShort || lesson.teacherShort || lesson.teacher;
  const room = lesson.roomLabel !== undefined ? lesson.roomLabel : lesson.room;
  const metaParts = teacherView
    ? [lesson.subgroupName, room]
    : [teacher, room, lesson.subgroupName];
  const meta = metaParts.filter((p) => p && p !== '—').join(' · ');

  return (
    <Pressable
      onPress={onPress}
      // Without a handler the row is not a destination — kill the press feedback
      // too, so it doesn't look tappable.
      disabled={!onPress}
      style={({ pressed }) => [
        {
          backgroundColor: c.surface,
          borderRadius: 20,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          opacity: done || cancelled ? 0.5 : pressed ? 0.92 : 1,
          ...shadowSm,
          shadowOpacity: 0.03,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
      ]}
    >
      <View style={{ width: 72, gap: 2 }}>
        <Txt style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{lesson.time}</Txt>
        <Txt style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>{lesson.end}</Txt>
      </View>

      {stripeColor ? (
        <View style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', backgroundColor: stripeColor }} />
      ) : null}

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt
              style={{
                flex: 1,
                fontSize: 15,
                fontWeight: '700',
                color: cancelled ? c.ink3 : c.ink,
                textDecorationLine: cancelled ? 'line-through' : 'none',
              }}
              numberOfLines={1}
            >
              {lesson.subject}
            </Txt>
            {teacherView && lesson.className ? <ClassBadge label={lesson.className} /> : null}
          </View>
          {cancelled ? (
            <StatusBadge label="Отменён" color={c.red} tint="rgba(220,38,38,0.08)" />
          ) : null}
          {!cancelled && lesson.substituteTeacher ? (
            <StatusBadge label="Замена" color={c.dotSubstitute} tint="rgba(255,59,48,0.08)" />
          ) : null}
          {!cancelled && status === 'now' ? (
            <StatusBadge label="Сейчас" color={c.green} tint="rgba(245,146,59,0.08)" />
          ) : null}
          {!cancelled && status === 'next' ? (
            <StatusBadge label="Следующий" color={c.blue} tint="rgba(39,65,133,0.08)" />
          ) : null}
          {done && !cancelled && attendance ? <AttendanceBadge status={attendance} /> : null}
          {/* Оценки за этот урок (Figma «Расписание - дневник»): чипы стоят там же, где
              бейдж посещаемости, — обе подписи отвечают на вопрос «что было на уроке». */}
          {!cancelled && grades && grades.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {grades.map((code, index) => (
                <GradeChip key={`${code}-${index}`} value={code} size={28} />
              ))}
            </View>
          ) : null}
        </View>
        {meta ? (
          <Txt style={{ fontSize: 13, fontWeight: '500', color: c.inkMuted }} numberOfLines={2}>
            {meta}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Figma lesson card — a labelled block of text with an optional pencil.
 * Used for «Тема урока» and «Комментарий для учеников».
 *
 * Three shapes, driven by the data rather than by a flag:
 *   value present            → the text
 *   empty, cannot edit       → muted placeholder («Тема не указана»)
 *   empty, can edit          → placeholder + an «+ Добавить …» call to action
 *
 * `onEdit` omitted means the viewer has no edit right — the pencil disappears
 * rather than being shown disabled, so the card stays honest about what it offers.
 */
export function EditableField({ label, value, placeholder, addLabel, onEdit, footer }) {
  const { c } = useTheme();
  const filled = Boolean(value && String(value).trim());

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: c.inkMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
            }}
          >
            {label}
          </Txt>
          <Txt
            style={{
              fontSize: filled ? 14 : 13,
              fontWeight: filled ? '500' : '400',
              lineHeight: 19,
              color: filled ? c.ink : c.ink3,
            }}
          >
            {filled ? value : placeholder}
          </Txt>
        </View>
        {onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: изменить`}
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? c.bg2 : 'transparent',
            })}
          >
            <Icon name="pencil" size={18} color={c.blue} />
          </Pressable>
        ) : null}
      </View>

      {!filled && onEdit && addLabel ? (
        <Pressable accessibilityRole="button" onPress={onEdit} hitSlop={6}>
          <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>{`+ ${addLabel}`}</Txt>
        </Pressable>
      ) : null}

      {footer ? (
        <Txt style={{ fontSize: 11, fontWeight: '400', color: c.ink3 }}>{footer}</Txt>
      ) : null}
    </View>
  );
}

/**
 * Figma lesson card — one of the four tiles (посещаемость / ДЗ / материалы / оценки).
 * Half-width, 36px tinted icon badge, uppercase label over a one-line value.
 *
 * Without `onPress` the tile renders muted and non-interactive: the chevron is
 * replaced by a «Скоро» hint, so an unbuilt section reads as "not yet" instead of
 * as a tap that silently does nothing.
 */
export function LessonActionTile({ icon, tint, label, value, onPress, soon = false }) {
  const { c } = useTheme();
  const interactive = Boolean(onPress) && !soon;

  const body = (
    <>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: softColor(c, tint),
        }}
      >
        <Icon name={icon} size={18} color={brandColor(c, tint)} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: c.inkMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.2,
          }}
          numberOfLines={2}
        >
          {label}
        </Txt>
        <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink }} numberOfLines={1}>
          {value}
        </Txt>
      </View>
      {interactive ? (
        <Icon name="chevronRight" size={16} color={c.ink3} />
      ) : (
        <Txt style={{ fontSize: 10, fontWeight: '700', color: c.ink3 }}>Скоро</Txt>
      )}
    </>
  );

  const style = {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    opacity: interactive ? 1 : 0.65,
  };

  if (!interactive) {
    return (
      <View accessibilityState={{ disabled: true }} style={style}>
        {body}
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.9 }]}>
      {body}
    </Pressable>
  );
}

/**
 * Figma `ModuleCard` — раздел урока во всю ширину: тонированная иконка, подпись и
 * одна строка состояния. Отличие от {@link LessonActionTile} не косметическое: плитка
 * учителя — это кнопка «заполнить», а строка ученика — сводка «что с этим разделом»,
 * поэтому без `onPress` она остаётся обычным текстом, а не «выключенной кнопкой».
 */
export function ModuleRow({ icon, tint, label, value, onPress }) {
  const { c } = useTheme();

  const body = (
    <>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: softColor(c, tint),
        }}
      >
        <Icon name={icon} size={18} color={brandColor(c, tint)} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>{label}</Txt>
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink }} numberOfLines={1}>
          {value}
        </Txt>
      </View>
      {onPress ? <Icon name="chevronRight" size={16} color={c.ink3} /> : null}
    </>
  );

  const style = { flexDirection: 'row', alignItems: 'center', gap: 12 };
  return (
    <Card elevated onPress={onPress} style={style}>
      {body}
    </Card>
  );
}

export function SubjectRow({ subject, onPress }) {
  const { c } = useTheme();
  const subInfo = SUBJECT_COLORS[subject.name] || { color: 'gray' };
  return (
    <Card onPress={onPress} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <HexBadge size={44} fill={brandColor(c, subInfo.color)}>
        <Txt style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>{subject.avg}</Txt>
      </HexBadge>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 15, fontWeight: '600' }}>{subject.name}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {subject.last.map((g, i) => (
            <View
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: g === 5 ? c.greenSoft : g === 4 ? c.goldSoft : c.redSoft,
              }}
            >
              <Txt style={{ fontSize: 11, fontWeight: '700', color: g === 5 ? c.green : g === 4 ? c.goldDeep : c.red }}>{g}</Txt>
            </View>
          ))}
        </View>
      </View>
      {subject.hw > 0 ? <Pill color="red">{`${subject.hw} ДЗ`}</Pill> : null}
    </Card>
  );
}

export function ProfileRow({ icon, title, value, last }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.bg2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Icon name={icon} size={16} color={c.ink2} />
      </View>
      <Txt style={{ flex: 1, fontSize: 14, fontWeight: '500' }}>{title}</Txt>
      {value ? <Txt style={{ fontSize: 13, color: c.ink3, fontWeight: '600' }}>{value}</Txt> : <Icon name="chevronRight" size={16} color={c.ink3} />}
    </View>
  );
}

export function QuickAction({ icon, color, label, onPress }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ flex: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <HexBadge size={40} fill={brandColor(c, color)} icon={icon} iconColor="#fff" iconSize={18} />
      <Txt style={{ flex: 1, fontSize: 13, fontWeight: '700' }}>{label}</Txt>
    </Card>
  );
}

export function QRMockup({ size = 180 }) {
  const { c } = useTheme();
  const cells = 11;
  const gap = 2;
  const cell = (size - gap * (cells - 1)) / cells;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {Array.from({ length: cells * cells }).map((_, i) => {
        const on = ((i * 7) % 11) > 4;
        return (
          <View
            key={i}
            style={{
              width: cell,
              height: cell,
              borderRadius: 2,
              backgroundColor: on ? c.ink : c.bg2,
            }}
          />
        );
      })}
    </View>
  );
}
