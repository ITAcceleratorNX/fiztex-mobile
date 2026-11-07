import React from 'react';
import { View } from 'react-native';
import { Txt } from './Txt';
import { RichText } from './RichText';
import { useTheme } from '@shared/theme/ThemeContext';
import { DOCUMENT as d } from '@shared/theme/tokens';

/**
 * Документ конспекта: оба блока по порядку. Рисунки и файлы внутри текста (CONTENT-EMBED-001)
 * описаны в `embeds` того же ответа — и для черновика, и для опубликованного; `onExpired`
 * перечитывает конспект, когда подписанная ссылка истекла.
 */
export function SummaryDocument({ content, embeds, onExpired }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: d.sectionGap }}>
      <Txt accessibilityRole="header" selectable style={{
        color: c.ink, fontSize: d.titleSize, lineHeight: d.titleLine, fontWeight: '700',
      }}>{content.title}</Txt>
      <DocumentSection title="Краткий конспект" text={content.summaryText} embeds={embeds} onExpired={onExpired} />
      <DocumentSection title={content.companionKind === 'PLAN' ? 'План урока' : 'Краткий пересказ'}
        text={content.companionText} embeds={embeds} onExpired={onExpired} />
    </View>
  );
}

function DocumentSection({ title, text, embeds, onExpired }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: d.gap }}>
      <Txt accessibilityRole="header" style={{
        color: c.ink, fontSize: d.headingSize, lineHeight: d.headingLine, fontWeight: '700',
      }}>{title}</Txt>
      <RichText text={text || 'Раздел пока не заполнен'} embeds={embeds} onExpired={onExpired} respectFontScale
        style={{ color: c.ink, fontSize: d.bodySize, lineHeight: d.bodyLine }} />
    </View>
  );
}
