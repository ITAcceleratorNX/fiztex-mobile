import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, shadowLg } from '@shared/components/Screen';
import { FilledButton, ScreenHeader, StateView } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useAdminSurvey, useSurveyAudienceClasses, useSurveyCommands } from '@shared/hooks/useSurveyAdmin';

/**
 * Кому достанется опрос (PSYCHOLOGIST-002).
 *
 * <p>Классы приходят своим эндпоинтом (`/admin/surveys/audience-classes`), а не общим
 * справочником: тот психологу закрыт, и дерево выбора у него было бы пустым. Число
 * учеников показывается потому, что получатели фиксируются снимком при публикации —
 * пустой класс должен быть виден до неё, а не после.
 *
 * <p>Родителей здесь нет: аудитория психологического опроса — только ученики, и сервер
 * отклоняет обратное. Переключатель, который всегда в одном положении, — не выбор.
 */
export function SurveyAudienceScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const surveyId = payload?.surveyId;
  const card = useAdminSurvey(surveyId);
  const classes = useSurveyAudienceClasses();
  const commands = useSurveyCommands();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (selected != null || !card.survey) return;
    setSelected(card.survey.audienceClassIds ?? []);
  }, [card.survey, selected]);

  const chosen = selected ?? [];

  function toggle(id) {
    setSelected((current) => {
      const rows = current ?? [];
      return rows.includes(id) ? rows.filter((value) => value !== id) : [...rows, id];
    });
  }

  async function save() {
    const saved = await commands.setAudience(surveyId, chosen);
    if (saved) nav?.back();
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={classes.loading ? [] : classes.rows}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={(
          <ScreenHeader
            title="Классы"
            back={() => nav?.back()}
            sub={`Выбрано: ${chosen.length}`}
          />
        )}
        renderItem={({ item }) => {
          const active = chosen.includes(item.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => toggle(item.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: 16,
                marginBottom: 8,
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: active ? c.blue : c.border,
                backgroundColor: active ? c.blueSoft : c.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: active ? 0 : 1, borderColor: c.borderStrong, backgroundColor: active ? c.blue : c.surface, alignItems: 'center', justifyContent: 'center' }}>
                {active ? <Icon name="check" size={14} color={c.heroInk} strokeWidth={3} /> : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{item.name}</Txt>
                <Txt style={{ marginTop: 2, fontSize: 12, color: item.studentsCount ? c.inkMuted : c.gold || c.inkMuted }}>
                  {item.studentsCount ? `Учеников: ${item.studentsCount}` : 'В классе нет учеников'}
                </Txt>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={classes.loading ? (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {[0, 1, 2, 3].map((value) => (
              <View key={value} style={{ height: 62, borderRadius: 14, backgroundColor: c.bg2 }} />
            ))}
          </View>
        ) : (
          <StateView
            icon="alertTriangle"
            tone={classes.error ? 'error' : undefined}
            title={classes.error ? 'Не удалось загрузить классы' : 'Классов пока нет'}
            subtitle={classes.error || 'Классы заводит администрация школы.'}
            actionLabel={classes.error ? 'Повторить' : undefined}
            onAction={classes.error ? classes.reload : undefined}
            style={{ paddingTop: 40 }}
          />
        )}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />

      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 8), gap: 8, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, ...shadowLg }, shadowLg]}>
        {commands.errorText ? (
          <Txt accessibilityRole="alert" style={{ fontSize: 12, color: c.red }}>{commands.errorText}</Txt>
        ) : null}
        <FilledButton disabled={commands.busy} onPress={save}>
          {commands.busy ? 'Сохраняем…' : 'Сохранить'}
        </FilledButton>
      </View>
    </Screen>
  );
}
