import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, shadowLg } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { HexBadge } from '@shared/components/Hex';
import { Card, PrimaryButton, ScreenHeader, Pill, FiztexWordmark, LogoWatermark } from '@shared/components/ui';
import { Grad, GradCard, GRAD } from '@shared/components/Grad';

// Card-header gradient from the design ref (navy → lighter navy, top-to-bottom).
const CARD_HEADER = ['#274185', '#3B5998'];
const CARD_HEADER_MUTED = ['#4B5563', '#6B7280']; // "awaiting review" variant
import { useTheme } from '@shared/theme/ThemeContext';
import { useAppState } from '@shared/state/AppState';
import { useEntrance } from '../context/EntranceContext';
import { useAnticheat } from '../hooks/useAnticheat';
import { TestTimer } from '../components/TestTimer';
import { PrivacyOverlay } from '../components/PrivacyOverlay';
import { QuestionBody } from '../components/QuestionBody';

const TYPE_LABELS = {
  SINGLE_CHOICE: 'Один вариант',
  MULTIPLE_CHOICE: 'Несколько вариантов',
  OPEN_TEXT: 'Открытый ответ',
  PHOTO: 'Ответ с фото',
};

const STATUS_LABEL = {
  NOT_STARTED: 'Не начат',
  IN_PROGRESS: 'В процессе',
  AWAITING_REVIEW: 'На проверке',
  OPEN_FOR_VIEWING: 'Результат готов',
  UNAVAILABLE: 'Недоступно',
};

// In the re-themed palette the `green` token is the brand orange — used for the
// active status pills to match the design ref's orange tint.
const STATUS_COLOR = {
  NOT_STARTED: 'gray',
  IN_PROGRESS: 'green',
  AWAITING_REVIEW: 'green',
  OPEN_FOR_VIEWING: 'green',
  UNAVAILABLE: 'gray',
};

// Literal success green for the "view results" affordance (per the design ref).
const OK_GREEN = { soft: '#D1FAE5', deep: '#059669' };

const ACTION_LABEL = {
  START: 'Начать',
  CONTINUE: 'Продолжить',
  VIEW_RESULT: 'Результат',
};

