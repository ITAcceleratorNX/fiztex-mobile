import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Avatar } from '@shared/components/ui';
import { stamp } from '@shared/api/homeworkMap';

/**
 * Список работ учеников (ТЗ HOMEWORK-004 §4, 005.1 §5).
 *
 * Фильтры и подписи вынесены из экрана: то же деление на «Отправили / Возвращено /
 * Выполнено / Не отправили» показывает веб, и расходиться этим двум спискам нельзя.
 */

export const ROSTER_FILTERS = [
  { value: 'ALL', label: 'Все' },
  { value: 'SUBMITTED', label: 'Отправили' },
  { value: 'RETURNED', label: 'Возвращено' },
  { value: 'DONE', label: 'Выполнено' },
  { value: 'NOT_SUBMITTED', label: 'Не отправили' },
];

const STATUS_LABELS = {
  NOT_SUBMITTED: 'Не отправлено',
  SUBMITTED: 'Отправлено',
  RETURNED: 'Возвращено',
  DONE: 'Выполнено',
};

const STATUS_TONES = {
  NOT_SUBMITTED: 'gray',
  SUBMITTED: 'blue',
  RETURNED: 'gold',
  DONE: 'green',
};

/**
 * Отбор идёт на клиенте намеренно: ростер приходит целиком одним запросом — это полный
 * состав получателей, а не страница, и фильтр здесь ничего не прячет за пределами ответа.
 */
export function filterRoster(students, filter) {
  if (filter === 'ALL') return students;
  return students.filter((student) => student.status === filter);
}

/** Счётчик берётся из ростера, а не пересчитывается по строкам: считал его сервер. */
export function rosterCount(roster, filter) {
  if (!roster) return 0;
  switch (filter) {
    case 'ALL': return roster.total ?? 0;
    case 'SUBMITTED': return roster.submitted ?? 0;
    case 'RETURNED': return roster.returned ?? 0;
    case 'DONE': return roster.done ?? 0;
    case 'NOT_SUBMITTED': return roster.notSubmitted ?? 0;
    default: return 0;
  }
}

/**
 * Строка ученика. Выбывший получатель остаётся в списке серым: отправлять он уже не может,
 * но работа, которую он сдал, никуда не делась, и убрать его значило бы стереть её вместе
 * со строкой.
 */
export function RosterRow({ student, onPress }) {
  const { c } = useTheme();
  const tone = STATUS_TONES[student.status] || 'gray';
  const colors = {
    gray: [c.bg2, c.inkMuted],
    blue: [c.hwReviewTint, c.hwReviewInk],
    gold: [c.hwReturnedTint, c.hwReturnedInk],
    green: [c.hwDoneTint, c.hwDoneInk],
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Работа ученика ${student.fullName ?? ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        opacity: student.active === false ? 0.55 : 1,
        backgroundColor: pressed && onPress ? c.bg2 : 'transparent',
      })}
    >
      <Avatar name={student.fullName || '?'} size={36} />

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink }} numberOfLines={1}>
          {student.fullName}
        </Txt>
        <Txt style={{ fontSize: 12, color: c.ink3 }} numberOfLines={1}>
          {student.lastSubmittedAt
            ? `${student.resubmitted ? 'Пересдал' : 'Отправлено'} ${stamp(student.lastSubmittedAt)}`
            : student.active === false
              ? 'Выбыл из состава'
              : 'Работы пока нет'}
        </Txt>
      </View>

      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 20,
          backgroundColor: colors[0],
        }}
      >
        <Txt style={{ fontSize: 11, fontWeight: '700', color: colors[1] }}>
          {STATUS_LABELS[student.status] || '—'}
        </Txt>
      </View>

      {onPress ? <Icon name="chevronRight" size={16} color={c.ink3} /> : null}
    </Pressable>
  );
}
