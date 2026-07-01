import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { HexBadge } from '@shared/components/Hex';
import { Card, PrimaryButton, ScreenHeader, Pill } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';
import { useTheme } from '@shared/theme/ThemeContext';
import { useAppState } from '@shared/state/AppState';
import { useEntrance } from '../context/EntranceContext';
import { useAnticheat } from '../hooks/useAnticheat';
import { TestTimer } from '../components/TestTimer';
import { PrivacyOverlay } from '../components/PrivacyOverlay';
import { QuestionBody, QuestionMeta } from '../components/QuestionBody';

const TYPE_LABELS = {
  SINGLE_CHOICE: 'Один вариант',
  MULTIPLE_CHOICE: 'Несколько вариантов',
  OPEN_TEXT: 'Открытый ответ',
  PHOTO: 'Ответ с фото',
};

// ─── Code entry ───────────────────────────────────────────────────────────────
export function EntranceCodeScreen({ onBack, onSuccess }) {
  const { c } = useTheme();
  const { toast } = useAppState();
  const { authenticate, loading, error, setError } = useEntrance();
  const [input, setInput] = useState('');

  const submit = async () => {
    if (input.trim().length < 4) {
      setError('Введите персональный код');
      return;
    }
    try {
      await authenticate(input);
      toast?.('Код принят');
      onSuccess?.();
    } catch {
      /* error in context */
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
            Один код — для прохождения теста и (позже) просмотра результата родителем
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

// ─── Confirm identity + rules ─────────────────────────────────────────────────
export function EntranceConfirmScreen({ onBack, onStart }) {
  const { c } = useTheme();
  const { toast } = useAppState();
  const { session, startTest, loading, error } = useEntrance();
  const [confirmed, setConfirmed] = useState(false);

  const applicant = session?.applicant;
  const test = session?.test;

  const handleStart = async () => {
    if (!confirmed) return;
    try {
      await startTest();
      toast?.('Тест начат');
      onStart?.();
    } catch {
      /* context */
    }
  };

  if (!session) {
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
      <ScreenHeader title="Перед началом" back={onBack} large sub="Проверьте данные и прочитайте инструкцию" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card style={{ padding: 18 }}>
          <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>ПОСТУПАЮЩИЙ</Txt>
          <Txt style={{ fontSize: 22, fontWeight: '800', marginTop: 6 }}>{applicant?.childFullName}</Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 4 }}>Класс поступления: {applicant?.grade}</Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 2 }}>Родитель: {applicant?.parentFullName}</Txt>
        </Card>

        <Card style={{ padding: 18 }}>
          <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>НАЗНАЧЕННЫЙ ТЕСТ</Txt>
          <Txt style={{ fontSize: 20, fontWeight: '700', marginTop: 6 }}>{test?.title}</Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 4 }}>{test?.subjectName}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <Pill color="blue">{test?.durationMinutes} мин</Pill>
            <Pill color="gold">мин. {test?.minScore} б.</Pill>
            <Pill color="gray">{session.questions?.length || 0} вопр.</Pill>
          </View>
        </Card>

        {test?.rules ? (
          <Card style={{ padding: 18 }}>
            <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>ПРАВИЛА</Txt>
            <Txt style={{ fontSize: 15, lineHeight: 22, marginTop: 8, color: c.ink2 }}>{test.rules}</Txt>
          </Card>
        ) : (
          <Card style={{ padding: 18 }}>
            <Txt style={{ fontSize: 15, lineHeight: 22, color: c.ink2 }}>
              • Не сворачивайте приложение во время теста{'\n'}
              • Скриншоты фиксируются системой{'\n'}
              • Результат будет доступен после проверки школой
            </Txt>
          </Card>
        )}

        <Card onPress={() => setConfirmed((v) => !v)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
          <Txt style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>Подтверждаю, что данные верны, и готов(а) начать тест</Txt>
        </Card>

        {error ? <Txt style={{ color: c.red, fontSize: 13 }}>{error}</Txt> : null}

        <PrimaryButton color="green" disabled={!confirmed || loading} onPress={handleStart} style={{ marginTop: 8 }}>
          {loading ? 'Запуск…' : 'Начать тестирование'}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ─── Test in progress ─────────────────────────────────────────────────────────
export function EntranceTestScreen({ onDone }) {
  const { c } = useTheme();
  const { toast } = useAppState();
  const { session, answers, saveAnswer, logSuspicious, finishTest, loading, startedAt } = useEntrance();
  const [index, setIndex] = useState(0);
  const [privacy, setPrivacy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [draft, setDraft] = useState({});

  const questions = session?.questions || [];
  const question = questions[index];
  const allowBack = session?.test?.allowBackNavigation !== false;
  const total = questions.length;

  useEffect(() => {
    if (question) setDraft(answers[question.id] || {});
  }, [question?.id, answers]);

  const onAnticheat = useCallback(
    (type, details) => logSuspicious(type, details),
    [logSuspicious]
  );

  useAnticheat({
    enabled: !!session && !finishing,
    onEvent: onAnticheat,
    onPrivacy: setPrivacy,
  });

  const goNext = async () => {
    if (!question) return;
    try {
      await saveAnswer(question.id, draft);
    } catch {
      toast?.('Не удалось сохранить ответ');
      return;
    }
    if (index < total - 1) setIndex((i) => i + 1);
    else confirmFinish();
  };

  const goBack = async () => {
    if (!question || !allowBack || index === 0) return;
    try {
      await saveAnswer(question.id, draft);
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
      await finishTest();
      toast?.('Тест отправлен');
      onDone?.();
    } catch {
      setFinishing(false);
    }
  };

  const handleExpire = () => {
    Alert.alert('Время вышло', 'Тест будет автоматически отправлен.', [
      { text: 'OK', onPress: handleFinish },
    ]);
  };

  if (!session || !question) {
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
        <ScreenHeader title={`Вопрос ${index + 1} / ${total}`} />
        <Txt style={{ fontSize: 13, color: c.ink2, textAlign: 'center', marginBottom: 4 }}>
          {TYPE_LABELS[question.type] || question.type}
        </Txt>
        <TestTimer durationMinutes={session.test?.durationMinutes} startedAt={startedAt} onExpire={handleExpire} />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          <Card style={{ padding: 18 }}>
            <QuestionMeta question={question} />
            <Txt style={{ fontSize: 18, fontWeight: '700', lineHeight: 26, marginBottom: 16 }}>{question.text}</Txt>
            <QuestionBody question={question} value={draft} onChange={setDraft} />
          </Card>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, flexDirection: 'row', gap: 10 }}>
          {allowBack && index > 0 ? (
            <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onPress={goBack}>
              Назад
            </PrimaryButton>
          ) : null}
          <PrimaryButton
            color="green"
            style={{ flex: 2 }}
            disabled={loading || finishing}
            onPress={goNext}
          >
            {index === total - 1 ? (finishing ? 'Отправка…' : 'Завершить') : 'Далее'}
          </PrimaryButton>
        </View>
      </View>
    </Screen>
  );
}

