import React from 'react';
import { Pressable, View } from 'react-native';
import Icon from '@shared/components/Icon';
import { HISTORY } from '@shared/theme/tokens';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { GradeChip } from '@shared/ui/grades';
import { gradeValueLabel } from '@shared/api/gradesMap';
import { correctionBadgeLabel, temporaryGradeLabel } from '@shared/api/gradeCorrectionMap';

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
export function LessonGradeRow({
  row, maxGrades = 1, canManage = false, openSlot = null, onOpen, trailingAction, onShowHistory,
  correction = null, onFlag, onCorrectionGrade,
}) {
  const { c } = useTheme();
  const grades = row.grades || [];
  const free = canManage ? Math.max(0, maxGrades - grades.length) : 0;
  const placeholders = canManage ? 0 : Math.max(0, maxGrades - grades.length);
  // Пока работа на исправлении, её место в строке — клетка временной оценки: выбор значения в ней и
  // есть итоговая оценка (веб, Figma 1956:1399). Свободных мест под обычную оценку у такой строки нет.
  const slots = correction ? [...grades] : [...grades, ...Array.from({ length: free }, () => null)];
  const badge = correctionBadgeLabel(correction);
  // Флажок исправления — у ученика без оценки либо с уже открытым исправлением; у оценённого его нет.
  const flagVisible = canManage && Boolean(onFlag) && (grades.length === 0 || Boolean(correction));

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
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt style={{ fontSize: 15, fontWeight: '500', color: c.ink }} numberOfLines={1}>
          {row.fullName}
        </Txt>
        {badge ? (
          <Txt style={{ fontSize: 11, fontWeight: '700', color: correction?.overdue || correction?.status === 'OVERDUE' ? c.red : c.green }}>
            {badge}
          </Txt>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {slots.map((grade, index) => {
          // Нажатие разрешают два разных ответа сервера, и нужны оба: лист говорит,
          // можно ли писать в этот урок вообще, оценка — можно ли трогать именно её.
          const editable = canManage && (!grade || grade.canEdit);
          return (
            <View key={grade?.id ?? `free-${index}`} style={{ alignItems: 'center' }}>
            <GradeChip
              value={gradeValueLabel(grade)}
              active={openSlot === index}
              onPress={editable ? () => onOpen?.(index, grade) : undefined}
            />
            {grade?.id && onShowHistory ? <Pressable
              accessibilityRole="button"
              accessibilityLabel={`История оценки ${gradeValueLabel(grade)} — ${row.fullName}`}
              onPress={() => onShowHistory(grade)}
              style={{ width: HISTORY.buttonSize, minHeight: HISTORY.buttonSize, alignItems: 'center', justifyContent: 'center' }}
            ><Icon name="clock" size={HISTORY.titleSize} color={c.ink2} /></Pressable> : null}
            </View>
          );
        })}
        {correction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Выставить итоговую оценку — ${row.fullName}`}
            onPress={onCorrectionGrade}
            style={{
              minWidth: 32, height: 32, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1,
              borderStyle: 'dashed', borderColor: c.green, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Txt style={{ fontSize: 14, fontWeight: '700', color: c.green }}>
              {temporaryGradeLabel(correction.temporaryGrade) ?? '·'}
            </Txt>
          </Pressable>
        ) : null}
        {Array.from({ length: placeholders }).map((_, index) => (
          <GradeChip key={`ph-${index}`} />
        ))}
        {flagVisible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={correction ? `Исправление — ${row.fullName}` : `Отметить исправление — ${row.fullName}`}
            onPress={onFlag}
            hitSlop={6}
            style={({ pressed }) => ({ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="flag" size={18} color={correction ? c.green : c.ink3} strokeWidth={2} />
          </Pressable>
        ) : null}
        {trailingAction}
      </View>
    </View>
  );
}
