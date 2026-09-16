import React from 'react';
import { Pressable, View } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { Card, Pill, ScreenHeader, StateView } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useSurveyStats } from '@shared/hooks/useSurveyAdmin';
import { completionPercent, formatSurveyDate, respondentMeta } from '@shared/api/surveyAdminMap';

function QuestionStats({ question }) {
  const { c } = useTheme();
  const answered = question.answeredCount ?? 0;
  const options = question.options ?? [];
  const max = Math.max(1, ...options.map((option) => option.count ?? 0));

  return (
    <Card style={{ borderRadius: 14, gap: 10 }}>
      <Txt style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{question.text}</Txt>
      <Txt style={{ fontSize: 12, color: c.inkMuted }}>Ответили: {answered}</Txt>

      {options.length ? options.map((option, index) => {
        const count = option.count ?? 0;
        return (
          <View key={`option-${index}`} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Txt numberOfLines={2} style={{ flex: 1, fontSize: 13, color: c.ink2 }}>{option.text}</Txt>
              <Txt style={{ fontSize: 13, fontWeight: '700', color: c.ink }}>{count}</Txt>
            </View>
            {/* Полоса, а не проценты: доли по вариантам сравнивают глазами, и полоса
                отвечает на это быстрее числа. */}
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.bg2 }}>
              <View style={{ width: `${Math.round((100 * count) / max)}%`, height: 6, borderRadius: 3, backgroundColor: c.blue }} />
            </View>
          </View>
        );
      }) : null}

      {(question.openAnswers ?? []).length ? (
        <View style={{ gap: 6 }}>
          {question.openAnswers.map((answer, index) => (
            <Txt key={`open-${index}`} style={{ fontSize: 13, color: c.ink2, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: c.border }}>
              {answer}
            </Txt>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Результаты опроса: сводка и — у именного — кто как ответил (PSYCHOLOGIST-002).
 *
 * <p>Ответы есть только у отправивших: черновик ученика сервер не отдаёт, и «начал» в
 * списке означает ровно это — начал, но не отправил.
 *
 * <p>У анонимного опроса списка имён нет по построению, и экран его не обещает: там
 * остаётся одна сводка.
 */
export function SurveyResultsScreen({ nav, payload }) {
  const { c } = useTheme();
  const surveyId = payload?.surveyId;
  const named = payload?.mode === 'NAMED';
  const results = useSurveyStats(surveyId);

  if (results.loading && !results.stats) {
    return (
      <Screen>
        <ScreenHeader title="Результаты" back={() => nav?.back()} />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {[0, 1].map((value) => (
            <View key={value} style={{ height: 110, borderRadius: 16, backgroundColor: c.bg2 }} />
          ))}
        </View>
      </Screen>
    );
  }
  if (results.error || !results.stats) {
    return (
      <Screen>
        <ScreenHeader title="Результаты" back={() => nav?.back()} />
        <StateView
          icon="alertTriangle"
          tone="error"
          title="Не удалось загрузить результаты"
          subtitle={results.error}
          actionLabel="Повторить"
          onAction={() => results.reload()}
          style={{ marginTop: 60 }}
        />
      </Screen>
    );
  }

  const stats = results.stats;
  const percent = completionPercent(stats);

  return (
    <Screen contentStyle={{ paddingBottom: 36, gap: 14 }}>
      <ScreenHeader title="Результаты" back={() => nav?.back()} />

      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <Card style={{ borderRadius: 14, gap: 8 }}>
          <Txt style={{ fontSize: 28, fontWeight: '700', color: c.ink }}>{percent}%</Txt>
          <Txt style={{ fontSize: 13, color: c.inkMuted }}>
            Ответили {stats.respondedCount ?? 0} из {stats.recipientsTotal ?? 0}
          </Txt>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.bg2 }}>
            <View style={{ width: `${percent}%`, height: 8, borderRadius: 4, backgroundColor: c.green }} />
          </View>
        </Card>

        {(stats.questions ?? []).map((question) => (
          <QuestionStats key={question.questionId ?? question.orderIndex} question={question} />
        ))}

        {named ? (
          <View style={{ gap: 8 }}>
            <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Кто ответил</Txt>
            {results.respondents.length === 0 ? (
              <Txt style={{ fontSize: 13, color: c.inkMuted }}>Список получателей пуст.</Txt>
            ) : results.respondents.map((respondent) => {
              const meta = respondentMeta(respondent.status);
              const done = respondent.status === 'COMPLETED';
              return (
                <Pressable
                  key={respondent.recipientId}
                  accessibilityRole="button"
                  disabled={!done}
                  onPress={() => nav?.('survey-respondent', { surveyId, recipientId: respondent.recipientId })}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 13,
                    borderRadius: 14,
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    opacity: !done ? 0.7 : pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>
                      {respondent.fullName}
                    </Txt>
                    <Txt numberOfLines={1} style={{ marginTop: 2, fontSize: 12, color: c.inkMuted }}>
                      {[respondent.classNames, formatSurveyDate(respondent.submittedAt)].filter(Boolean).join(' · ') || 'Ещё не отправил'}
                    </Txt>
                  </View>
                  <Pill color={meta.color}>{meta.label}</Pill>
                  {done ? <Icon name="chevronRight" size={18} color={c.ink3} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Txt style={{ fontSize: 12, color: c.inkMuted }}>
            Опрос анонимный — имён у ответов нет, только сводка выше.
          </Txt>
        )}
      </View>
    </Screen>
  );
}
