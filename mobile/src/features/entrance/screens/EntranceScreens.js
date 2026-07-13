import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { HexBadge } from '@shared/components/Hex';
import { Card, PrimaryButton, ScreenHeader, Pill } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';
import { useTheme } from '@shared/theme/ThemeContext';
import { useAppState } from '@shared/state/AppState';
import { admissionsApi } from '../api/entranceApi';
import { useAnticheat } from '../hooks/useAnticheat';
import { TestTimer } from '../components/TestTimer';
import { PrivacyOverlay } from '../components/PrivacyOverlay';
import { QuestionBody, QuestionMeta, SaveStatusChip } from '../components/QuestionBody';

const TYPE_LABELS = {
  SINGLE_CHOICE: 'Один вариант',
  MULTIPLE_CHOICE: 'Несколько вариантов',
  OPEN_TEXT: 'Открытый ответ',
  PHOTO: 'Ответ с фото',
};

const STATUS_LABELS = {
  NOT_STARTED: { label: 'Не начат', color: 'gray' },
  IN_PROGRESS: { label: 'В процессе', color: 'blue' },
  AWAITING_REVIEW: { label: 'Ожидает проверки', color: 'gold' },
  OPEN_FOR_VIEWING: { label: 'Результат доступен', color: 'green' },
  UNAVAILABLE: { label: 'Недоступен', color: 'gray' },
};

const CONNECTION_ISSUE_THROTTLE_MS = 60_000;
const SAVE_RETRY_DELAY_MS = 5_000;

function buildInitial(attempt) {
  const map = {};
  for (const q of attempt.questions) {
    map[q.id] = { selectedOptionIds: [], openTextAnswer: '', photos: [] };
  }
  for (const a of attempt.answers || []) {
    map[a.questionId] = {
      selectedOptionIds: a.selectedOptionIds ?? [],
      openTextAnswer: a.openTextAnswer ?? '',
      photos: a.photos ?? [],
    };
  }
  return map;
}

function serialize(a) {
  return JSON.stringify({
    s: [...(a.selectedOptionIds || [])].sort((x, y) => x - y),
    t: a.openTextAnswer || '',
    p: [...(a.photos || []).map((photo) => photo.id)].sort((x, y) => x - y),
  });
}

function isQuestionAnswered(a) {
  if (!a) return false;
  if ((a.photos || []).length > 0) return true;
  if ((a.selectedOptionIds || []).length > 0) return true;
  if ((a.openTextAnswer || '').trim().length > 0) return true;
  return false;
}

