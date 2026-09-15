import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { Card, ConfirmDialog, ScreenHeader, StateView } from '@shared/components/ui';
import { QuestionBody } from '@shared/components/QuestionBody';
import { QuestionFigure } from '@shared/components/QuestionFigure';
import { MathText } from '@shared/math/MathText';
import { useTheme } from '@shared/theme/ThemeContext';
import { usePsychTestTaking } from '@shared/hooks/usePsychTests';
import {
  answeredCount, answersFromSaved, toSaveAnswerRequest,
} from '@features/survey/surveyTestModel';
import {
  NavBar, QuestionHeader, QuestionNavigator, SurveyProgress,
} from '@features/survey/SurveyTakeScreen';

const DEFAULT_TITLE = 'Психологический тест';

/**
 * Прохождение психологического теста учеником (PSYCHOLOGIST-002).
 *
 * <p>Устроено как прохождение опроса, и детали вёрстки — прогресс, навигатор по вопросам,
 * нижняя панель — у них общие: тест не оценивается, без таймера и без антисписывания, черновик
 * ответов серверный. Отличий три: инструкция психолога перед первым вопросом, рисунок к
 * вопросу и слова на экране после отправки.
 *
 * <p><b>Результата здесь нет и не будет.</b> Ответы видит только школьный психолог, поэтому
 * после отправки — «Ответы приняты», без баллов и без «правильных» ответов: сервер их ученику
 * и не отдаёт.
 *
 * <p>`canAnswer` — готовое серверное решение (не отправлено, приём не закрыт, срок не прошёл);
 * экран его не пересчитывает по датам.
 */
