import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import {
  Card, ConfirmDialog, FilledButton, OutlineButton, ScreenHeader, StateView,
} from '@shared/components/ui';
import { QuestionBody } from '@shared/components/QuestionBody';
import { MathText } from '@shared/math/MathText';
import { useTheme } from '@shared/theme/ThemeContext';
import { useSurveyTest } from '@shared/hooks/useSurveys';
import { isPsychTest } from '@shared/api/surveyStatus';
import { answeredCount, answersFromSaved, isAnswered, toSaveAnswerRequest } from './surveyTestModel';

/**
 * Слова экрана. Тест школьного психолога — тот же опрос, поэтому развилка здесь в словах, а не
 * во второй вёрстке, которая разошлась бы с этой при первой правке.
 */
const SURVEY_COPY = {
  title: 'Опрос',
  loadError: 'Не удалось загрузить опрос',
  thanks: 'Спасибо за ответы — результаты не оцениваются.',
  unavailable: 'Опрос сейчас недоступен',
  emptyTitle: 'В опросе пока нет вопросов',
  emptySubtitle: 'Школа ещё их не добавила. Загляните позже.',
  back: 'К списку опросов',
};

const PSYCH_TEST_COPY = {
  title: 'Психологический тест',
  loadError: 'Не удалось загрузить тест',
  // Ни баллов, ни «правильных» ответов: сервер их ученику не отдаёт, а ответы читает один
  // психолог — это и есть то, что ученику важно услышать после отправки.
  thanks: 'Спасибо! Ваши ответы увидит только школьный психолог.',
  unavailable: 'Тест сейчас недоступен',
  emptyTitle: 'В тесте пока нет вопросов',
  emptySubtitle: 'Психолог ещё их не добавил. Загляните позже.',
  // Тест открывают только с главной — плитка «Тест от школьного психолога».
  back: 'На главную',
};

/**
 * Прохождение опроса — вопрос за вопросом, как тест домашнего задания
 * (`StudentHomeworkTestScreen`), но без единой детали экзамена или домашки:
 *
 * <ul>
 *   <li>нет таймера и нет античита — опрос не надзорный сценарий (ТЗ Фаза 3 §5);</li>
 *   <li>нет баллов и признака правильности — опрос никогда не оценивается;</li>
 *   <li>нет местного черновика в `AsyncStorage` — черновик серверный (`PUT /answers` на
 *       каждое изменение), и именно им, а не памятью устройства, экран восстанавливает
 *       прогресс при открытии;</li>
 *   <li>нет развилки по `mode` (именной/анонимный опрос) — с точки зрения отвечающего
 *       оба выглядят одинаково, разницу считает бэкенд.</li>
 * </ul>
 *
 * <p><b>`canAnswer` не пересчитывается здесь.</b> Это готовый флаг с сервера — не
 * отправлен ли опрос уже, идёт ли сейчас окно между `startAt` и `deadlineAt`, активен ли
 * опрос вообще. Экран его только читает: `false` — форма не рисуется вовсе, показывается
 * состояние «недоступен», и никаких попыток предсказать это условие по датам заранее.
 *
 * <p><b>Тест школьного психолога проходится здесь же</b> (PSYCHOLOGIST-002): это опрос с
 * `origin=PSYCHOLOGICAL`. Отличаются слова, инструкция психолога перед первым вопросом (описание
 * теста) и то, кому уходят ответы.
 */
