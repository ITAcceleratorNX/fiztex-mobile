import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Checkbox, SelectPill } from '@shared/components/ui';
import { shadowSm } from '@shared/components/Screen';
import {
  markToggleFor,
  markingSummary,
  reasonChipLabel,
  statusChip,
} from '@shared/api/attendanceMap';

/**
 * Кнопка комментария к отметке (Figma — глиф справа во второй строке карточки).
 *
 * Заполненный комментарий отличается цветом, а не второй иконкой: учителю нужно видеть,
 * есть ли там что-то, ещё до нажатия, а сам текст в строку всё равно не поместится.
 */
function CommentButton({ filled, onPress, disabled }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filled ? 'Изменить комментарий' : 'Добавить комментарий'}
      onPress={disabled ? undefined : onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name="chat" size={16} color={filled ? c.blue : c.ink3} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * Строка ученика в листе посещаемости (Figma «Посещаемость — редактирование», node
 * 2086:5837, и её просмотровый вариант, node 2086:6088).
 *
 * <b>Один компонент на просмотр и правку.</b> Разница между ними в макете —
 * интерактивность тех же самых элементов: чип статуса теряет шеврон, галочка
 * превращается в текст, причина уходит в ту же строку подписью. Собери их двумя
 * компонентами — и «Освобожден · Болезнь» разъедется с тем, что видно при правке.
 *
 * <b>Вторая строка появляется по содержимому, а не по режиму.</b> В просмотре её нет
 * вовсе, когда сказать нечего: у «Присутствовал» без опоздания и комментария пустая
 * полоса читалась бы как незаконченная карточка.
 *
 * @param {boolean} highlight подсветить как неотмеченного — ответ бэка на попытку
 *   опубликовать неполный лист (`details.unmarkedStudentProfileIds`)
 */
export function AttendanceStudentRow({
  row,
  editable = false,
  highlight = false,
  onPickStatus,
  onToggleMark,
  onPickReason,
  onEditComment,
}) {
  const { c } = useTheme();
  const marking = row.marking || null;
  const chip = statusChip(marking);
  const toggle = markToggleFor(marking?.status);
  const hasComment = Boolean((marking?.comment || '').trim());
  const summary = markingSummary(marking);

  // В правке вторая строка есть всегда: даже у «не отмечено» там живёт комментарий,
  // и прыгающая высота карточек при смене статуса читалась бы как перерисовка списка.
  const secondRow = editable || Boolean(summary) || hasComment;

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: highlight ? c.red : c.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
        ...shadowSm,
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt
          style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: c.ink }}
          numberOfLines={1}
        >
          {row.fullName}
        </Txt>
        {/* Статус не сжимается: это главное в строке, а уступает место длинному ФИО
            сама фамилия — у неё `flex: 1` и обрезка по многоточию. */}
        <SelectPill
          label={chip.label}
          tone={chip.tone}
          onPress={editable ? onPickStatus : undefined}
          style={{ width: 123, flexShrink: 0 }}
        />
      </View>

      {secondRow ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {editable && toggle ? (
              <Checkbox
                checked={marking?.mark === toggle.value}
                label={toggle.label}
                onPress={onToggleMark}
              />
            ) : null}
            {!editable && summary ? (
              <Txt style={{ fontSize: 12, fontWeight: '500', color: c.ink2 }} numberOfLines={1}>
                {summary}
              </Txt>
            ) : null}
          </View>

          {/* Причина — только у отсутствия: у присутствия её нет в модели вовсе
              (attendance-read-contract §2), и показывать пустой переключатель значило бы
              обещать поле, которого бэк не примет.

              Ширина ограничена: причина — не самое важное в строке, и разрастаться за
              счёт галочки и кнопки комментария ей нечего. */}
          {editable && marking?.status === 'ABSENT' ? (
            <SelectPill
              label={reasonChipLabel(marking?.reason)}
              tone="neutral"
              onPress={onPickReason}
              style={{ maxWidth: 132 }}
            />
          ) : null}

          <View style={{ flexShrink: 0 }}>
            <CommentButton
              filled={hasComment}
              onPress={onEditComment}
              disabled={!editable && !hasComment}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