// ─── Code entry — branded navy hero + white card, matches the fiztex-web palette ──
export function EntranceCodeScreen({ onBack, onSuccess }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { toast } = useAppState();
  const { verifyCode, loading, error, setError } = useEntrance();
  const [input, setInput] = useState('');

  const submit = async () => {
    if (input.trim().length < 4) {
      setError('Введите персональный код');
      return;
    }
    try {
      await verifyCode(input);
      toast?.('Код принят');
      onSuccess?.();
    } catch {
      /* error surfaced from context */
    }
  };

  return (
    <Grad colors={GRAD.blue} vertical style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {onBack ? (
            <Pressable onPress={onBack} style={{ position: 'absolute', top: insets.top + 8, left: 8, padding: 8, zIndex: 1 }}>
              <Icon name="chevronLeft" size={22} color="#fff" />
            </Pressable>
          ) : null}

          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <FiztexWordmark size={36} color="#fff" />
          </View>

          <Txt style={{ marginTop: 24, fontSize: 25, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
            Вступительный тест
          </Txt>

          <Card style={{ marginTop: 28, padding: 22, borderWidth: 0, ...shadowLg }}>
            <Txt style={{ fontSize: 13, fontWeight: '700', color: c.ink2 }}>Персональный код</Txt>
            <TextInput
              value={input}
              onChangeText={(t) => {
                setError(null);
                setInput(t.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 14));
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Например PT-4E82"
              placeholderTextColor={c.ink3}
              style={{
                marginTop: 10,
                height: 56,
                borderWidth: 1.5,
                borderColor: error ? c.red : c.border,
                borderRadius: 14,
                paddingHorizontal: 16,
                fontSize: 18,
                fontWeight: '700',
                letterSpacing: 2,
                color: c.ink,
                backgroundColor: c.surface2,
              }}
            />
            {error ? <Txt style={{ color: c.red, fontSize: 13, marginTop: 8 }}>{error}</Txt> : null}

            <PrimaryButton color="green" style={{ marginTop: 20 }} onPress={submit} disabled={loading}>
              {loading ? 'Проверяем…' : 'Войти в систему'}
            </PrimaryButton>

            <Pressable
              onPress={() =>
                Alert.alert(
                  'Не получается войти?',
                  'Обратитесь к сотруднику школы — он выдал ваш персональный код и поможет его активировать.'
                )
              }
              style={{ marginTop: 16, alignItems: 'center' }}
            >
              <Txt style={{ color: c.blue, fontWeight: '600', fontSize: 14 }}>Не получается войти?</Txt>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Grad>
  );
}

// ─── Confirm identity ──────────────────────────────────────────────────────────
export function EntranceConfirmScreen({ onBack, onConfirmed }) {
  const { c } = useTheme();
  const { applicant, loadAssignments, loading, error } = useEntrance();

  const handleConfirm = async () => {
    try {
      await loadAssignments();
      onConfirmed?.();
    } catch {
      /* error in context */
    }
  };

  if (!applicant) {
    return (
      <Screen>
        <ScreenHeader title="Подтверждение" back={onBack} />
        <View style={{ padding: 20 }}>
          <Txt style={{ color: c.ink2 }}>Сессия не найдена. Вернитесь и введите код снова.</Txt>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Это вы?" back={onBack} large sub="Проверьте данные перед началом" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card style={{ padding: 18 }}>
          <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>ПОСТУПАЮЩИЙ</Txt>
          <Txt style={{ fontSize: 22, fontWeight: '800', marginTop: 6 }}>{applicant.fullName}</Txt>
          {applicant.grade ? (
            <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 4 }}>Класс поступления: {applicant.grade}</Txt>
          ) : null}
          {applicant.parentFullName ? (
            <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 2 }}>Родитель: {applicant.parentFullName}</Txt>
          ) : null}
        </Card>

        {error ? <Txt style={{ color: c.red, fontSize: 13 }}>{error}</Txt> : null}

        <PrimaryButton color="green" disabled={loading} onPress={handleConfirm} style={{ marginTop: 8 }}>
          {loading ? 'Загрузка…' : 'Это я, продолжить'}
        </PrimaryButton>
        <PrimaryButton color="ghost" onPress={onBack}>
          Данные неверные
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// Coloured action button matching the design ref (per availableAction).
function CardAction({ assignment, onStart, onContinue, onResult }) {
  const { c } = useTheme();
  const a = assignment;

  const press = () => {
    if (a.availableAction === 'START') onStart?.(a);
    else if (a.availableAction === 'CONTINUE') onContinue?.(a);
    else if (a.availableAction === 'VIEW_RESULT') onResult?.(a);
  };

  const base = {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  };

  // No action available (e.g. awaiting review) → disabled placeholder.
  if (!a.availableAction || a.availableAction === 'NONE') {
    return (
      <View style={[base, { backgroundColor: c.bg2 }]}>
        <Txt style={{ fontSize: 14, fontWeight: '700', color: c.ink3 }}>Результат будет позже</Txt>
      </View>
    );
  }

  const styleByAction = {
    START: { bg: c.green, fg: '#fff' },
    CONTINUE: { bg: c.blue, fg: '#fff' },
    VIEW_RESULT: { bg: OK_GREEN.soft, fg: OK_GREEN.deep },
  }[a.availableAction];

  return (
    <Pressable onPress={press} style={({ pressed }) => [base, { backgroundColor: styleByAction.bg, opacity: pressed ? 0.9 : 1 }]}>
      <Txt style={{ fontSize: 14, fontWeight: '700', color: styleByAction.fg }}>
        {a.availableAction === 'VIEW_RESULT' ? 'Посмотреть результаты' : ACTION_LABEL[a.availableAction]}
      </Txt>
    </Pressable>
  );
}

// A single test card: gradient illustration-header with faded logo watermark, then meta + action.
function TestCard({ assignment, onStart, onContinue, onResult }) {
  const { c } = useTheme();
  const a = assignment;
  const muted = a.status === 'AWAITING_REVIEW' || a.status === 'UNAVAILABLE';
  const statusColor = STATUS_COLOR[a.status] || 'gray';

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
      <View style={{ height: 72, overflow: 'hidden' }}>
        <Grad colors={muted ? CARD_HEADER_MUTED : CARD_HEADER} vertical style={{ flex: 1 }}>
          <LogoWatermark />
        </Grad>
      </View>

      <View style={{ padding: 16 }}>
        <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>{a.testTitle}</Txt>
        {a.grade ? <Txt style={{ fontSize: 13, color: c.ink2, marginTop: 2 }}>{a.grade}</Txt> : null}
        <Txt style={{ fontSize: 12, color: c.ink3, marginTop: 2 }}>
          {[a.subject, `${a.durationMinutes} мин`].filter(Boolean).join(' · ')}
        </Txt>

        <View style={{ marginTop: 12 }}>
          <Pill color={statusColor} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>
            {STATUS_LABEL[a.status] || a.status}
          </Pill>
        </View>

        <CardAction assignment={a} onStart={onStart} onContinue={onContinue} onResult={onResult} />
      </View>
    </View>
  );
}

// ─── Assignments list ──────────────────────────────────────────────────────────
export function EntranceAssignmentsScreen({ onStart, onContinue, onResult, onExit }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { applicant, assignments, loadAssignments, loading, error } = useEntrance();

  useEffect(() => {
    loadAssignments().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Top app bar — branded wordmark on a floating white card. */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 4 }}>
        <View
          style={{
            height: 56,
            backgroundColor: c.surface,
            borderRadius: 16,
            ...shadowLg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
          }}
        >
          <FiztexWordmark size={24} />
          {onExit ? (
            <Pressable onPress={onExit} style={{ position: 'absolute', right: 12, padding: 8 }}>
              <Icon name="x" size={18} color={c.ink3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 2 }}>
          <Txt style={{ fontSize: 24, fontWeight: '800', color: c.ink }}>Мои тесты</Txt>
          {applicant?.fullName ? (
            <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 4 }}>{applicant.fullName}</Txt>
          ) : null}
        </View>

        {loading && !assignments.length ? <ActivityIndicator color={c.green} /> : null}
        {error && !assignments.length ? <Txt style={{ color: c.red }}>{error}</Txt> : null}

        {assignments.map((a) => (
          <TestCard key={a.assignmentId} assignment={a} onStart={onStart} onContinue={onContinue} onResult={onResult} />
        ))}

        {!loading && assignments.length === 0 ? (
          <Card style={{ padding: 20, alignItems: 'center' }}>
            <Txt style={{ color: c.ink2, textAlign: 'center' }}>Пока нет назначенных тестов</Txt>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Instruction before starting an attempt ────────────────────────────────────
export function EntranceInstructionScreen({ assignment, onBack, onStart }) {
  const { c } = useTheme();
  const { startAttempt, loading, error } = useEntrance();
  const [confirmed, setConfirmed] = useState(false);

  const handleStart = async () => {
    if (!confirmed || !assignment) return;
    try {
      const attempt = await startAttempt(assignment.assignmentId);
      onStart?.(attempt);
    } catch {
      /* error in context */
    }
  };

  if (!assignment) {
    return (
      <Screen>
        <ScreenHeader title="Инструкция" back={onBack} />
        <View style={{ padding: 20 }}>
          <Txt style={{ color: c.ink2 }}>Тест не выбран.</Txt>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={assignment.testTitle} back={onBack} large sub={assignment.subject} />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pill color="blue">{assignment.durationMinutes} мин</Pill>
            {assignment.maxAttempts ? <Pill color="gray">Попыток: {assignment.maxAttempts}</Pill> : null}
            <Pill color={assignment.allowBackNavigation ? 'green' : 'gold'}>
              {assignment.allowBackNavigation ? 'Можно возвращаться к вопросам' : 'Без возврата к вопросам'}
            </Pill>
          </View>
        </Card>

        <Card style={{ padding: 18 }}>
          <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>ПРАВИЛА</Txt>
          <Txt style={{ fontSize: 15, lineHeight: 22, marginTop: 8, color: c.ink2 }}>
            {assignment.rules ||
              'Не сворачивайте приложение во время теста. Переключения фиксируются системой. Результат появится после проверки школой.'}
          </Txt>
        </Card>

        <Card
          onPress={() => setConfirmed((v) => !v)}
          style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: confirmed ? c.green : c.borderStrong,
              backgroundColor: confirmed ? c.green : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {confirmed ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
          </View>
          <Txt style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>Готов(а) начать тест на условиях выше</Txt>
        </Card>

        {error ? <Txt style={{ color: c.red, fontSize: 13 }}>{error}</Txt> : null}

        <PrimaryButton color="green" disabled={!confirmed || loading} onPress={handleStart} style={{ marginTop: 8 }}>
          {loading ? 'Запуск…' : 'Начать тестирование'}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

function SaveStatusChip({ status }) {
  const { c } = useTheme();
  if (!status || status === 'idle') return null;
  const map = {
    saving: { label: 'Сохранение…', color: c.ink2 },
    saved: { label: 'Сохранено', color: c.green },
    error: { label: 'Ошибка сохранения', color: c.red },
  };
  const s = map[status] || map.saving;
  return <Txt style={{ fontSize: 12, color: s.color, fontWeight: '600' }}>{s.label}</Txt>;
}

// ─── Test in progress ─────────────────────────────────────────────────────────
export function EntranceTestScreen({ onDone }) {
  const { c } = useTheme();
  const { toast } = useAppState();
  const { attempt, answers, saveAnswer, flushAnswer, logSuspicious, submitAttempt, loading } = useEntrance();
  const [index, setIndex] = useState(0);
  const [privacy, setPrivacy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle');

  const questions = attempt?.questions || [];
  const question = questions[index];
  const allowBack = attempt?.allowBackNavigation !== false;
  const total = questions.length;

  useEffect(() => {
    if (question) setDraft(answers[question.id] || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  const onAnticheat = useCallback((type, details) => logSuspicious(type, details), [logSuspicious]);

  useAnticheat({
    enabled: !!attempt && !finishing,
    onEvent: onAnticheat,
    onPrivacy: setPrivacy,
  });

  const persist = async (payload) => {
    if (!question) return;
    setSaveStatus('saving');
    try {
      await saveAnswer(question.id, payload);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const handleChange = (payload) => {
    setDraft((prev) => ({ ...prev, ...payload }));
    persist(payload);
  };

  const goNext = async () => {
    if (!question) return;
    try {
      await flushAnswer(question.id);
    } catch {
      toast?.('Не удалось сохранить ответ');
    }
    if (index < total - 1) setIndex((i) => i + 1);
    else confirmFinish();
  };

  const goBack = async () => {
    if (!question || !allowBack || index === 0) return;
    try {
      await flushAnswer(question.id);
    } catch {
      /* continue */
    }
    setIndex((i) => i - 1);
  };

  const confirmFinish = () => {
    Alert.alert(
      'Завершить тест?',
      'После отправки изменить ответы будет нельзя. Результат появится после проверки школой.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Отправить', style: 'destructive', onPress: handleFinish },
      ]
    );
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      logSuspicious('submitted', 'Attempt submitted');
      await submitAttempt();
      toast?.('Тест отправлен');
      onDone?.();
    } catch {
      setFinishing(false);
    }
  };

  const handleExpire = () => {
    logSuspicious('time_expired', 'Timer reached zero');
    Alert.alert('Время вышло', 'Тест будет автоматически отправлен.', [{ text: 'OK', onPress: handleFinish }]);
  };

  if (!attempt || !question) {
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
        <ScreenHeader title={`Вопрос ${index + 1} / ${total}`} right={<SaveStatusChip status={saveStatus} />} />
        <Txt style={{ fontSize: 13, color: c.ink2, textAlign: 'center', marginBottom: 4 }}>
          {TYPE_LABELS[question.type] || question.type}
        </Txt>
        <TestTimer
          remainingSeconds={attempt.remainingSeconds}
          totalSeconds={(attempt.durationMinutes || 45) * 60}
          onExpire={handleExpire}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <Card style={{ padding: 18 }}>
            <Txt style={{ fontSize: 18, fontWeight: '700', lineHeight: 26, marginBottom: 16 }}>{question.text}</Txt>
            <QuestionBody question={question} value={draft} onChange={handleChange} />
          </Card>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, flexDirection: 'row', gap: 10 }}>
          {allowBack && index > 0 ? (
            <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onPress={goBack}>
              Назад
            </PrimaryButton>
          ) : null}
          <PrimaryButton color="green" style={{ flex: 2 }} disabled={loading || finishing} onPress={goNext}>
            {index === total - 1 ? (finishing ? 'Отправка…' : 'Завершить') : 'Далее'}
          </PrimaryButton>
        </View>
      </View>
    </Screen>
  );
}

// ─── Finished (sent for review, no score yet) ─────────────────────────────────
export function EntranceFinishedScreen({ onAssignments, onHome }) {
  const { c } = useTheme();
  const { applicant } = useEntrance();

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>
        <HexBadge size={88} fill={c.green} icon="check" iconColor="#fff" iconSize={40} />
        <Txt style={{ fontSize: 28, fontWeight: '800', marginTop: 24, textAlign: 'center' }}>Тест отправлен</Txt>
        <Txt style={{ fontSize: 16, color: c.ink2, marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
          Ответы переданы на проверку в школу.{'\n'}
          {applicant?.fullName ? `${applicant.fullName}, р` : 'Р'}езультат появится после проверки администратором.
        </Txt>
        <View style={{ width: '100%', marginTop: 28, gap: 10 }}>
          <PrimaryButton color="blue" onPress={onAssignments}>
            К списку тестов
          </PrimaryButton>
          <PrimaryButton color="ghost" onPress={onHome}>
            На главную
          </PrimaryButton>
        </View>
      </View>
    </Screen>
  );
}

// ─── Result view (per assignment) ─────────────────────────────────────────────
export function EntranceResultScreen({ assignment, onBack }) {
  const { c } = useTheme();
  const { fetchResult, result, loading, error } = useEntrance();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (assignment?.assignmentId) {
      setChecked(true);
      fetchResult(assignment.assignmentId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?.assignmentId]);

  const topics = useMemo(() => {
    if (!result?.topicBreakdown) return [];
    return Object.entries(result.topicBreakdown).map(([name, data]) => ({ name, ...data }));
  }, [result]);

  return (
    <Screen>
      <ScreenHeader title="Результат" back={onBack} large sub={assignment?.testTitle} />
      <View style={{ paddingHorizontal: 20 }}>
        {!checked || (loading && !result) ? (
          <ActivityIndicator color={c.green} />
        ) : error && !result ? (
          <Card style={{ padding: 20, alignItems: 'center' }}>
            <HexBadge size={56} fill={c.goldSoft} icon="clock" iconColor={c.goldDeep} iconSize={26} />
            <Txt style={{ fontSize: 17, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>Ещё не открыт</Txt>
            <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8, textAlign: 'center', lineHeight: 21 }}>{error}</Txt>
          </Card>
        ) : result ? (
          <View style={{ gap: 12 }}>
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
                    <View style={{ height: 6, borderRadius: 999, backgroundColor: c.bg2 }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(100, t.percent || 0)}%`,
                          backgroundColor: (t.percent || 0) >= 60 ? c.green : c.red,
                          borderRadius: 999,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {result.weakTopics?.length > 0 ? (
              <Card style={{ padding: 16 }}>
                <Txt style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Слабые темы</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {result.weakTopics.map((t) => (
                    <Pill key={t} color="red">
                      {t}
                    </Pill>
                  ))}
                </View>
              </Card>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
