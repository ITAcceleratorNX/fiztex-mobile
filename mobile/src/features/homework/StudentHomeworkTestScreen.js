import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  Card,
  ConfirmDialog,
  PrimaryButton,
  ScreenHeader,
  StateView,
  Banner,
} from '@shared/components/ui';
import { QuestionBody } from '@shared/components/QuestionBody';
import { MathText } from '@shared/math/MathText';
import { useTheme } from '@shared/theme/ThemeContext';
import { useHomeworkTest } from '@shared/hooks/useHomework';

/**
 * Прохождение теста домашнего задания (ТЗ HOMEWORK-BE-006 §6).
 *
 * <p><b>Это домашка, а не экзамен.</b> Ни таймера, ни отсчёта, ни блокировки экрана —
 * всё это есть у вступительного теста, и переносить оттуда визуальный язык нельзя:
 * ребёнок делает уроки дома, а не сдаёт под надзором. По той же причине вопросы идут
 * списком, а не по одному: домашку хочется окинуть взглядом и вернуться к пропущенному.
 *
 * <p><b>Черновик переживает звонок.</b> Ответы пишутся в память устройства на каждое
 * изменение: серверного черновика ТЗ не предусматривает, а если приложение уйдёт в фон
 * и потеряет ввод, ребёнок не станет вводить всё заново — он просто не сдаст задание.
 *
 * <p><b>Баллов после отправки нет</b> — их и не приходит с сервера. Иначе тест
 * превращается в тренажёр: отправил, увидел ошибки, попросил вернуть работу,
 * переотправил уже с ответами.
 */
export function StudentHomeworkTestScreen({ nav, payload }) {
  const { c } = useTheme();
  const homeworkId = payload?.homeworkId;
  const title = payload?.title;

  const { questions, loading, error, reload, submit, sending, sendError, clearSendError } =
    useHomeworkTest(homeworkId);

  const [answers, setAnswers] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const draftKey = `homework-answers:${homeworkId}`;
  const restored = useRef(false);
  const saveTimer = useRef(null);

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

  const list = useMemo(() => questions ?? [], [questions]);
  const answered = useMemo(
    () => list.filter((question) => isAnswered(answers[question.id])).length,
    [list, answers],
  );
  const unanswered = list.length - answered;

  const setAnswer = useCallback((questionId, next) => {
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
  }, []);

  const onSubmit = useCallback(async () => {
    setConfirming(false);
    const payload = list.map((question) => {
      const value = answers[question.id] ?? {};
      return question.type === 'OPEN_TEXT'
        ? { questionId: question.id, openText: value.openTextAnswer ?? '' }
        : { questionId: question.id, selectedOptionIds: value.selectedOptionIds ?? [] };
    });
    const ok = await submit(payload);
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

  return (
    <Screen>
      <ScreenHeader title={title || 'Тест'} back={() => nav.back()} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <TestProgress answered={answered} total={list.length} />

        {sendError ? (
          <Banner icon="alertTriangle">
            {sendError}
          </Banner>
        ) : null}

        {list.map((question, index) => (
          <Card key={question.id}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Txt style={{ fontSize: 13, fontWeight: '700', color: c.inkMuted }}>
                {index + 1} из {list.length}
              </Txt>
              {question.maxScore ? (
                <Txt style={{ fontSize: 13, color: c.inkMuted }}>
                  · {formatScore(question.maxScore)}
                </Txt>
              ) : null}
            </View>

            <MathText
              text={question.text}
              style={{ fontSize: 17, lineHeight: 24, fontWeight: '600', color: c.ink, marginBottom: 14 }}
            />

            <QuestionBody
              question={question}
              value={answers[question.id]}
              onChange={(next) => setAnswer(question.id, next)}
            />
          </Card>
        ))}
      </ScrollView>

      <SubmitBar
        unanswered={unanswered}
        sending={sending}
        onPress={() => {
          clearSendError();
          setConfirming(true);
        }}
      />

      <ConfirmDialog
        visible={confirming}
        title="Отправить работу?"
        message="После отправки изменить ответы можно будет, только если учитель вернёт работу."
        confirmLabel="Отправить"
        onConfirm={onSubmit}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

/** «Ответили на 3 из 10», а не проценты: ребёнку важно, сколько осталось. */
function TestProgress({ answered, total }) {
  const { c } = useTheme();
  const ratio = total > 0 ? answered / total : 0;
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ fontSize: 13, color: c.inkMuted }}>{progressLabel(answered, total)}</Txt>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(ratio * 100)}%`, height: '100%', backgroundColor: c.green }} />
      </View>
    </View>
  );
}

/**
 * Кнопка отправки у нижнего края. Не выключается при неполных ответах: она говорит,
 * сколько осталось, а не молчит — отказ после нажатия ребёнок читает как поломку.
 */
function SubmitBar({ unanswered, sending, onPress }) {
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
      {unanswered > 0 ? (
        <Txt style={{ fontSize: 13, color: c.inkMuted, textAlign: 'center' }}>
          Осталось ответить: {unanswered}
        </Txt>
      ) : null}
      <PrimaryButton onPress={onPress} disabled={sending || unanswered > 0}>
        {sending ? 'Отправляем…' : 'Отправить работу'}
      </PrimaryButton>
    </View>
  );
}

function progressLabel(answered, total) {
  return `Ответили на ${answered} из ${total}`;
}

/** Ответ считается данным, если выбран хотя бы вариант или написан непустой текст. */
function isAnswered(value) {
  if (!value) return false;
  if ((value.selectedOptionIds ?? []).length > 0) return true;
  return Boolean((value.openTextAnswer ?? '').trim());
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