export function PsychTestTakeScreen({ nav, payload }) {
  const { c } = useTheme();
  const assignmentId = payload?.assignmentId;
  const titleFromHome = payload?.title;

  const { test, loading, error, reload, saveAnswer, submit, sending, sendError, clearSendError } =
    usePsychTestTaking(assignmentId);

  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const scroller = useRef(null);
  const seededFor = useRef(null);
  const saveTimers = useRef({});

  const list = useMemo(() => test?.questions ?? [], [test]);
  const title = test?.title || titleFromHome || DEFAULT_TITLE;

  // Черновик поднимается из ответа сервера один раз на назначение — не на каждую перезагрузку,
  // иначе она затёрла бы то, что ученик успел выбрать между запросами.
  useEffect(() => {
    if (!test || seededFor.current === assignmentId) return;
    setAnswers(answersFromSaved(test.savedAnswers));
    seededFor.current = assignmentId;
  }, [test, assignmentId]);

  useEffect(() => () => {
    Object.values(saveTimers.current).forEach(clearTimeout);
  }, []);

  const answered = useMemo(() => answeredCount(list, answers), [list, answers]);
  const unanswered = list.length - answered;

  // Выбор варианта уходит сразу, открытый текст — с задержкой: иначе каждая буква стала бы
  // отдельным запросом.
  const setAnswer = useCallback((question, next) => {
    setAnswers((prev) => ({ ...prev, [question.id]: next }));
    const request = toSaveAnswerRequest(question, next);
    if (question.type === 'OPEN_TEXT') {
      clearTimeout(saveTimers.current[question.id]);
      saveTimers.current[question.id] = setTimeout(() => saveAnswer(request), 600);
    } else {
      saveAnswer(request);
    }
  }, [saveAnswer]);

  const goTo = useCallback((next) => {
    setIndex(next);
    scroller.current?.scrollTo?.({ y: 0, animated: false });
  }, []);

  const onSubmit = useCallback(async () => {
    setConfirming(false);
    // Отложенный автосейв открытого ответа дожидается отправки, а не обгоняется ею: сервер
    // принял бы отправку первой, отклонил сохранение поверх неё — и последняя набранная
    // фраза не попала бы в ответы.
    const pending = Object.entries(saveTimers.current).map(([questionId, timer]) => {
      clearTimeout(timer);
      const question = list.find((q) => String(q.id) === String(questionId));
      return question ? saveAnswer(toSaveAnswerRequest(question, answers[question.id])) : null;
    });
    saveTimers.current = {};
    await Promise.all(pending);
    const ok = await submit();
    if (ok) setSent(true);
  }, [submit, saveAnswer, list, answers]);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title={title} back={() => nav.back()} />
        <StateView icon="clock" title="Загружаем вопросы…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title={title} back={() => nav.back()} />
        <StateView
          tone="error"
          icon="alertTriangle"
          title={error === 'missing' ? 'Тест не найден' : 'Не удалось загрузить тест'}
          subtitle={error === 'missing' ? 'Возможно, его уже убрали из назначенных.' : undefined}
          actionLabel={error === 'load' ? 'Повторить' : undefined}
          onAction={error === 'load' ? reload : undefined}
        />
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen>
        <ScreenHeader title={title} back={() => nav.back()} />
        <StateView
          tone="brand"
          icon="check"
          title="Ответы приняты"
          subtitle="Спасибо! Ваши ответы увидит только школьный психолог."
          actionLabel="На главную"
          onAction={() => nav.back()}
        />
      </Screen>
    );
  }

  if (!test?.canAnswer) {
    const already = test?.responseStatus === 'COMPLETED';
    return (
      <Screen>
        <ScreenHeader title={title} back={() => nav.back()} />
        <StateView
          tone={already ? 'brand' : 'neutral'}
          icon={already ? 'check' : 'lock'}
          title={already ? 'Ответы уже приняты' : 'Тест сейчас недоступен'}
          subtitle={
            already
              ? 'Спасибо! Ваши ответы увидит только школьный психолог.'
              : 'Приём ответов закрыт — прошёл срок или психолог завершил тест.'
          }
          actionLabel="На главную"
          onAction={() => nav.back()}
        />
      </Screen>
    );
  }

  const question = list[index];
  const isLast = index === list.length - 1;

  if (!question) {
    return (
      <Screen>
        <ScreenHeader title={title} back={() => nav.back()} />
        <StateView icon="fileText" title="В тесте пока нет вопросов" actionLabel="На главную" onAction={() => nav.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={title} back={() => nav.back()} />

      <SurveyProgress index={index} answered={answered} total={list.length} />

      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 190, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {sendError ? (
          <Pressable onPress={clearSendError}>
            <Txt style={{ fontSize: 13, fontWeight: '600', color: c.red }}>{sendError}</Txt>
          </Pressable>
        ) : null}

        {index === 0 ? <Instructions text={test.instructions} /> : null}

        <Card key={question.id}>
          <QuestionHeader index={index} total={list.length} />

          <MathText
            text={question.text}
            style={{
              fontSize: 17,
              lineHeight: 24,
              fontWeight: '600',
              color: c.ink,
              marginBottom: 14,
            }}
          />

          <QuestionFigure imageUrl={question.imageUrl} />

          <QuestionBody
            question={question}
            value={answers[question.id]}
            onChange={(next) => setAnswer(question, next)}
          />
        </Card>

        <QuestionNavigator questions={list} answers={answers} index={index} onPick={goTo} />
      </ScrollView>

      <NavBar
        index={index}
        isLast={isLast}
        sending={sending}
        unanswered={unanswered}
        onBack={() => goTo(index - 1)}
        onNext={() => goTo(index + 1)}
        onFinish={() => {
          clearSendError();
          setConfirming(true);
        }}
      />

      <ConfirmDialog
        visible={confirming}
        title="Отправить ответы?"
        message={
          unanswered > 0
            ? `Без ответа осталось вопросов: ${unanswered}. После отправки изменить ответы будет нельзя.`
            : 'После отправки изменить ответы будет нельзя.'
        }
        confirmLabel="Отправить"
        busy={sending}
        onConfirm={onSubmit}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

/**
 * Инструкция психолога — поле «Правила» конструктора. Только перед первым вопросом: на
 * каждом следующем она отнимала бы место у самого вопроса.
 */
function Instructions({ text }) {
  const { c } = useTheme();
  if (!text) return null;
  return (
    <View style={{ gap: 4, padding: 14, borderRadius: 16, backgroundColor: c.blueSoft }}>
      <Txt style={{ fontSize: 12, fontWeight: '700', color: c.blue }}>Инструкция</Txt>
      <Txt style={{ fontSize: 14, lineHeight: 20, color: c.ink }}>{text}</Txt>
    </View>
  );
}
