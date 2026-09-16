import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, shadowLg } from '@shared/components/Screen';
import { Card, FilledButton, Pill, ScreenHeader, SegmentedSwitch, StateView, TextField } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useSurveyCommands, useSurveyQuestions } from '@shared/hooks/useSurveyAdmin';
import {
  QUESTION_TYPES,
  addOption,
  dropOption,
  emptyQuestion,
  hasProblems,
  isChoice,
  toDraft,
  toRequest,
  validate,
  withOption,
  withType,
} from '@shared/api/surveyAdminMap';

/**
 * Редактор вопросов опроса с телефона (PSYCHOLOGIST-002).
 *
 * <p>Собран по образцу редактора вопросов теста ДЗ, но проще: у опроса нет правильных
 * ответов, баллов и перемешивания — его не оценивают. Поэтому у варианта только текст, а
 * у вопроса только тип и формулировка.
 *
 * <p><b>Набор сохраняется целиком</b>: частичного сохранения нет ни на сервере, ни здесь.
 * «Сохранить» — единственный момент, когда что-то уходит наружу.
 *
 * <p><b>Перестановки нет намеренно</b> — вопросы идут в порядке добавления; стрелки
 * «выше-ниже» на телефоне промахиваются, а порядок правится в вебе.
 */
export function SurveyQuestionsScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const surveyId = payload?.surveyId;
  // Правку закрывает сервер у идущего опроса: людям уже раздали вопросы, и менять их под
  // ними нельзя. Экран об этом говорит, а не прячет кнопку молча.
  const readOnly = payload?.canEdit === false;

  const { questions, loading, error, reload } = useSurveyQuestions(surveyId);
  const commands = useSurveyCommands();
  const [drafts, setDrafts] = useState(null);

  useEffect(() => {
    if (questions == null || drafts != null) return;
    setDrafts(questions.map(toDraft));
  }, [questions, drafts]);

  const problems = useMemo(() => validate(drafts ?? []), [drafts]);
  const blocked = hasProblems(problems);

  const patch = useCallback((key, next) => {
    setDrafts((prev) => prev.map((question) => (question.key === key ? next : question)));
  }, []);

  async function save() {
    const saved = await commands.saveQuestions(surveyId, toRequest(drafts ?? []));
    if (saved) nav?.back();
  }

  if (loading && drafts == null) {
    return (
      <Screen>
        <ScreenHeader title="Вопросы" back={() => nav?.back()} />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {[0, 1].map((value) => (
            <View key={value} style={{ height: 120, borderRadius: 16, backgroundColor: c.bg2 }} />
          ))}
        </View>
      </Screen>
    );
  }
  if (error && drafts == null) {
    return (
      <Screen>
        <ScreenHeader title="Вопросы" back={() => nav?.back()} />
        <StateView
          icon="alertTriangle"
          tone="error"
          title="Не удалось загрузить вопросы"
          subtitle={error}
          actionLabel="Повторить"
          onAction={reload}
          style={{ marginTop: 60 }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 + insets.bottom, gap: 12 }} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Вопросы"
          back={() => nav?.back()}
          sub={readOnly ? 'Опрос уже идёт — вопросы только для чтения' : 'Правильных ответов у опроса нет'}
        />

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {(drafts ?? []).map((question, index) => {
            const issues = problems[question.key];
            return (
              <Card key={question.key} style={{ borderRadius: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pill color="gray">Вопрос {index + 1}</Pill>
                  {!readOnly ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Удалить вопрос ${index + 1}`}
                      onPress={() => setDrafts((prev) => prev.filter((item) => item.key !== question.key))}
                      hitSlop={8}
                      style={{ marginLeft: 'auto' }}
                    >
                      <Icon name="trash" size={18} color={c.inkMuted} />
                    </Pressable>
                  ) : null}
                </View>

                <TextField
                  value={question.text}
                  onChangeText={(text) => patch(question.key, { ...question, text })}
                  placeholder="Текст вопроса"
                  editable={!readOnly}
                  multiline
                  maxLength={1000}
                />

                <SegmentedSwitch
                  value={question.type}
                  options={QUESTION_TYPES}
                  onChange={readOnly ? () => {} : (type) => patch(question.key, withType(question, type))}
                />

                {isChoice(question.type) ? (
                  <View style={{ gap: 8 }}>
                    {question.options.map((option, optionIndex) => (
                      <View key={`option-${optionIndex}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextField
                          style={{ flex: 1 }}
                          value={option.text}
                          onChangeText={(text) => patch(question.key, withOption(question, optionIndex, text))}
                          placeholder={`Вариант ${optionIndex + 1}`}
                          editable={!readOnly}
                          maxLength={500}
                        />
                        {!readOnly && question.options.length > 2 ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Убрать вариант ${optionIndex + 1}`}
                            onPress={() => patch(question.key, dropOption(question, optionIndex))}
                            hitSlop={8}
                          >
                            <Icon name="x" size={18} color={c.inkMuted} />
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                    {!readOnly ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => patch(question.key, addOption(question))}
                        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 6, opacity: pressed ? 0.75 : 1 })}
                      >
                        <Icon name="plus" size={17} color={c.green} strokeWidth={2.4} />
                        <Txt style={{ fontSize: 13, fontWeight: '700', color: c.green }}>Ещё вариант</Txt>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <Txt style={{ fontSize: 12, color: c.inkMuted }}>Ученик ответит своими словами.</Txt>
                )}

                {issues ? (
                  <Txt accessibilityRole="alert" style={{ fontSize: 12, color: c.red }}>{issues.join(' ')}</Txt>
                ) : null}
              </Card>
            );
          })}

          {!readOnly ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setDrafts((prev) => [...(prev ?? []), emptyQuestion()])}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong, opacity: pressed ? 0.75 : 1 })}
            >
              <Icon name="plus" size={18} color={c.blue} strokeWidth={2.4} />
              <Txt style={{ fontSize: 14, fontWeight: '700', color: c.blue }}>Добавить вопрос</Txt>
            </Pressable>
          ) : null}

          {problems.form ? (
            <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{problems.form}</Txt>
          ) : null}
          {commands.errorText ? (
            <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{commands.errorText}</Txt>
          ) : null}
        </View>
      </ScrollView>

      {!readOnly ? (
        <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 8), borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, ...shadowLg }, shadowLg]}>
          <FilledButton disabled={blocked || commands.busy} onPress={save}>
            {commands.busy ? 'Сохраняем…' : 'Сохранить вопросы'}
          </FilledButton>
        </View>
      ) : null}
    </Screen>
  );
}
