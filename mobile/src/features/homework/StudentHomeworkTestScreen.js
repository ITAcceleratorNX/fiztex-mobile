import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import {
  Card,
  ConfirmDialog,
  FilledButton,
  OutlineButton,
  ScreenHeader,
  StateView,
  Banner,
} from '@shared/components/ui';
import { QuestionBody } from '@shared/components/QuestionBody';
import { MathText } from '@shared/math/MathText';
import { useTheme } from '@shared/theme/ThemeContext';
import { useHomeworkTest } from '@shared/hooks/useHomework';
import { AnswerPhotos } from './AnswerPhotos';
import { useHomeworkAnticheat } from './useHomeworkAnticheat';
import { answeredCount, isAnswered, toSubmitPayload } from './homeworkTestModel';

/**
 * Прохождение теста домашнего задания (ТЗ HOMEWORK-BE-006 §6, ANTICHEAT-001).
 *
 * <p><b>Один вопрос на экран — как во вступительном тесте.</b> Раньше вопросы шли списком:
 * так задание видно целиком, но отвечать на телефоне невозможно — длинная лента с
 * вариантами, полями ввода и фотографиями прокручивается мимо того места, куда только что
 * нажали, а клавиатура закрывает следующий вопрос. Один вопрос на экран убирает и то и
 * другое, а «окинуть взглядом» возвращает навигатор внизу: он показывает все номера и на
 * каждом видно, отвечен вопрос или нет.
 *
 * <p><b>Это по-прежнему домашка, а не экзамен.</b> Таймера нет и не будет, переход назад
 * свободный, пропускать вопросы можно: ограничения вступительного теста идут от того, что
 * он сдаётся под надзором и в отведённое время, а здесь ни того ни другого.
 *
 * <p><b>Черновик переживает звонок.</b> Ответы пишутся в память устройства на каждое
 * изменение: серверного черновика ТЗ не предусматривает, а если приложение уйдёт в фон и
 * потеряет ввод, ребёнок не станет вводить всё заново — он просто не сдаст задание.
 * Античит этого не меняет: наказывать потерей работы за уход в другое приложение ТЗ прямо
 * запрещает (§3).
 *
 * <p><b>Баллов после отправки нет</b> — их и не приходит с сервера. Иначе тест превращается
 * в тренажёр: отправил, увидел ошибки, попросил вернуть работу, переотправил уже с ответами.
 */
