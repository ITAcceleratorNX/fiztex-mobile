import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';
import { useAppState } from '@shared/state/AppState';
import {
  admissionsApi,
  clearEntranceSession,
  getActiveAttemptId,
  getEntranceToken,
  setActiveAttemptId,
} from './api/entranceApi';
import {
  EntranceCodeScreen,
  EntranceConfirmScreen,
  EntranceAssignmentsScreen,
  EntranceInstructionScreen,
  EntranceTestScreen,
  EntranceDoneScreen,
  EntranceResultScreen,
} from './screens/EntranceScreens';

const FINISHED_STATUSES = ['AWAITING_REVIEW', 'REVIEWED', 'COMPLETED', 'OPEN_FOR_VIEWING'];

async function resolveBootstrapScreen(loadAssignments) {
  const attemptId = await getActiveAttemptId();
  if (attemptId != null) {
    const detail = await admissionsApi.getAttempt(attemptId);
    if (detail.status === 'IN_PROGRESS') {
      await admissionsApi.logEvent(attemptId, 're_entry', 'mobile resume');
      return { screen: 'attempt', attempt: detail };
    }
    if (detail.status === 'OPEN_FOR_VIEWING') {
      await setActiveAttemptId(null);
      const list = await loadAssignments();
      return { screen: 'list', applicant: list.applicant, assignments: list.assignments };
    }
    if (FINISHED_STATUSES.includes(detail.status)) {
      return { screen: 'done', attempt: detail };
    }
    await setActiveAttemptId(null);
  }
  const list = await loadAssignments();
  return { screen: 'list', applicant: list.applicant, assignments: list.assignments };
}

/**
 * Client-side state machine over applicant screens — mirrors web EntranceFlow.
 * Backend is source of truth; token + attemptId persist in AsyncStorage for resume.
 */