// ─── Done (no result yet) ─────────────────────────────────────────────────────
export function EntranceDoneScreen({ onResult, onHome }) {
  const { c } = useTheme();
  const { session } = useEntrance();

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>
        <HexBadge size={88} fill={c.green} icon="check" iconColor="#fff" iconSize={40} />
        <Txt style={{ fontSize: 28, fontWeight: '800', marginTop: 24, textAlign: 'center' }}>Тест завершён</Txt>
        <Txt style={{ fontSize: 16, color: c.ink2, marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
          Ответы отправлены в школу.{'\n'}
          {session?.applicant?.childFullName}, результат появится после проверки администратором.
        </Txt>
        <Card style={{ marginTop: 28, padding: 16, width: '100%' }}>
          <Txt style={{ fontSize: 13, color: c.ink3, textAlign: 'center' }}>
            Сохраните персональный код — по нему можно будет посмотреть результат
          </Txt>
        </Card>
        <View style={{ width: '100%', marginTop: 28, gap: 10 }}>
          <PrimaryButton color="blue" onPress={onResult}>Проверить результат</PrimaryButton>
          <PrimaryButton color="ghost" onPress={onHome}>На главную</PrimaryButton>
        </View>
      </View>
    </Screen>
  );
}

// ─── Result view (parent / applicant by code) ─────────────────────────────────
export function EntranceResultScreen({ onBack }) {
  const { c } = useTheme();
  const { code, fetchResult, result, loading, error } = useEntrance();
  const [checked, setChecked] = useState(false);

  const load = async () => {
    setChecked(true);
    try {
      await fetchResult(code);
    } catch {
      /* shown in UI */
    }
  };

  const topics = useMemo(() => {
    if (!result?.topicBreakdown) return [];
    return Object.entries(result.topicBreakdown).map(([name, data]) => ({ name, ...data }));
  }, [result]);

  return (
    <Screen>
      <ScreenHeader title="Результат" back={onBack} large sub="Доступен только после проверки школой" />
      <View style={{ paddingHorizontal: 20 }}>
        {!checked ? (
          <View>
            <Card style={{ padding: 18 }}>
              <Txt style={{ fontSize: 15, lineHeight: 22, color: c.ink2 }}>
                Код: <Txt style={{ fontWeight: '700', color: c.ink }}>{code || '—'}</Txt>
              </Txt>
            </Card>
            <PrimaryButton color="blue" style={{ marginTop: 20 }} onPress={load} disabled={loading}>
              {loading ? 'Загрузка…' : 'Показать результат'}
            </PrimaryButton>
          </View>
        ) : error && !result ? (
          <Card style={{ padding: 20, alignItems: 'center' }}>
            <HexBadge size={56} fill={c.goldSoft} icon="clock" iconColor={c.goldDeep} iconSize={26} />
            <Txt style={{ fontSize: 17, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>Ещё не открыт</Txt>
            <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8, textAlign: 'center', lineHeight: 21 }}>{error}</Txt>
            <PrimaryButton color="ghost" style={{ marginTop: 16 }} onPress={load}>Обновить</PrimaryButton>
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
                    <Pill key={t} color="red">{t}</Pill>
                  ))}
                </View>
              </Card>
            ) : null}

            <PrimaryButton color="ghost" onPress={load}>Обновить</PrimaryButton>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