export function StudentHomeworkTestScreen({ nav, payload }) {
  const { c } = useTheme();
  const homeworkId = payload?.homeworkId;
  const title = payload?.title;
  const antiCheatEnabled = Boolean(payload?.antiCheatEnabled);

  const { questions, loading, error, reload, submit, sending, sendError, clearSendError } =
    useHomeworkTest(homeworkId);

  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const draftKey = `homework-answers:${homeworkId}`;
  const restored = useRef(false);
  const saveTimer = useRef(null);
  const scroller = useRef(null);

  const list = useMemo(() => questions ?? [], [questions]);

  // Вопрос, на котором ученик сейчас, — в ref: событию античита нужен его номер (§5), а
  // пересоздавать из-за перелистывания подписку на AppState незачем.
  const currentQuestionId = useRef(null);
  currentQuestionId.current = list[index]?.id ?? null;

  const anticheat = useHomeworkAnticheat({
    enabled: antiCheatEnabled && !sent,
    homeworkId,
    mode: 'test',
    questionIdRef: currentQuestionId,
  });

  // Черновик поднимается один раз, до первого ввода: иначе он затрёт то, что ребёнок
  // успел напечатать, пока читалось хранилище.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (cancelled || !raw) return;
        setAnswers(JSON.parse(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        restored.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  // Дебаунс, чтобы не писать в хранилище на каждую букву открытого ответа.
  useEffect(() => {
    if (!restored.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(draftKey, JSON.stringify(answers)).catch(() => undefined);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, draftKey]);

  const answered = useMemo(() => answeredCount(list, answers), [list, answers]);
  const unanswered = list.length - answered;

  const setAnswer = useCallback((questionId, next) => {
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
  }, []);

  // Новый вопрос всегда начинается сверху: иначе после длинного вопроса следующий
  // открывается где-то с середины, и ребёнок не видит его текста.
  const goTo = useCallback((next) => {
    setIndex(next);
    scroller.current?.scrollTo?.({ y: 0, animated: false });
  }, []);

  const leave = useCallback(() => {
    if (!sent) anticheat.logLeave();
    nav.back();
  }, [sent, anticheat, nav]);

  const onSubmit = useCallback(async () => {
    setConfirming(false);
    const ok = await submit(toSubmitPayload(list, answers));
    if (ok) {
      await AsyncStorage.removeItem(draftKey).catch(() => undefined);
      setSent(true);
    }
  }, [list, answers, submit, draftKey]);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Тест" back={() => nav.back()} />
        <StateView icon="clock" title="Загружаем вопросы…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Тест" back={() => nav.back()} />
        <StateView
          tone="error"
          icon="alertTriangle"
          title="Не удалось загрузить тест"
          actionLabel={error === 'load' ? 'Повторить' : undefined}
          onAction={error === 'load' ? reload : undefined}
        />
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen>
        <ScreenHeader title="Тест" back={() => nav.back()} />
        <StateView
          tone="brand"
          icon="check"
          title="Работа отправлена"
          subtitle="Результат появится, когда учитель проверит работу и поставит оценку."
          actionLabel="К заданию"
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
        <ScreenHeader title={title || 'Тест'} back={leave} />
        <StateView
          icon="fileText"
          title="В тесте пока нет вопросов"
          subtitle="Учитель ещё их не добавил. Загляните позже."
          actionLabel="К заданию"
          onAction={leave}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={title || 'Тест'} back={leave} />

      <TestProgress index={index} answered={answered} total={list.length} />

      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingBottom: 190, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/*
          Предупреждение античита ничего не прерывает (§3): ни теста, ни ответов. Это
          сообщение «учитель это увидит», и закрыть его можно одним нажатием.
        */}
        {anticheat.warning ? (
          <Pressable onPress={anticheat.dismissWarning}>
            <Banner icon="alertTriangle">{anticheat.warning}</Banner>
          </Pressable>
        ) : null}

        {sendError ? <Banner icon="alertTriangle">{sendError}</Banner> : null}

        <Card key={question.id}>
          <QuestionHeader index={index} total={list.length} maxScore={question.maxScore} />

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
            onChange={(next) => setAnswer(question.id, next)}
          />

          {/*
            Решение задачи по физике — это выкладки и чертёж: набирать их текстом на
            телефоне ребёнок не станет. Разрешает фотографию учитель, по каждому вопросу
            отдельно, поэтому и блок появляется только там, где он её разрешил.
          */}
          {question.allowPhoto ? (
            <AnswerPhotos homeworkId={homeworkId} question={question} />
          ) : null}
        </Card>

        <QuestionNavigator
          questions={list}
          answers={answers}
          index={index}
          onPick={goTo}
        />
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
        title="Отправить работу?"
        message={
          unanswered > 0
            ? `Без ответа осталось вопросов: ${unanswered}. После отправки изменить ответы можно будет, только если учитель вернёт работу.`
            : 'После отправки изменить ответы можно будет, только если учитель вернёт работу.'
        }
        confirmLabel="Отправить"
        busy={sending}
        onConfirm={onSubmit}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

/** «Вопрос 3 из 10» и полоса по отвеченным: где ты сейчас и сколько ещё осталось. */
function TestProgress({ index, answered, total }) {
  const { c } = useTheme();
  const ratio = total > 0 ? answered / total : 0;
  return (
    <View style={{ gap: 8, paddingBottom: 12 }}>
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

function QuestionHeader({ index, total, maxScore }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      <Txt style={{ fontSize: 13, fontWeight: '700', color: c.inkMuted }}>
        {index + 1} из {total}
      </Txt>
      {maxScore ? (
        <Txt style={{ fontSize: 13, color: c.inkMuted }}>· {formatScore(maxScore)}</Txt>
      ) : null}
    </View>
  );
}

/**
 * Навигатор по номерам. Он и заменяет список: с одного экрана видно, сколько вопросов,
 * какие отвечены и на каком ты сейчас, — и на любой можно перейти одним нажатием.
 */
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

/**
 * «Назад» и «Далее» у нижнего края, «Отправить» — на последнем вопросе.
 *
 * <p>Отправка не выключается при неполных ответах: она говорит, сколько осталось, а
 * молчаливый отказ после нажатия ребёнок читает как поломку. Пропущенный вопрос сервер
 * всё равно не примет, и об этом сказано в диалоге подтверждения — до отправки, а не после.
 */
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
            {sending ? 'Отправляем…' : 'Отправить работу'}
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

function formatScore(score) {
  const value = Number(score);
  const rounded = Number.isInteger(value) ? value : value.toFixed(1);
  return `${rounded} ${plural(value, ['балл', 'балла', 'баллов'])}`;
}

function plural(value, forms) {
  const n = Math.floor(Math.abs(value)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}