export function EntranceFlow({ onExit }) {
  const { c } = useTheme();
  const { toast } = useAppState();
  const [screen, setScreen] = useState('code');
  const [applicant, setApplicant] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bootstrapError, setBootstrapError] = useState(null);

  const loadAssignments = useCallback(async () => {
    const list = await admissionsApi.getAssignments();
    setApplicant(list?.applicant ?? null);
    setAssignments(list?.assignments ?? []);
    return list;
  }, []);

  const resetSession = useCallback(async () => {
    await clearEntranceSession();
    setApplicant(null);
    setAssignments([]);
    setAttempt(null);
    setResult(null);
    setSelected(null);
    setBootstrapError(null);
    setScreen('code');
  }, []);

  const runBootstrap = useCallback(async () => {
    setBootstrapError(null);
    const token = await getEntranceToken();
    if (!token) return;

    setScreen('loading');
    try {
      const resolved = await resolveBootstrapScreen(loadAssignments);
      if (resolved.applicant) setApplicant(resolved.applicant);
      if (resolved.assignments) setAssignments(resolved.assignments);
      if (resolved.attempt) setAttempt(resolved.attempt);
      setScreen(resolved.screen);
    } catch (e) {
      await clearEntranceSession();
      setApplicant(null);
      setAssignments([]);
      setAttempt(null);
      setResult(null);
      setSelected(null);
      const message = e?.message || 'Не удалось восстановить сессию. Проверьте сеть.';
      setBootstrapError(message);
      toast?.(message);
      setScreen('code');
    }
  }, [loadAssignments, toast]);

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  const enterAttempt = useCallback(async (detail) => {
    setAttempt(detail);
    await setActiveAttemptId(detail.attemptId);
    setScreen('attempt');
  }, []);

  async function handleVerified(data) {
    setApplicant(data.applicant);
    setScreen('confirm');
  }

  async function handleConfirmed() {
    setBusy(true);
    try {
      await loadAssignments();
      setScreen('list');
    } catch (e) {
      toast?.(e.message || 'Не удалось загрузить тесты');
    } finally {
      setBusy(false);
    }
  }

  async function handleExit() {
    await resetSession();
    onExit?.();
  }

  function handleStart(item) {
    setSelected(item);
    setScreen('instruction');
  }

  async function beginAttempt(assignmentId) {
    const detail = await admissionsApi.startAttempt(assignmentId);
    await enterAttempt(detail);
  }

  async function handleBeginFromInstruction() {
    if (!selected) return;
    setBusy(true);
    try {
      await beginAttempt(selected.assignmentId);
    } catch (e) {
      toast?.(e.message || 'Не удалось начать тест');
    } finally {
      setBusy(false);
    }
  }

  async function handleContinue(item) {
    try {
      if (item.attemptId != null) {
        const detail = await admissionsApi.getAttempt(item.attemptId);
        await enterAttempt(detail);
        return;
      }
      await beginAttempt(item.assignmentId);
    } catch (e) {
      toast?.(e.message || 'Не удалось открыть тест');
    }
  }

  async function handleFinished() {
    await setActiveAttemptId(null);
    setScreen('done');
  }

  /** Only reachable when backend sets availableAction VIEW_RESULT (OPEN_FOR_VIEWING). */
  async function handleViewResult(item) {
    try {
      const data = await admissionsApi.getResult(item.assignmentId);
      setResult(data);
      setSelected(item);
      setScreen('result');
    } catch (e) {
      toast?.(e.message || 'Не удалось загрузить результат');
    }
  }

  async function handleBackToList() {
    await setActiveAttemptId(null);
    setAttempt(null);
    setResult(null);
    setSelected(null);
    setBusy(true);
    try {
      await loadAssignments();
      setScreen('list');
    } catch (e) {
      toast?.(e.message || 'Не удалось загрузить тесты');
    } finally {
      setBusy(false);
    }
  }

  if (screen === 'loading') {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator color={c.green} size="large" />
          <Txt style={{ fontSize: 14, color: c.ink2 }}>Восстанавливаем сессию…</Txt>
        </View>
      </Screen>
    );
  }

  if (screen === 'code') {
    return (
      <EntranceCodeScreen
        onBack={onExit}
        onVerified={handleVerified}
        bootstrapError={bootstrapError}
        onDismissBootstrapError={() => setBootstrapError(null)}
      />
    );
  }

  if (screen === 'confirm' && applicant) {
    return (
      <EntranceConfirmScreen
        applicant={applicant}
        onConfirm={handleConfirmed}
        onBack={resetSession}
        loading={busy}
      />
    );
  }

  if (screen === 'list' && applicant) {
    return (
      <EntranceAssignmentsScreen
        applicant={applicant}
        assignments={assignments}
        onRefresh={loadAssignments}
        onStart={handleStart}
        onContinue={handleContinue}
        onViewResult={handleViewResult}
        onExit={handleExit}
      />
    );
  }

  if (screen === 'instruction' && selected) {
    return (
      <EntranceInstructionScreen
        item={selected}
        onBegin={handleBeginFromInstruction}
        onBack={() => setScreen('list')}
        loading={busy}
      />
    );
  }

  if (screen === 'attempt' && attempt) {
    return (
      <EntranceTestScreen
        key={attempt.attemptId}
        attempt={attempt}
        onFinished={handleFinished}
      />
    );
  }

  if (screen === 'done') {
    return (
      <EntranceDoneScreen
        testTitle={attempt?.testTitle}
        onBackToList={handleBackToList}
        onExit={handleExit}
      />
    );
  }

  if (screen === 'result' && result) {
    return <EntranceResultScreen result={result} onBack={handleBackToList} onExit={handleExit} />;
  }

  return (
    <EntranceCodeScreen
      onBack={onExit}
      onVerified={handleVerified}
      bootstrapError={bootstrapError}
      onDismissBootstrapError={() => setBootstrapError(null)}
    />
  );
}
