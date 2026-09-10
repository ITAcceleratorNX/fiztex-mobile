import React, { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { Pill, StateView } from '@shared/components/ui';
import Icon from '@shared/components/Icon';
import { useMySurveys } from '@shared/hooks/useSurveys';
import {
  surveyResponseStatusColor,
  surveyResponseStatusLabel,
  surveyWindowLabel,
} from '@shared/api/surveyStatus';

/**
 * Список своих опросов (ученик и родитель — Фаза 3 «Опросы»).
 *
 * <p>Один экран на обе роли, как и `ScheduleScreen`: `role` принимается для симметрии с
 * остальными экранами этого вида, но ветвления по нему здесь нет — `GET /api/surveys/my`
 * уже отдаёт ровно то, что нужно показать текущему аккаунту (у родителя это одна анкета
 * независимо от числа детей), и опросу нет дела до того, кто на него смотрит.
 *
 * <p>Ни вкладок, ни статусного фильтра: лента одна, потому что опросов у одного человека
 * немного, а не десятки заданий за четверть.
 */
export function SurveyListScreen({ nav }) {
  const { c } = useTheme();
  const { surveys, loading, error, reload } = useMySurveys();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const openSurvey = useCallback(
    (survey) => nav('survey-take', { surveyId: survey.surveyId, title: survey.title }),
    [nav],
  );

  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Txt style={{ fontSize: 24, fontWeight: '800', color: c.blue }}>Опросы</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.ink3} />
        }
      >
        <Body
          loading={loading}
          error={error}
          surveys={surveys}
          onRetry={() => reload()}
          onOpen={openSurvey}
        />
      </ScrollView>
    </Screen>
  );
}

function Body({ loading, error, surveys, onRetry, onOpen }) {
  if (loading) return <SurveySkeleton />;
  if (error) return <SurveyError onRetry={onRetry} />;
  if (surveys.length === 0) return <SurveyEmpty />;

  return (
    <View>
      {surveys.map((survey) => (
        <SurveyRow key={survey.surveyId} survey={survey} onPress={() => onOpen(survey)} />
      ))}
    </View>
  );
}

function SurveyRow({ survey, onPress }) {
  const { c } = useTheme();
  const window = surveyWindowLabel(survey);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть опрос «${survey.title ?? ''}»`}
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: pressed ? c.bg2 : 'transparent',
        })}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }} numberOfLines={1}>
            {survey.title}
          </Txt>
          {survey.description ? (
            <Txt
              style={{ fontSize: 13, fontWeight: '400', color: c.inkMuted }}
              numberOfLines={1}
            >
              {survey.description}
            </Txt>
          ) : null}
          {window ? (
            <Txt style={{ fontSize: 12, fontWeight: '400', color: c.ink3 }}>{window}</Txt>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Pill color={surveyResponseStatusColor(survey.responseStatus)}>
            {surveyResponseStatusLabel(survey.responseStatus)}
          </Pill>
          <Icon name="chevronRight" size={16} color={c.ink3} strokeWidth={2} />
        </View>
      </Pressable>
      <View style={{ height: 1, backgroundColor: c.bg2 }} />
    </View>
  );
}

function SurveySkeleton({ rows = 4 }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingTop: 12, gap: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ paddingHorizontal: 16, gap: 6 }}>
          <View style={{ width: 220, height: 14, borderRadius: 4, backgroundColor: c.bg2 }} />
          <View style={{ width: 130, height: 12, borderRadius: 4, backgroundColor: c.bg2 }} />
        </View>
      ))}
    </View>
  );
}

function SurveyEmpty() {
  return (
    <StateView
      style={{ marginTop: 96 }}
      icon="fileText"
      title="Опросов пока нет"
      subtitle="Новые опросы от школы появятся здесь"
    />
  );
}

function SurveyError({ onRetry }) {
  return (
    <StateView
      style={{ marginTop: 88 }}
      icon="alertTriangle"
      tone="error"
      title="Не удалось загрузить опросы"
      subtitle="Проверьте подключение к сети и попробуйте ещё раз"
      actionLabel="Повторить"
      onAction={onRetry}
    />
  );
}