export function SurveyTakeScreen({ nav, payload }) {
  const { c } = useTheme();
  const surveyId = payload?.surveyId;
  const titleFromList = payload?.title;

  const { questions, survey, loading, error, reload, saveAnswer, submit, sending, sendError, clearSendError } =
    useSurveyTest(surveyId);

  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const scroller = useRef(null);
  const seededFor = useRef(null);
  const saveTimers = useRef({});

  const list = useMemo(() => questions ?? [], [questions]);
  // До загрузки вид известен из того, что передала главная; дальше решает ответ сервера.
  const psych = isPsychTest(survey ?? payload);
  const copy = psych ? PSYCH_TEST_COPY : SURVEY_COPY;

  // Черновик поднимается из ответа сервера один раз на опрос — не на каждую силент-
  // перезагрузку, иначе она затёрла бы то, что отвечающий успел набрать между запросами.
  useEffect(() => {
    if (!survey || seededFor.current === surveyId) return;
    setAnswers(answersFromSaved(survey.savedAnswers));
    seededFor.current = surveyId;
  }, [survey, surveyId]);

  useEffect(() => () => {
    Object.values(saveTimers.current).forEach(clearTimeout);
  }, []);

  const answered = useMemo(() => answeredCount(list, answers), [list, answers]);
  const unanswered = list.length - answered;

  // Автосейв на каждое изменение (§3 контракта). Выбор варианта уходит сразу — это
  // дискретное нажатие; открытый текст — с небольшой задержкой, иначе каждая буква стала
  // бы отдельным запросом.
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
        <ScreenHeader title={titleFromList || copy.title} back={() => nav.back()} />
        <StateView icon="clock" title="Загружаем вопросы…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title={titleFromList || copy.title} back={() => nav.back()} />
        <StateView
          tone="error"
          icon="alertTriangle"
          title={copy.loadError}
          actionLabel={error === 'load' ? 'Повторить' : undefined}
          onAction={error === 'load' ? reload : undefined}
        />
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen>
        <ScreenHeader title={survey?.title || titleFromList || copy.title} back={() => nav.back()} />
        <StateView
          tone="brand"
          icon="check"
          title="Ответы приняты"
          subtitle={copy.thanks}
          actionLabel={copy.back}
          onAction={() => nav.back()}
        />
      </Screen>
    );
  }

  // Отвечать нельзя: опрос уже пройден, ещё не начался или закончился. Флаг готовый,
  // пересчитывать его по датам самим — значит рано или поздно разойтись с сервером.
  if (!survey?.canAnswer) {
    const already = survey?.responseStatus === 'COMPLETED';
    return (
      <Screen>
        <ScreenHeader title={survey?.title || titleFromList || copy.title} back={() => nav.back()} />
        <StateView
          tone={already ? 'brand' : 'neutral'}
          icon={already ? 'check' : 'lock'}
          title={already ? 'Ответы уже приняты' : copy.unavailable}
          subtitle={already ? copy.thanks : 'Возможно, приём ответов ещё не начался или уже завершён.'}
          actionLabel={copy.back}
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
        <ScreenHeader title={survey?.title || titleFromList || copy.title} back={() => nav.back()} />
        <StateView
          icon="fileText"
          title={copy.emptyTitle}
          subtitle={copy.emptySubtitle}
          actionLabel={copy.back}
          onAction={() => nav.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={survey?.title || titleFromList || copy.title} back={() => nav.back()} />

      <SurveyProgress index={index} answered={answered} total={list.length} />

      <ScrollView
        ref={scroller}
        // Поля те же 16, что у `ScreenHeader` и нижней панели: без них карточка вопроса
        // и номера вопросов упирались в края экрана, а «Отвечено: N» обрезалось справа.
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 190, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {sendError ? (
          <Pressable onPress={clearSendError}>
            <Txt style={{ fontSize: 13, fontWeight: '600', color: c.red }}>{sendError}</Txt>
          </Pressable>
        ) : null}

        {psych && index === 0 ? <Instructions text={survey?.description} /> : null}

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
 * Инструкция психолога — описание теста. Только перед первым вопросом: на каждом следующем
 * она отнимала бы место у самого вопроса. У школьного опроса блока нет — описание опроса экран
 * прохождения не показывает и раньше не показывал.
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

/** «Вопрос 3 из 10» и полоса по отвеченным. */
function SurveyProgress({ index, answered, total }) {
  const { c } = useTheme();
  const ratio = total > 0 ? answered / total : 0;
  return (
    <View style={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink }}>
          Вопрос {index + 1} из {total}
        </Txt>
        <Txt style={{ fontSize: 13, color: c.inkMuted }}>Отвечено: {answered}</Txt>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' }}>
        <View
          style={{ width: `${Math.round(ratio * 100)}%`, height: '100%', backgroundColor: c.green }}
        />
      </View>
    </View>
  );
}

function QuestionHeader({ index, total }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      <Txt style={{ fontSize: 13, fontWeight: '700', color: c.inkMuted }}>
        {index + 1} из {total}
      </Txt>
    </View>
  );
}

/** Навигатор по номерам вопросов — тот же приём, что и у теста домашнего задания. */
function QuestionNavigator({ questions, answers, index, onPick }) {
  const { c } = useTheme();
  if (questions.length < 2) return null;
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ fontSize: 13, color: c.inkMuted }}>Все вопросы</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {questions.map((question, i) => {
          const done = isAnswered(answers[question.id]);
          const active = i === index;
          return (
            <Pressable
              key={question.id}
              accessibilityRole="button"
              accessibilityLabel={`Вопрос ${i + 1}${done ? ', отвечен' : ''}`}
              onPress={() => onPick(i)}
              style={{
                minWidth: 40,
                height: 40,
                paddingHorizontal: 10,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? c.blue : done ? c.blueSoft : c.bg,
                borderWidth: 1,
                borderColor: active ? c.blue : done ? c.blue : c.border,
              }}
            >
              <Txt
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: active ? '#fff' : done ? c.blue : c.inkMuted,
                }}
              >
                {String(i + 1)}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** «Назад» / «Далее», «Отправить» — на последнем вопросе. Неполные ответы не блокируют кнопку. */
function NavBar({ index, isLast, sending, unanswered, onBack, onNext, onFinish }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 16,
        paddingBottom: 28,
        backgroundColor: c.bg,
        borderTopWidth: 1,
        borderTopColor: c.border,
        gap: 8,
      }}
    >
      {isLast && unanswered > 0 ? (
        <Txt style={{ fontSize: 13, color: c.inkMuted, textAlign: 'center' }}>
          Осталось ответить: {unanswered}
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {index > 0 ? (
          <OutlineButton size="lg" onPress={onBack} style={{ width: 120 }}>
            Назад
          </OutlineButton>
        ) : null}
        {isLast ? (
          <FilledButton size="lg" onPress={onFinish} disabled={sending} style={{ flex: 1 }}>
            {sending ? 'Отправляем…' : 'Отправить ответы'}
          </FilledButton>
        ) : (
          <FilledButton size="lg" onPress={onNext} style={{ flex: 1 }}>
            Далее
          </FilledButton>
        )}
      </View>
    </View>
  );
}