function pluralRu(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function isRateLimitError(err) {
  return typeof err?.message === 'string' && err.message.includes('Слишком много попыток');
}

// ─── Code entry ───────────────────────────────────────────────────────────────
export function EntranceCodeScreen({ onBack, onVerified }) {
  const { c } = useTheme();
  const { toast } = useAppState();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (input.trim().length < 4) {
      setError('Введите персональный код');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await admissionsApi.verifyCode(input.trim().toUpperCase());
      toast?.('Код принят');
      onVerified?.(data);
    } catch (e) {
      const msg = isRateLimitError(e)
        ? 'Слишком много попыток. Подождите и попробуйте снова.'
        : e.message || 'Неверный или неактивный код';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Вступительный тест" back={onBack} large sub="Введите персональный код, который выдал администратор школы" />
      <View style={{ paddingHorizontal: 20 }}>
        <GradCard colors={GRAD.blue} padding={20} radius={20} style={{ marginBottom: 20 }}>
          <HexBadge size={48} fill="rgba(255,255,255,0.2)" icon="qr" iconColor="#fff" iconSize={22} />
          <Txt style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 12 }}>Код поступающего</Txt>
          <Txt style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4, lineHeight: 19 }}>
            Один код — для прохождения теста и просмотра результата
          </Txt>
        </GradCard>

        <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink2, marginBottom: 8 }}>Персональный код</Txt>
        <TextInput
          value={input}
          onChangeText={(t) => {
            setError(null);
            setInput(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12));
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Например G9CZPDGD"
          placeholderTextColor={c.ink3}
          style={{
            height: 56,
            borderWidth: 1.5,
            borderColor: error ? c.red : c.border,
            borderRadius: 16,
            paddingHorizontal: 18,
            fontSize: 20,
            fontWeight: '700',
            letterSpacing: 3,
            color: c.ink,
            backgroundColor: c.surface,
          }}
        />
        {error ? <Txt style={{ color: c.red, fontSize: 13, marginTop: 8 }}>{error}</Txt> : null}

        <PrimaryButton color="green" style={{ marginTop: 24 }} onPress={submit} disabled={loading}>
          {loading ? 'Проверяем…' : 'Продолжить'}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ─── Confirm identity ─────────────────────────────────────────────────────────
export function EntranceConfirmScreen({ applicant, onConfirm, onBack, loading }) {
  const { c } = useTheme();
  const [mismatch, setMismatch] = useState(false);

  return (
    <Screen>
      <ScreenHeader title="Проверьте данные" back={onBack} large sub="Убедитесь, что это ваши данные" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card style={{ padding: 18 }}>
          <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>ПОСТУПАЮЩИЙ</Txt>
          <Txt style={{ fontSize: 22, fontWeight: '800', marginTop: 6 }}>{applicant.fullName}</Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 4 }}>Класс поступления: {applicant.grade}</Txt>
          {applicant.parentFullName ? (
            <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 2 }}>Родитель: {applicant.parentFullName}</Txt>
          ) : null}
        </Card>

        {mismatch ? (
          <Card style={{ padding: 16, backgroundColor: c.goldSoft, borderColor: c.gold }}>
            <Txt style={{ fontSize: 14, color: c.goldDeep, lineHeight: 20 }}>
              Обратитесь к сотруднику школы.
            </Txt>
          </Card>
        ) : null}

        {!mismatch ? (
          <PrimaryButton color="green" onPress={onConfirm} disabled={loading}>
            {loading ? 'Загрузка…' : 'Это я'}
          </PrimaryButton>
        ) : null}
        {!mismatch ? (
          <PrimaryButton color="ghost" onPress={() => setMismatch(true)} disabled={loading}>
            Данные неверные
          </PrimaryButton>
        ) : (
          <PrimaryButton color="ghost" onPress={onBack} disabled={loading}>
            Ввести другой код
          </PrimaryButton>
        )}
      </View>
    </Screen>
  );
}

