import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { GRAD, GradCard } from '@shared/components/Grad';
import { MonthStepper, OutlineButton, ScrollTabs } from '@shared/components/ui';
import { monthLabel, pickSubject, subjectTabs } from '@shared/api/monthlyFeedbackMap';
import { FeedbackAnalysis } from './FeedbackAnalysis';
import { SurfaceCard } from './HomeParts';

const TITLE = 'Обратная связь за месяц';

/**
 * «Обратная связь за месяц» на главной родителя (Figma 2162:3880, 2162:4100, 2162:4193).
 *
 * <p>Два облика, как в макете: опубликованное — фирменная navy-карточка с вкладками предметов,
 * неопубликованное — белая карточка с одной фразой. Разница не косметическая: navy обещает
 * содержимое, и пустая navy-карточка читалась бы как сломанная.
 *
 * <p>Всё содержимое принадлежит выбранному ребёнку и месяцу; данные и их загрузка —
 * `useChildMonthlyFeedback`, здесь только раскладка.
 */
export function MonthlyFeedbackBlock({ feedback }) {
  const { c } = useTheme();
  const { month, loading, error, view, older, newer, goOlder, goNewer, retry } = feedback;
  const [subjectId, setSubjectId] = useState(null);

  const tabs = subjectTabs(view);
  const selected = pickSubject(tabs, subjectId);
  const subject = view?.subjects?.find((item) => item.subjectId === selected) ?? null;
  const canStep = older != null || newer != null;

  const stepper = (onDark) =>
    canStep ? (
      <MonthStepper
        label={monthLabel(month)}
        canOlder={older != null}
        canNewer={newer != null}
        onOlder={goOlder}
        onNewer={goNewer}
        onDark={onDark}
      />
    ) : (
      <Txt style={{ fontSize: 13, fontWeight: '600', color: onDark ? c.heroInk : c.inkMuted }}>
        {monthLabel(month)}
      </Txt>
    );

  if (loading || error || tabs.length === 0) {
    return (
      // Белая карточка неопубликованного месяца (Figma 2162:4100) — как плитки главной.
      <SurfaceCard style={{ gap: 8 }}>
        <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>{TITLE}</Txt>
        {month ? stepper(false) : null}
        {loading ? (
          <ActivityIndicator color={c.inkMuted} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
        ) : error ? (
          <View style={{ gap: 10, alignItems: 'flex-start' }}>
            <Txt style={{ fontSize: 14, color: c.ink2 }}>{error}</Txt>
            <OutlineButton onPress={retry}>Повторить</OutlineButton>
          </View>
        ) : (
          <Txt style={{ fontSize: 14, lineHeight: 20, color: c.ink2 }}>
            Обратная связь за этот месяц пока не опубликована
          </Txt>
        )}
      </SurfaceCard>
    );
  }

  const entries = subject?.entries ?? [];
  return (
    <GradCard colors={GRAD.blueBright} withPattern={false} padding={16} radius={20} contentStyle={{ gap: 12 }}>
      <View style={{ gap: 8 }}>
        <Txt style={{ fontSize: 16, fontWeight: '700' }}>{TITLE}</Txt>
        {stepper(true)}
      </View>

      <ScrollTabs value={selected} options={tabs} onChange={setSubjectId} />

      {entries.map((entry) => (
        <View key={entry.entryId} style={{ backgroundColor: c.surface2, borderRadius: 12, padding: 12, gap: 6 }}>
          <Txt style={{ fontSize: 14, lineHeight: 22, color: c.ink2 }}>{entry.text}</Txt>
          {/* Два отзыва по предмету бывают у переведённого ребёнка — из разных классов. */}
          {entries.length > 1 && entry.className ? (
            <Txt style={{ fontSize: 12, fontWeight: '600', color: c.inkMuted }}>{entry.className}</Txt>
          ) : null}
        </View>
      ))}

      <FeedbackAnalysis feedback={feedback} />
    </GradCard>
  );
}
