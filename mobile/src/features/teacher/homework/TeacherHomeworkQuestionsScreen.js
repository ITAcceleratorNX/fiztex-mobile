import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  Banner,
  Card,
  Checkbox,
  FilledButton,
  OutlineButton,
  ScreenHeader,
  SegmentedSwitch,
  StateView,
} from '@shared/components/ui';
import { HomeworkCardSkeleton } from '@features/homework/HomeworkStates';
import { MathText } from '@shared/math/MathText';
import { useTheme } from '@shared/theme/ThemeContext';
import { useHomeworkQuestions } from '@shared/hooks/useTeacherHomework';
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
  withCorrect,
  withOption,
  withType,
} from '@shared/api/homeworkQuestionsMap';

/**
 * Редактор вопросов теста с телефона.
 *
 * <p><b>Зачем он на телефоне.</b> До него тест можно было только сгенерировать в вебе:
 * приложение вопросов не показывало и не правило, и учитель, заведя тест с телефона,
 * упирался в тупик. Набирать десять вопросов пальцем никто не станет — но прочитать
 * сгенерированное и поправить кривую формулировку в дороге вполне реально, и ради этого
 * экран и существует.
 *
 * <p><b>Набор сохраняется целиком.</b> Частичного сохранения у вопросов нет ни на сервере,
 * ни здесь: учитель работает с черновиком, а «Сохранить» — единственный момент, когда
 * что-то уходит наружу.
 *
 * <p><b>Перестановки нет намеренно.</b> Вопросы идут в порядке добавления; стрелки
 * «выше-ниже» на телефоне мелкие и промахиваются, а порядок правится в вебе. Появится
 * запрос — заведём жест, а не две кнопки в 24 точки.
 */
export function TeacherHomeworkQuestionsScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const homeworkId = payload?.homeworkId;

  const { questions, loading, error, reload, save, saving, saveError, clearSaveError } =
    useHomeworkQuestions(homeworkId);

  const [drafts, setDrafts] = useState(null);
  const [openKey, setOpenKey] = useState(null);

  // Черновик поднимается один раз на загрузку: перечитывание поверх правок стёрло бы их.
  useEffect(() => {
    if (questions == null || drafts != null) return;
    setDrafts(questions.map(toDraft));
  }, [questions, drafts]);

  const problems = useMemo(() => validate(drafts ?? []), [drafts]);
  const blocked = hasProblems(problems);

  const patch = useCallback((key, next) => {
    setDrafts((prev) => prev.map((question) => (question.key === key ? next : question)));
  }, []);

  const onSave = useCallback(async () => {
    clearSaveError();
    const saved = await save(toRequest(drafts ?? []));
    if (saved) nav.back();
  }, [clearSaveError, save, drafts, nav]);

  if (loading || (drafts == null && !error)) {
    return (
      <Screen>
        <ScreenHeader title="Вопросы теста" back={nav.back} />
        <HomeworkCardSkeleton />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Вопросы теста" back={nav.back} />
        <StateView
          style={{ marginTop: 96 }}
          icon={error === 'forbidden' || error === 'missing' ? 'lock' : 'alertTriangle'}
          tone={error === 'load' ? 'error' : 'neutral'}
          title={error === 'load' ? 'Не удалось загрузить' : 'Вопросы недоступны'}
          subtitle={
            error === 'load'
              ? 'Проверьте связь и попробуйте ещё раз.'
              : 'Задание открыто не вам или его больше нет.'
          }
          actionLabel={error === 'load' ? 'Повторить' : 'Назад'}
          onAction={error === 'load' ? () => reload() : nav.back}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScreenHeader title="Вопросы теста" back={nav.back} sub={`${drafts.length} в тесте`} />

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {saveError ? <Banner icon="alertTriangle">{saveError}</Banner> : null}

          {drafts.length === 0 ? (
            <Banner icon="info">
              Вопросов пока нет. Добавьте их здесь или сгенерируйте с карточки задания —
              результат всё равно придётся перечитать.
            </Banner>
          ) : null}

          {drafts.map((question, index) => (
            <QuestionCard
              key={question.key}
              question={question}
              index={index + 1}
              problems={problems[index]}
              expanded={openKey === question.key}
              onToggle={() => setOpenKey((prev) => (prev === question.key ? null : question.key))}
              onChange={(next) => patch(question.key, next)}
              onDrop={() => {
                setDrafts((prev) => prev.filter((item) => item.key !== question.key));
                setOpenKey(null);
              }}
            />
          ))}

          <OutlineButton
            size="lg"
            onPress={() => {
              const added = emptyQuestion();
              setDrafts((prev) => [...prev, added]);
              setOpenKey(added.key);
            }}
          >
            Добавить вопрос
          </OutlineButton>
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: c.surface,
            borderTopWidth: 1,
            borderTopColor: c.border,
            gap: 8,
          }}
        >
          {blocked ? (
            <Txt style={{ fontSize: 12, color: c.inkMuted, textAlign: 'center' }}>
              Раскройте вопросы с пометками — там сказано, чего не хватает.
            </Txt>
          ) : null}
          <FilledButton disabled={blocked || saving} onPress={onSave}>
            {saving ? 'Сохраняем…' : 'Сохранить вопросы'}
          </FilledButton>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Вопрос сложён в строку, пока его не открыли: тест из десяти вопросов, развёрнутых
 * целиком, — это экран, по которому невозможно перемещаться.
 */
