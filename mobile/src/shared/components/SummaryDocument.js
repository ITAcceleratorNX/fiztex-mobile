import React from 'react';
import { View } from 'react-native';
import { Txt } from './Txt';
import { MathText } from '@shared/math/MathText';
import { useTheme } from '@shared/theme/ThemeContext';
import { DOCUMENT as d } from '@shared/theme/tokens';

export function SummaryDocument({ content }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: d.sectionGap }}>
      <Txt accessibilityRole="header" selectable style={{
        color: c.ink, fontSize: d.titleSize, lineHeight: d.titleLine, fontWeight: '700',
      }}>{content.title}</Txt>
      <DocumentSection title="Краткий конспект" text={content.summaryText} />
      <DocumentSection title={content.companionKind === 'PLAN' ? 'План урока' : 'Краткий пересказ'} text={content.companionText} />
    </View>
  );
}

function DocumentSection({ title, text }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: d.gap }}>
      <Txt accessibilityRole="header" style={{
        color: c.ink, fontSize: d.headingSize, lineHeight: d.headingLine, fontWeight: '700',
      }}>{title}</Txt>
      <MathText text={text || 'Раздел пока не заполнен'} respectFontScale
        style={{ color: c.ink, fontSize: d.bodySize, lineHeight: d.bodyLine }} />
    </View>
  );
}
