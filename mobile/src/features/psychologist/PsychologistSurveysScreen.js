import React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, TAB_BAR_HEIGHT, shadowLg } from '@shared/components/Screen';
import { Pill, ScreenHeader, StateView } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useAdminSurveys } from '@shared/hooks/useSurveyAdmin';
import { formatSurveyDate, modeLabel, respondedText, statusMeta } from '@shared/api/surveyAdminMap';

const FILTERS = [
  { value: null, label: 'Все' },
  { value: 'DRAFT', label: 'Черновики' },
  { value: 'ACTIVE', label: 'Идут' },
  { value: 'COMPLETED', label: 'Завершены' },
];

/**
 * Опросы психолога — первая вкладка его приложения (PSYCHOLOGIST-002).
 *
 * <p>Раньше раздел жил только в вебе, а в телефоне роль упиралась в заглушку «откройте на
 * компьютере». Теперь весь цикл здесь: завести, набрать вопросы, выбрать классы,
 * опубликовать и смотреть ответы.
 *
 * <p>Чужих опросов в списке не бывает: сервер отдаёт только психологические
 * (`origin=PSYCHOLOGICAL`), и фильтровать их здесь нечем и незачем.
 */
export function PsychologistSurveysScreen({ nav }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const surveys = useAdminSurveys();

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <ScreenHeader title="Психологические опросы" large sub="Только ваши: школьные опросы ведёт администрация" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
        {FILTERS.map((filter) => {
          const active = surveys.status === filter.value;
          return (
            <Pressable
              key={filter.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => surveys.setStatus(filter.value)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Pill color={active ? 'blue' : 'gray'}>{filter.label}</Pill>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={surveys.loading ? [] : surveys.rows}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        renderItem={({ item }) => {
          const meta = statusMeta(item.status);
          const deadline = formatSurveyDate(item.deadlineAt);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => nav?.('survey-card', { surveyId: item.id })}
              style={({ pressed }) => ({
                marginHorizontal: 16,
                marginBottom: 10,
                padding: 14,
                borderRadius: 14,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pill color={meta.color}>{meta.label}</Pill>
                <Pill color="gray">{modeLabel(item.mode)}</Pill>
                <Icon name="chevronRight" size={18} color={c.ink3} style={{ marginLeft: 'auto' }} />
              </View>
              <Txt numberOfLines={2} style={{ marginTop: 10, fontSize: 15, fontWeight: '700', color: c.ink }}>
                {item.title || 'Без названия'}
              </Txt>
              <Txt style={{ marginTop: 4, fontSize: 12, color: c.inkMuted }}>
                {item.status === 'DRAFT' ? 'Ещё не опубликован' : respondedText(item)}
              </Txt>
              {deadline ? (
                <Txt style={{ marginTop: 2, fontSize: 11, color: c.ink3 }}>Срок: {deadline}</Txt>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={surveys.loading ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {[0, 1, 2].map((value) => (
              <View key={value} style={{ height: 96, borderRadius: 14, backgroundColor: c.bg2 }} />
            ))}
          </View>
        ) : surveys.error ? (
          <StateView
            icon="alertTriangle"
            tone="error"
            title="Не удалось загрузить опросы"
            subtitle={surveys.error}
            actionLabel="Повторить"
            onAction={() => surveys.reload()}
            style={{ paddingTop: 40 }}
          />
        ) : (
          <StateView
            icon="clipboardCheck"
            title={surveys.status ? 'В этом разделе пусто' : 'Опросов пока нет'}
            subtitle={surveys.status ? 'Смените фильтр.' : 'Заведите первый — вопросы и классы выбираются здесь же.'}
            style={{ paddingTop: 40 }}
          />
        )}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24 }}
        refreshing={surveys.refreshing}
        onRefresh={surveys.refresh}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Новый опрос"
        onPress={() => nav?.('survey-form')}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 24,
          bottom: insets.bottom + TAB_BAR_HEIGHT + 18,
          width: 54,
          height: 54,
          borderRadius: 27,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.green,
          opacity: pressed ? 0.9 : 1,
          ...shadowLg,
        })}
      >
        <Icon name="plus" size={25} color={c.heroInk} strokeWidth={2.5} />
      </Pressable>
    </Screen>
  );
}