// ─── Assignments list ─────────────────────────────────────────────────────────
export function EntranceAssignmentsScreen({
  applicant,
  assignments,
  onRefresh,
  onStart,
  onContinue,
  onViewResult,
  onExit,
}) {
  const { c } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const handleContinue = async (item) => {
    setBusyId(item.assignmentId);
    try {
      await onContinue?.(item);
    } finally {
      setBusyId(null);
    }
  };

  const handleViewResult = async (item) => {
    setBusyId(item.assignmentId);
    try {
      await onViewResult?.(item);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Назначенные тесты" back={onExit} large sub={`${applicant.fullName} · ${applicant.grade}`} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.green} />}
      >
        {assignments.length === 0 ? (
          <Card style={{ padding: 20, alignItems: 'center' }}>
            <Txt style={{ fontSize: 15, fontWeight: '700', textAlign: 'center' }}>Нет назначенных тестов</Txt>
            <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8, textAlign: 'center', lineHeight: 21 }}>
              Если вы ожидали тест — обратитесь к сотруднику школы.
            </Txt>
          </Card>
        ) : (
          assignments.map((item) => {
            const meta = STATUS_LABELS[item.status] || STATUS_LABELS.UNAVAILABLE;
            return (
              <Card key={item.assignmentId} style={{ padding: 16, marginBottom: 12 }}>
                <Txt style={{ fontSize: 17, fontWeight: '700' }}>{item.testTitle}</Txt>
                <Txt style={{ fontSize: 13, color: c.ink2, marginTop: 4 }}>{item.subject}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  <Pill color="blue">{item.durationMinutes} мин</Pill>
                  <Pill color={meta.color}>{meta.label}</Pill>
                </View>
                <View style={{ marginTop: 14 }}>
                  {item.availableAction === 'START' && (
                    <PrimaryButton color="green" onPress={() => onStart?.(item)}>
                      Начать
                    </PrimaryButton>
                  )}
                  {item.availableAction === 'CONTINUE' && (
                    <PrimaryButton
                      color="green"
                      disabled={busyId === item.assignmentId}
                      onPress={() => handleContinue(item)}
                    >
                      {busyId === item.assignmentId ? 'Открываем…' : 'Продолжить'}
                    </PrimaryButton>
                  )}
                  {item.availableAction === 'VIEW_RESULT' && (
                    <PrimaryButton
                      color="blue"
                      disabled={busyId === item.assignmentId}
                      onPress={() => handleViewResult(item)}
                    >
                      Посмотреть результат
                    </PrimaryButton>
                  )}
                  {item.availableAction === 'NONE' && (
                    <PrimaryButton color="ghost" disabled>
                      Недоступно
                    </PrimaryButton>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

// ─── Instruction before start ─────────────────────────────────────────────────
export function EntranceInstructionScreen({ item, onBegin, onBack, loading }) {
  const { c } = useTheme();

  return (
    <Screen>
      <ScreenHeader title="Инструкция" back={onBack} large sub="Прочитайте правила перед началом" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card style={{ padding: 18 }}>
          <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>ТЕСТ</Txt>
          <Txt style={{ fontSize: 20, fontWeight: '700', marginTop: 6 }}>{item.testTitle}</Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 4 }}>{item.subject}</Txt>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            <Pill color="blue">{item.durationMinutes} мин</Pill>
          </View>
        </Card>

        <Card style={{ padding: 18 }}>
          <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>ПРАВИЛА</Txt>
          <Txt style={{ fontSize: 15, lineHeight: 22, marginTop: 8, color: c.ink2 }}>
            {item.rules ||
              '• Не сворачивайте приложение во время теста\n• Скриншоты фиксируются системой\n• Результат будет доступен после проверки школой'}
          </Txt>
        </Card>

        <PrimaryButton color="green" disabled={loading} onPress={onBegin} style={{ marginTop: 8 }}>
          {loading ? 'Запуск…' : 'Начать тест'}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ─── Test in progress ─────────────────────────────────────────────────────────
export function EntranceTestScreen({ attempt, onFinished }) {
  const { c } = useTheme();
  const { toast } = useAppState();
  const attemptId = attempt.attemptId;
  const questions = attempt.questions || [];
  const allowBack = attempt.allowBackNavigation;

  const warnThreshold = attempt.durationMinutes >= 10 ? 600 : 60;
  const warnLabel = attempt.durationMinutes >= 10 ? '10 минут' : '1 минуту';

  const [answers, setAnswers] = useState(() => buildInitial(attempt));
  const [saveStatus, setSaveStatus] = useState({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(attempt.remainingSeconds);
  const [submitting, setSubmitting] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const saveTimers = useRef({});
  const retryTimers = useRef({});
  const savedRef = useRef({});
  const expiredRef = useRef(false);
  const submittingRef = useRef(false);
  const timeWarnShownRef = useRef(false);
  const lastConnectionIssueRef = useRef(0);
  const saveQuestionRef = useRef(async () => {});
  const flushAllRef = useRef(async () => {});

  useEffect(() => {
    const seed = {};
    for (const a of attempt.answers || []) {
      seed[a.questionId] = serialize({
        selectedOptionIds: a.selectedOptionIds ?? [],
        openTextAnswer: a.openTextAnswer ?? '',
        photos: a.photos ?? [],
      });
    }
    savedRef.current = seed;
  }, [attempt.attemptId]);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach((t) => clearTimeout(t));
      Object.values(retryTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const logConnectionIssue = useCallback(
    (detail = 'autosave failed') => {
      const now = Date.now();
      if (now - lastConnectionIssueRef.current < CONNECTION_ISSUE_THROTTLE_MS) return;
      lastConnectionIssueRef.current = now;
      void admissionsApi.logEvent(attemptId, 'connection_issue', detail);
    },
    [attemptId],
  );

  const cancelSaveRetry = useCallback((questionId) => {
    clearTimeout(retryTimers.current[questionId]);
  }, []);

  const saveQuestion = useCallback(
    async (questionId) => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;
      const answer = answersRef.current[questionId] ?? {
        selectedOptionIds: [],
        openTextAnswer: '',
        photos: [],
      };
      const fingerprint = serialize(answer);
      if (savedRef.current[questionId] === fingerprint) {
        setSaveStatus((prev) => ({ ...prev, [questionId]: 'saved' }));
        cancelSaveRetry(questionId);
        return;
      }
      setSaveStatus((prev) => ({ ...prev, [questionId]: 'saving' }));
      try {
        const res = await admissionsApi.saveAnswer(attemptId, {
          questionId,
          selectedOptionIds: question.type === 'OPEN_TEXT' ? undefined : answer.selectedOptionIds,
          openTextAnswer: question.type === 'OPEN_TEXT' ? answer.openTextAnswer : undefined,
        });
        savedRef.current[questionId] = fingerprint;
        setSaveStatus((prev) => ({ ...prev, [questionId]: 'saved' }));
        cancelSaveRetry(questionId);
        setRemaining(res.remainingSeconds);
      } catch {
        setSaveStatus((prev) => ({ ...prev, [questionId]: 'error' }));
        logConnectionIssue();
        cancelSaveRetry(questionId);
        retryTimers.current[questionId] = setTimeout(() => {
          void saveQuestionRef.current(questionId);
        }, SAVE_RETRY_DELAY_MS);
      }
    },
    [attemptId, questions, logConnectionIssue, cancelSaveRetry],
  );

  saveQuestionRef.current = saveQuestion;

  const flushAll = async () => {
    Object.values(saveTimers.current).forEach((t) => clearTimeout(t));
    await Promise.all(Object.keys(answersRef.current).map((k) => saveQuestion(Number(k))));
  };

  flushAllRef.current = flushAll;

  const finishByTimeout = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    await flushAllRef.current();
    await admissionsApi.logEvent(attemptId, 'time_expired', 'client timer reached zero');
    try {
      await admissionsApi.submitAttempt(attemptId);
    } catch {
      /* backend may auto-finish */
    }
    toast?.('Время вышло. Тест отправлен на проверку.');
    onFinished?.();
  }, [attemptId, onFinished, toast]);

  const onLogEvent = useCallback(
    (type, details, keepalive = false) => admissionsApi.logEvent(attemptId, type, details, keepalive),
    [attemptId],
  );

  useAnticheat({
    enabled: !submitting,
    attemptId,
    onLogEvent,
    onPrivacy: setPrivacy,
  });

  const handleLowTime = useCallback(
    (low) => {
      if (low && !timeWarnShownRef.current) {
        timeWarnShownRef.current = true;
        setShowTimeWarning(true);
        Alert.alert(
          'Мало времени',
          `До конца теста осталось ${warnLabel}. Проверьте ответы и завершите тест вовремя.`,
        );
      }
    },
    [warnLabel],
  );

  const scheduleSave = (questionId) => {
    cancelSaveRetry(questionId);
    clearTimeout(saveTimers.current[questionId]);
    saveTimers.current[questionId] = setTimeout(() => void saveQuestion(questionId), 700);
  };

  const updateAnswer = (questionId, next) => {
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    scheduleSave(questionId);
  };

  const setPhotos = (questionId, photos) => {
    const base = answersRef.current[questionId] ?? {
      selectedOptionIds: [],
      openTextAnswer: '',
      photos: [],
    };
    const next = { ...base, photos };
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    setSaveStatus((prev) => ({ ...prev, [questionId]: 'saved' }));
    savedRef.current[questionId] = serialize(next);
  };

  const goTo = async (nextIndex) => {
    const currentId = questions[index].id;
    clearTimeout(saveTimers.current[currentId]);
    await saveQuestion(currentId);
    setIndex(nextIndex);
  };

  const answeredCount = questions.filter((q) => isQuestionAnswered(answers[q.id])).length;
  const unansweredCount = questions.length - answeredCount;

  const confirmFinish = () => {
    const base = `Отвечено на ${answeredCount} из ${questions.length} вопросов.`;
    const warn =
      unansweredCount > 0
        ? `\n\nВнимание: ${unansweredCount} ${pluralRu(unansweredCount, ['вопрос', 'вопроса', 'вопросов'])} без ответа.`
        : '';
    Alert.alert('Завершить тест?', `${base}${warn}\n\nПосле отправки изменить ответы будет нельзя.`, [
      { text: 'Продолжить', style: 'cancel' },
      { text: 'Завершить', style: 'destructive', onPress: handleFinish },
    ]);
  };

  const handleFinish = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    await flushAll();
    try {
      await admissionsApi.submitAttempt(attemptId);
      onFinished?.();
    } catch (e) {
      toast?.(e.message || 'Не удалось завершить тест');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const question = questions[index];
  const answer = answers[question?.id] ?? { selectedOptionIds: [], openTextAnswer: '', photos: [] };
  const currentSaveStatus = saveStatus[question?.id] ?? 'idle';
  const isLast = index === questions.length - 1;

  if (!question) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.green} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <PrivacyOverlay visible={privacy} />
      <View style={{ flex: 1 }}>
        <ScreenHeader title={`${attempt.testTitle}`} sub={`Вопрос ${index + 1} / ${questions.length} · отвечено ${answeredCount}`} />
        <Txt style={{ fontSize: 13, color: c.ink2, textAlign: 'center', marginBottom: 4 }}>
          {TYPE_LABELS[question.type] || question.type}
        </Txt>

        {showTimeWarning ? (
          <View style={{ marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: c.redSoft }}>
            <Txt style={{ fontSize: 13, color: c.red, fontWeight: '600' }}>
              До конца теста осталось {warnLabel}
            </Txt>
          </View>
        ) : null}

        <TestTimer
          remainingSeconds={remaining}
          durationMinutes={attempt.durationMinutes}
          onExpire={finishByTimeout}
          onLowTime={handleLowTime}
        />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          <Card style={{ padding: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <QuestionMeta question={question} />
              <SaveStatusChip
                status={currentSaveStatus}
                onRetry={currentSaveStatus === 'error' ? () => void saveQuestion(question.id) : undefined}
              />
            </View>
            <Txt style={{ fontSize: 18, fontWeight: '700', lineHeight: 26, marginBottom: 16 }}>{question.text}</Txt>
            <QuestionBody
              question={question}
              value={answer}
              onChange={(next) => updateAnswer(question.id, next)}
              onPhotosChange={(photos) => setPhotos(question.id, photos)}
              photoProps={{
                attemptId,
                questionId: question.id,
                maxPhotos: question.maxPhotos ?? 1,
                disabled: submitting,
                onUploadFailed: () => logConnectionIssue('photo upload failed'),
              }}
            />
          </Card>

          {allowBack ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {questions.map((q, i) => {
                const done = isQuestionAnswered(answers[q.id]);
                return (
                  <PrimaryButton
                    key={q.id}
                    color={i === index ? 'green' : done ? 'blue' : 'ghost'}
                    full={false}
                    style={{ minWidth: 40, paddingHorizontal: 12 }}
                    disabled={submitting}
                    onPress={() => goTo(i)}
                  >
                    {String(i + 1)}
                  </PrimaryButton>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, flexDirection: 'row', gap: 10 }}>
          {allowBack && index > 0 ? (
            <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} disabled={submitting} onPress={() => goTo(index - 1)}>
              Назад
            </PrimaryButton>
          ) : null}
          {!isLast ? (
            <PrimaryButton color="green" style={{ flex: 2 }} disabled={submitting} onPress={() => goTo(index + 1)}>
              Далее
            </PrimaryButton>
          ) : (
            <PrimaryButton color="green" style={{ flex: 2 }} disabled={submitting} onPress={confirmFinish}>
              {submitting ? 'Отправка…' : 'Завершить'}
            </PrimaryButton>
          )}
        </View>
      </View>
    </Screen>
  );
}

// ─── Done (no scores) ─────────────────────────────────────────────────────────
export function EntranceDoneScreen({ testTitle, onBackToList, onExit }) {
  const { c } = useTheme();

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>
        <HexBadge size={88} fill={c.green} icon="check" iconColor="#fff" iconSize={40} />
        <Txt style={{ fontSize: 28, fontWeight: '800', marginTop: 24, textAlign: 'center' }}>Тест завершён</Txt>
        <Txt style={{ fontSize: 16, color: c.ink2, marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
          {testTitle ? `${testTitle}\n\n` : ''}
          Результат будет доступен после проверки школой.
        </Txt>
        <View style={{ width: '100%', marginTop: 28, gap: 10 }}>
          <PrimaryButton color="blue" onPress={onBackToList}>К списку тестов</PrimaryButton>
          <PrimaryButton color="ghost" onPress={onExit}>Выйти</PrimaryButton>
        </View>
      </View>
    </Screen>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────
export function EntranceResultScreen({ result, onBack, onExit }) {
  const { c } = useTheme();

  const topics = useMemo(() => {
    if (!result?.topicBreakdown) return [];
    return Object.entries(result.topicBreakdown).map(([name, data]) => ({ name, ...data }));
  }, [result]);

  return (
    <Screen>
      <ScreenHeader title="Результат" back={onBack} large sub="Доступен после проверки школой" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <GradCard colors={result.passed ? GRAD.green : GRAD.red} padding={22} radius={20}>
          <Txt style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Итоговый балл</Txt>
          <Txt style={{ color: '#fff', fontSize: 40, fontWeight: '800', marginTop: 4 }}>
            {result.totalScore}
            <Txt style={{ fontSize: 18, fontWeight: '600' }}> ({Math.round(result.percent || 0)}%)</Txt>
          </Txt>
          <Txt style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>
            Порог: {result.minScore} · {result.passed ? 'Рекомендовано' : 'Ниже порога'}
          </Txt>
        </GradCard>

        {result.schoolComment ? (
          <Card style={{ padding: 16 }}>
            <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>КОММЕНТАРИЙ ШКОЛЫ</Txt>
            <Txt style={{ fontSize: 15, lineHeight: 22, marginTop: 8 }}>{result.schoolComment}</Txt>
          </Card>
        ) : null}

        {topics.length > 0 ? (
          <Card style={{ padding: 16 }}>
            <Txt style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>По темам</Txt>
            {topics.map((t) => (
              <View key={t.name} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Txt style={{ fontWeight: '600' }}>{t.name}</Txt>
                  <Txt style={{ color: c.ink2 }}>{t.earned}/{t.max}</Txt>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        <PrimaryButton color="ghost" onPress={onExit}>Выйти</PrimaryButton>
      </View>
    </Screen>
  );
}
