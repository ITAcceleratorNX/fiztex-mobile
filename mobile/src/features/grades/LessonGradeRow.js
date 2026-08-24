import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { GradeChip } from '@shared/ui/grades';

/**
 * Строка ученика в листе оценок (Figma `mobile-grades-list`, `list-container`).
 *
 * <b>Мест ровно столько, сколько разрешил бэк</b> (`maxGradesPerStudent`): заполненные
 * идут первыми, свободные — следом. Своего лимита у экрана нет — он разошёлся бы с тем,
 * что принимает сервер, и четвёртая оценка предлагалась бы там, где её отклонят.
 *
 * <b>В режиме чтения свободных мест нет.</b> «+» звал бы к действию, которого нет; вместо
 * него пустая рамка — ряд обязан сохранить геометрию (макет `expired-access-container`).
 *
 * <b>Чужая оценка не нажимается.</b> Право на конкретную оценку приходит в ней самой
 * (`canEdit`, GRADES-002 §5): замещающему принадлежат только те, что он поставил сам.
 */
export function LessonGradeRow({ row, maxGrades = 3, canManage = false, openSlot = null, onOpen }) {
  const { c } = useTheme();
  const grades = row.grades || [];
  const free = canManage ? Math.max(0, maxGrades - grades.length) : 0;
  const placeholders = canManage ? 0 : Math.max(0, maxGrades - grades.length);
  const slots = [...grades, ...Array.from({ length: free }, () => null)];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}
    >
      <Txt style={{ flex: 1, fontSize: 15, fontWeight: '500', color: c.ink }} numberOfLines={1}>
        {row.fullName}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {slots.map((grade, index) => {
          // Нажатие разрешают два разных ответа сервера, и нужны оба: лист говорит,
          // можно ли писать в этот урок вообще, оценка — можно ли трогать именно её.
          const editable = canManage && (!grade || grade.canEdit);
          return (
            <GradeChip
              key={grade?.id ?? `free-${index}`}
              value={grade?.scaleCode}
              active={openSlot === index}
              onPress={editable ? () => onOpen?.(index, grade) : undefined}
            />
          );
        })}
        {Array.from({ length: placeholders }).map((_, index) => (
          <GradeChip key={`ph-${index}`} />
        ))}
      </View>
    </View>
  );
}