function QuestionCard({ question, index, problems, expanded, onToggle, onChange, onDrop }) {
  const { c } = useTheme();
  const choice = isChoice(question.type);

  return (
    <Card elevated style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <Txt style={{ fontSize: 13, fontWeight: '700', color: c.inkMuted }}>{index}</Txt>
        <View style={{ flex: 1 }}>
          {question.text.trim() ? (
            <MathText text={question.text} style={{ fontSize: 15, color: c.ink }} numberOfLines={2} />
          ) : (
            <Txt style={{ fontSize: 15, color: c.ink3 }}>Новый вопрос</Txt>
          )}
          <Txt style={{ fontSize: 12, color: c.inkMuted, marginTop: 2 }}>
            {QUESTION_TYPES.find((item) => item.value === question.type)?.label} · {question.maxScore}
          </Txt>
        </View>
        {problems.length > 0 ? <Icon name="alertTriangle" size={16} color={c.red} /> : null}
        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={18} color={c.inkMuted} />
      </Pressable>

      {problems.length > 0 ? (
        <View style={{ gap: 2 }}>
          {problems.map((message) => (
            <Txt key={message} style={{ fontSize: 12, color: c.red }}>
              {message}
            </Txt>
          ))}
        </View>
      ) : null}

      {expanded ? (
        <View style={{ gap: 10 }}>
          <SegmentedSwitch
            value={question.type}
            options={QUESTION_TYPES}
            onChange={(type) => onChange(withType(question, type))}
          />

          <TextInput
            value={question.text}
            onChangeText={(text) => onChange({ ...question, text })}
            placeholder="Текст вопроса. Формулы — между знаками доллара: $\\frac{m}{V}$"
            placeholderTextColor={c.ink3}
            multiline
            maxLength={4000}
            style={{ ...inputStyle(c), minHeight: 84, textAlignVertical: 'top', paddingTop: 12 }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt style={{ fontSize: 13, color: c.inkMuted }}>Балл</Txt>
            <TextInput
              value={String(question.maxScore)}
              onChangeText={(value) =>
                onChange({ ...question, maxScore: Number(value.replace(',', '.')) || 0 })
              }
              keyboardType="decimal-pad"
              style={{ ...inputStyle(c), width: 80 }}
            />
          </View>

          {choice ? (
            <View style={{ gap: 8 }}>
              <Txt style={{ fontSize: 13, fontWeight: '600', color: c.inkMuted }}>
                Варианты ответа
              </Txt>
              {question.options.map((option, optionIndex) => (
                <View key={option.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Вариант ${optionIndex + 1} правильный`}
                    accessibilityState={{ selected: option.correct }}
                    onPress={() => onChange(withCorrect(question, optionIndex))}
                    hitSlop={8}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: question.type === 'SINGLE_CHOICE' ? 13 : 7,
                      borderWidth: 2,
                      borderColor: option.correct ? c.green : c.border,
                      backgroundColor: option.correct ? c.green : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {option.correct ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
                  </Pressable>
                  <TextInput
                    value={option.text}
                    onChangeText={(text) => onChange(withOption(question, optionIndex, text))}
                    placeholder={`Вариант ${optionIndex + 1}`}
                    placeholderTextColor={c.ink3}
                    maxLength={2000}
                    style={{ ...inputStyle(c), flex: 1 }}
                  />
                  {question.options.length > 2 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Удалить вариант ${optionIndex + 1}`}
                      onPress={() => onChange(dropOption(question, optionIndex))}
                      hitSlop={8}
                    >
                      <Icon name="x" size={16} color={c.inkMuted} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              <OutlineButton onPress={() => onChange(addOption(question))}>Вариант</OutlineButton>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <TextInput
                value={question.referenceAnswer}
                onChangeText={(referenceAnswer) => onChange({ ...question, referenceAnswer })}
                placeholder="Эталонный ответ — ученику не показывается"
                placeholderTextColor={c.ink3}
                multiline
                maxLength={4000}
                style={{ ...inputStyle(c), minHeight: 64, textAlignVertical: 'top', paddingTop: 12 }}
              />
              <TextInput
                value={question.gradingCriteria}
                onChangeText={(gradingCriteria) => onChange({ ...question, gradingCriteria })}
                placeholder="Критерии оценки — их использует подсказка ИИ"
                placeholderTextColor={c.ink3}
                multiline
                maxLength={4000}
                style={{ ...inputStyle(c), minHeight: 64, textAlignVertical: 'top', paddingTop: 12 }}
              />
              {/*
                Решение задачи по физике — это выкладки и чертёж: набирать их текстом на
                телефоне ученик не станет.
              */}
              <Checkbox
                checked={question.allowPhoto}
                label="Разрешить фото решения"
                onPress={() => onChange({ ...question, allowPhoto: !question.allowPhoto })}
              />
              {question.allowPhoto ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Txt style={{ fontSize: 13, color: c.inkMuted }}>Не больше</Txt>
                  <TextInput
                    value={String(question.maxPhotos)}
                    onChangeText={(value) =>
                      onChange({ ...question, maxPhotos: Number(value) || 0 })
                    }
                    keyboardType="number-pad"
                    style={{ ...inputStyle(c), width: 64 }}
                  />
                  <Txt style={{ fontSize: 13, color: c.inkMuted }}>шт.</Txt>
                </View>
              ) : null}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onDrop}
            style={{ alignSelf: 'flex-start', paddingVertical: 6 }}
          >
            <Txt style={{ fontSize: 13, fontWeight: '600', color: c.red }}>Удалить вопрос</Txt>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

function inputStyle(c) {
  return {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: c.ink,
    backgroundColor: c.surface,
  };
}
