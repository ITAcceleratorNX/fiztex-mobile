import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { Card, ConfirmDialog, FilledButton, OutlineButton, Pill, ScreenHeader, StateView } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useAdminSurvey, useSurveyCommands } from '@shared/hooks/useSurveyAdmin';
import {
  formatSurveyDate,
  modeLabel,
  publishBlockers,
  respondedText,
  statusMeta,
} from '@shared/api/surveyAdminMap';

function Row({ icon, title, value, onPress, last = false }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
        opacity: pressed && onPress ? 0.7 : 1,
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.blueSoft }}>
        <Icon name={icon} size={18} color={c.blue} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{title}</Txt>
        <Txt numberOfLines={1} style={{ marginTop: 2, fontSize: 12, color: c.inkMuted }}>{value}</Txt>
      </View>
      {onPress ? <Icon name="chevronRight" size={18} color={c.ink3} /> : null}
    </Pressable>
  );
}

/**
 * Карточка опроса: состояние, три раздела и действия (PSYCHOLOGIST-002).
 *
 * <p>Порядок строк повторяет порядок работы — вопросы, классы, результаты, — и он же
 * определяет, чего не хватает для публикации: пустые вопросы и пустая аудитория названы
 * прямо, а не оставлены серверу.
 *
 * <p>Что можно править, решает сервер: `canEdit` приходит посчитанным (у идущего опроса
 * правка вопросов запрещена), и экран его не вычисляет.
 */
export function SurveyCardScreen({ nav, payload }) {
  const { c } = useTheme();
  const surveyId = payload?.surveyId;
  const card = useAdminSurvey(surveyId);
  const commands = useSurveyCommands();
  const [publishOpen, setPublishOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const survey = card.survey;

  if (card.loading && !survey) {
    return (
      <Screen>
        <ScreenHeader title="Опрос" back={() => nav?.back()} />
        <View style={{ paddingTop: 80, alignItems: 'center' }}><ActivityIndicator color={c.blue} /></View>
      </Screen>
    );
  }
  if (card.error || !survey) {
    return (
      <Screen>
        <ScreenHeader title="Опрос" back={() => nav?.back()} />
        <StateView
          icon="alertTriangle"
          tone="error"
          title="Не удалось загрузить опрос"
          subtitle={card.error}
          actionLabel="Повторить"
          onAction={() => card.reload()}
          style={{ marginTop: 60 }}
        />
      </Screen>
    );
  }

  const meta = statusMeta(survey.status);
  const blockers = publishBlockers(survey);
  const classesCount = (survey.audienceClassIds ?? []).length;

  return (
    <Screen contentStyle={{ paddingHorizontal: 16, paddingBottom: 36, gap: 16 }}>
      <ScreenHeader title="Опрос" back={() => nav?.back()} />

      {commands.errorText ? (
        <Pressable onPress={commands.clearError} style={{ padding: 12, borderRadius: 12, backgroundColor: c.redSoft }}>
          <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{commands.errorText}</Txt>
        </Pressable>
      ) : null}

      <Card style={{ borderRadius: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pill color={meta.color}>{meta.label}</Pill>
          <Pill color="gray">{modeLabel(survey.mode)}</Pill>
        </View>
        <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>{survey.title || 'Без названия'}</Txt>
        {survey.description ? (
          <Txt style={{ fontSize: 13, color: c.ink2 }}>{survey.description}</Txt>
        ) : null}
        <Txt style={{ fontSize: 12, color: c.inkMuted }}>
          {survey.status === 'DRAFT' ? 'Ещё не опубликован' : respondedText({
            recipientsTotal: survey.recipientsTotal,
            respondedCount: survey.respondedCount,
          })}
        </Txt>
        {formatSurveyDate(survey.deadlineAt) ? (
          <Txt style={{ fontSize: 12, color: c.inkMuted }}>Срок: {formatSurveyDate(survey.deadlineAt)}</Txt>
        ) : null}
      </Card>

      <Card style={{ borderRadius: 14, paddingVertical: 2 }}>
        <Row
          icon="list"
          title="Вопросы"
          value={survey.questionCount ? `${survey.questionCount} в опросе` : 'Ещё не заданы'}
          onPress={() => nav?.('survey-questions', { surveyId, canEdit: survey.canEdit })}
        />
        <Row
          icon="users"
          title="Классы"
          value={classesCount ? `Выбрано классов: ${classesCount}` : 'Не выбраны'}
          onPress={() => nav?.('survey-audience', { surveyId })}
        />
        <Row
          icon="clipboardCheck"
          title="Результаты"
          value={survey.status === 'DRAFT' ? 'Появятся после публикации' : respondedText({
            recipientsTotal: survey.recipientsTotal,
            respondedCount: survey.respondedCount,
          })}
          onPress={survey.status === 'DRAFT' ? undefined : () => nav?.('survey-results', { surveyId, mode: survey.mode })}
          last
        />
      </Card>

      {survey.status === 'DRAFT' ? (
        <View style={{ gap: 10 }}>
          {blockers.length ? (
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.goldSoft }}>
              <Txt style={{ fontSize: 13, color: c.ink }}>Перед публикацией: {blockers.join(' ')}</Txt>
            </View>
          ) : null}
          <OutlineButton onPress={() => nav?.('survey-form', { survey })}>Изменить название и режим</OutlineButton>
          <FilledButton disabled={blockers.length > 0 || commands.busy} onPress={() => setPublishOpen(true)}>
            Опубликовать
          </FilledButton>
        </View>
      ) : survey.status === 'ACTIVE' ? (
        <OutlineButton disabled={commands.busy} onPress={() => setEndOpen(true)}>Завершить приём ответов</OutlineButton>
      ) : null}

      <ConfirmDialog
        visible={publishOpen}
        title="Опубликовать опрос?"
        message="Ученики выбранных классов увидят его сразу. Вопросы после публикации не меняются."
        confirmLabel="Опубликовать"
        busy={commands.busy}
        onCancel={() => setPublishOpen(false)}
        onConfirm={async () => {
          const published = await commands.publish(surveyId);
          setPublishOpen(false);
          if (published) await card.reload(true);
        }}
      />
      <ConfirmDialog
        visible={endOpen}
        title="Завершить опрос?"
        message="Новые ответы приниматься не будут. Уже полученные останутся в результатах."
        confirmLabel="Завершить"
        confirmTone="danger"
        busy={commands.busy}
        onCancel={() => setEndOpen(false)}
        onConfirm={async () => {
          const ended = await commands.end(surveyId);
          setEndOpen(false);
          if (ended) await card.reload(true);
        }}
      />
    </Screen>
  );
}
