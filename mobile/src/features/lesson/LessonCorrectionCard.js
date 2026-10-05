import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { correctionCard } from '@shared/api/gradeCorrectionMap';

/**
 * Блок «Требуется исправление» в карточке урока ученика и родителя (Figma
 * «Ученик - Исправление / временная оценка» 1962:32221, «/ без оценки» 1962:1700,
 * «Срок исправления истёк» 1962:32719, «Родитель - полный экран» 1960:20487).
 *
 * Карточка с полосой слева: оранжевая, пока срок идёт, и красная после него. Временная оценка
 * — пунктирным квадратом и с прямой подписью, что на средний балл она не влияет: иначе её
 * прочитали бы как поставленную. Без неё блок тот же, только без этой строки.
 */
export function LessonCorrectionCard({ correction }) {
  const { c } = useTheme();
  const card = correctionCard(correction);
  if (!card) return null;
  const danger = card.tone === 'danger';
  const tone = {
    bg: danger ? c.correctionDangerSoft : c.correctionWarnSoft,
    ink: danger ? c.correctionDanger : c.correctionWarn,
    icon: danger ? 'alertTriangle' : 'clock',
  };

  return (
    <View
      accessibilityRole="summary"
      style={{
        backgroundColor: tone.bg,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: tone.ink,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={tone.icon} size={16} color={tone.ink} strokeWidth={2.2} />
        <Txt style={{ fontSize: 14, fontWeight: '700', color: tone.ink }}>{card.title}</Txt>
      </View>

      {card.comment ? (
        <Txt style={{ fontSize: 13, fontWeight: '600', lineHeight: 19, color: c.ink }}>{card.comment}</Txt>
      ) : null}

      {card.temporary ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              minWidth: 28,
              height: 24,
              paddingHorizontal: 4,
              borderRadius: 7,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: c.correctionWarn,
              backgroundColor: c.correctionWarnSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt style={{ fontSize: 12, fontWeight: '600', color: c.correctionWarn }}>{card.temporary}</Txt>
          </View>
          <Txt style={{ flex: 1, fontSize: 11, fontWeight: '600', color: c.inkMuted }}>
            Временная оценка — не влияет на средний балл
          </Txt>
        </View>
      ) : null}

      {card.deadline ? (
        <Txt style={{ fontSize: 12, fontWeight: '600', color: c.inkMuted }}>{card.deadline}</Txt>
      ) : null}
    </View>
  );
}
