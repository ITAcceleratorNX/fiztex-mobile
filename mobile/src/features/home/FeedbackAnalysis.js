import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { FilledButton, OutlineButton } from '@shared/components/ui';
import { analysisPhase, analysisSections } from '@shared/api/monthlyFeedbackMap';

/**
 * Анализ ИИ под отзывами месяца (Figma 2162:4309 — загрузка, 2162:4425 — результат).
 *
 * <p>Анализ — по **всем** опубликованным отзывам ребёнка за месяц, а не по открытой вкладке
 * (ТЗ §4): он принадлежит паре «ребёнок + месяц» и у второго родителя тот же. Поэтому готовый
 * анализ показывается сразу, без нажатия, — повторный показ ничего не стоит.
 *
 * <p>Что можно нажать, решает сервер (`canRequest`): кнопка появляется, когда анализа нет, он
 * упал или устарел после новых отзывов. Оговорка «не заключение специалиста» — всегда, при
 * неполном покрытии — ещё и основание «на основе доступных отзывов».
 */
export function FeedbackAnalysis({ feedback }) {
  const { c } = useTheme();
  const { analysis, analysisError, analysisStarting, requestAnalysis } = feedback;
  if (analysisError?.hidden) return null;

  const phase = analysisPhase(analysis);
  const canRequest = analysis?.canRequest === true;
  const errorLine = analysisError?.message ? (
    <Txt style={{ fontSize: 12, lineHeight: 17, color: c.red }}>{analysisError.message}</Txt>
  ) : null;

  if (analysisStarting || phase === 'running') {
    return (
      <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ActivityIndicator size="small" color={c.inkMuted} />
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.inkMuted }}>Анализируем отзывы...</Txt>
      </Surface>
    );
  }

  if (phase === 'failed') {
    return (
      <Surface style={{ gap: 10 }}>
        <Txt style={{ fontSize: 13, lineHeight: 19, color: c.ink2 }}>{analysis.errorMessage}</Txt>
        {errorLine}
        {canRequest ? (
          <FilledButton icon="sparkle" onPress={requestAnalysis}>
            Попробовать ещё раз
          </FilledButton>
        ) : null}
      </Surface>
    );
  }

  if (phase === 'done' && analysis?.result) {
    return <AnalysisResult analysis={analysis} canRequest={canRequest} onRefresh={requestAnalysis} errorLine={errorLine} />;
  }

  if (!canRequest) return errorLine ? <Surface>{errorLine}</Surface> : null;
  return (
    <View style={{ gap: 8 }}>
      {errorLine ? <Surface>{errorLine}</Surface> : null}
      <FilledButton icon="sparkle" onPress={requestAnalysis}>
        Получить анализ ИИ
      </FilledButton>
    </View>
  );
}

function AnalysisResult({ analysis, canRequest, onRefresh, errorLine }) {
  const { c } = useTheme();
  const { result, basis, disclaimer, stale } = analysis;
  return (
    <Surface bordered style={{ gap: 10 }}>
      {stale ? (
        <View style={{ gap: 8, paddingBottom: 2 }}>
          <Txt style={{ fontSize: 13, fontWeight: '700', color: c.ink }}>Появились новые отзывы</Txt>
          {canRequest ? (
            <OutlineButton onPress={onRefresh} style={{ alignSelf: 'flex-start' }}>
              Обновить анализ
            </OutlineButton>
          ) : null}
        </View>
      ) : null}
      {errorLine}

      <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>Краткая сводка</Txt>
      <Txt style={{ fontSize: 12, lineHeight: 18, color: c.ink2 }}>{result.summary}</Txt>

      {analysisSections(result).map((section) => (
        <View key={section.key} style={{ gap: 6 }}>
          <Txt style={{ fontSize: 12, fontWeight: '700', color: c.blue }}>{section.title}</Txt>
          <View style={{ gap: 4 }}>
            {section.items.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.ink2, marginTop: 7 }} />
                <Txt style={{ flex: 1, fontSize: 12, lineHeight: 17, color: c.ink2 }}>{item}</Txt>
              </View>
            ))}
          </View>
        </View>
      ))}

      {basis?.partial && basis?.note ? (
        <Txt style={{ fontSize: 11, lineHeight: 15, color: c.inkMuted }}>{basis.note}</Txt>
      ) : null}
      {disclaimer ? <Txt style={{ fontSize: 11, lineHeight: 15, color: c.inkMuted }}>{disclaimer}</Txt> : null}
    </Surface>
  );
}

/** Светлая подложка внутри navy-карточки (Figma `Feedback Text Surface` / `AI Analysis Result`). */
function Surface({ children, bordered = false, style }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface2,
          borderRadius: 12,
          padding: 12,
          borderWidth: bordered ? 1 : 0,
          borderColor: c.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
