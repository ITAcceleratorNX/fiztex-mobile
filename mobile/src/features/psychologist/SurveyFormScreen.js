import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, shadowLg } from '@shared/components/Screen';
import { FilledButton, ScreenHeader, TextField } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';
import { useSurveyCommands } from '@shared/hooks/useSurveyAdmin';
import { SURVEY_MODES } from '@shared/api/surveyAdminMap';

/**
 * Название, описание и режим опроса — форма создания и правки (PSYCHOLOGIST-002).
 *
 * <p>Режим («именной» или «анонимный») выбирает психолог, и это решение о том, увидит ли
 * он, кто как ответил. Менять его у идущего опроса сервер не даст — экран отправляет то,
 * что показал, и отказ показывает словами.
 *
 * <p>Аудитории и вопросов здесь нет: у них свои экраны, потому что это списки, а не поля.
 * Новый опрос сразу после создания открывается карточкой — оттуда и продолжают.
 */
export function SurveyFormScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const existing = payload?.survey ?? null;
  const commands = useSurveyCommands();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [mode, setMode] = useState(existing?.mode ?? 'NAMED');
  const [touched, setTouched] = useState(false);

  const valid = title.trim().length > 0;

  async function submit() {
    setTouched(true);
    if (!valid) return;
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      mode,
      // Срок и старт в телефоне не задаются: это поля календаря, и на экране в 390 точек
      // они стоили бы больше, чем дают. Опрос идёт, пока психолог его не завершит.
      startAt: existing?.startAt ?? null,
      deadlineAt: existing?.deadlineAt ?? null,
    };

    if (existing?.id) {
      const saved = await commands.update(existing.id, body);
      if (saved) nav?.back();
      return;
    }
    const created = await commands.create(body);
    // Созданный опрос — черновик без вопросов и классов: сразу ведём в карточку, где
    // написано, чего не хватает для публикации.
    if (created) nav?.replace('survey-card', { surveyId: created.id });
  }

  return (
    <Screen scroll={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 112 + insets.bottom, gap: 16 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={existing ? 'Изменить опрос' : 'Новый опрос'} back={() => nav?.back()} />

        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          <TextField
            label="Название"
            required
            value={title}
            onChangeText={setTitle}
            placeholder="Например, Адаптация пятиклассников"
            maxLength={200}
            error={touched && !valid ? 'Укажите название опроса.' : null}
          />
          <TextField
            label="Описание"
            value={description}
            onChangeText={setDescription}
            placeholder="Ученик увидит его перед первым вопросом"
            multiline
            maxLength={2000}
          />

          <View style={{ gap: 8 }}>
            <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink }}>Режим</Txt>
            {SURVEY_MODES.map((option) => {
              const active = option.value === mode;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMode(option.value)}
                  style={({ pressed }) => ({
                    padding: 13,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? c.blue : c.border,
                    backgroundColor: active ? c.blueSoft : c.surface,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Txt style={{ fontSize: 14, fontWeight: '700', color: active ? c.blue : c.ink }}>{option.label}</Txt>
                  <Txt style={{ marginTop: 2, fontSize: 12, color: c.inkMuted }}>{option.hint}</Txt>
                </Pressable>
              );
            })}
          </View>

          {commands.errorText ? (
            <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{commands.errorText}</Txt>
          ) : null}
        </View>
      </ScrollView>

      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 8), borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, ...shadowLg }, shadowLg]}>
        <FilledButton disabled={commands.busy} onPress={submit}>
          {commands.busy ? 'Сохраняем…' : existing ? 'Сохранить' : 'Создать опрос'}
        </FilledButton>
      </View>
    </Screen>
  );
}
