import React from 'react';
import { View } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { Card, Pill, ScreenHeader, StateView } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';
import { useRespondentAnswers } from '@shared/hooks/useSurveyAdmin';
import { answerText, formatSurveyDate, respondentMeta } from '@shared/api/surveyAdminMap';

/**
 * Ответы одного ученика (PSYCHOLOGIST-002).
 *
 * <p>Экран существует только у именного опроса и открывается только у отправивших:
 * черновик ученика сервер не отдаёт, и показывать «в процессе» тут нечего.
 *
 * <p>Именные ответы видит один психолог — администратору эти пути закрыты. Это решение о
 * видимости, а не недосмотр, и повторять его на экране нечем: сервер просто не отдаст
 * чужое.
 */
export function SurveyRespondentScreen({ nav, payload }) {
  const { c } = useTheme();
  const { respondent, loading, error, reload } = useRespondentAnswers(
    payload?.surveyId,
    payload?.recipientId,
  );

  if (loading && !respondent) {
    return (
      <Screen>
        <ScreenHeader title="Ответы" back={() => nav?.back()} />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {[0, 1, 2].map((value) => (
            <View key={value} style={{ height: 84, borderRadius: 16, backgroundColor: c.bg2 }} />
          ))}
        </View>
      </Screen>
    );
  }
  if (error || !respondent) {
    return (
      <Screen>
        <ScreenHeader title="Ответы" back={() => nav?.back()} />
        <StateView
          icon="alertTriangle"
          tone="error"
          title="Не удалось загрузить ответы"
          subtitle={error}
          actionLabel="Повторить"
          onAction={reload}
          style={{ marginTop: 60 }}
        />
      </Screen>
    );
  }

  const meta = respondentMeta(respondent.status);
  const answers = respondent.answers ?? [];

  return (
    <Screen contentStyle={{ paddingBottom: 36, gap: 14 }}>
      <ScreenHeader title={respondent.fullName || 'Ответы'} back={() => nav?.back()} sub={respondent.classNames} />

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pill color={meta.color}>{meta.label}</Pill>
          {formatSurveyDate(respondent.submittedAt) ? (
            <Txt style={{ fontSize: 12, color: c.inkMuted }}>{formatSurveyDate(respondent.submittedAt)}</Txt>
          ) : null}
        </View>

        {answers.length === 0 ? (
          <Txt style={{ fontSize: 13, color: c.inkMuted }}>Ответов нет.</Txt>
        ) : answers.map((answer, index) => (
          <Card key={answer.questionId ?? index} style={{ borderRadius: 14, gap: 6 }}>
            <Txt style={{ fontSize: 13, color: c.inkMuted }}>{answer.questionText}</Txt>
            <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{answerText(answer)}</Txt>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
