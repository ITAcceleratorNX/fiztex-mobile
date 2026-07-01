import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { entranceApi } from '../api/entranceApi';

const EntranceCtx = createContext(null);

export function EntranceProvider({ children }) {
  const [code, setCode] = useState('');
  const [sessionToken, setSessionToken] = useState(null);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [startedAt, setStartedAt] = useState(null);

  const reset = useCallback(() => {
    setCode('');
    setSessionToken(null);
    setSession(null);
    setAnswers({});
    setError(null);
    setResult(null);
    setStartedAt(null);
    setLoading(false);
  }, []);

  const authenticate = useCallback(async (rawCode) => {
    const normalized = rawCode.trim().toUpperCase();
    setLoading(true);
    setError(null);
    try {
      const data = await entranceApi.auth(normalized);
      setCode(normalized);
      setSessionToken(data.sessionToken);
      setSession(data);
      setAnswers({});
      return data;
    } catch (e) {
      setError(e.message || 'Не удалось войти по коду');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const startTest = useCallback(async () => {
    if (!sessionToken) throw new Error('Нет сессии');
    setLoading(true);
    setError(null);
    try {
      const data = await entranceApi.start(sessionToken);
      setSession(data);
      setSessionToken(data.sessionToken);
      setStartedAt(Date.now());
      return data;
    } catch (e) {
      setError(e.message || 'Не удалось начать тест');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  const saveAnswer = useCallback(
    async (questionId, payload) => {
      setAnswers((prev) => ({ ...prev, [questionId]: payload }));
      if (sessionToken) {
        await entranceApi.submitAnswer(sessionToken, { questionId, ...payload });
      }
    },
    [sessionToken]
  );

  const logSuspicious = useCallback(
    async (type, details) => {
      if (!sessionToken) return;
      try {
        await entranceApi.logSuspicious(sessionToken, { type, details });
      } catch {
        /* best effort */
      }
    },
    [sessionToken]
  );

  const finishTest = useCallback(async () => {
    if (!sessionToken) throw new Error('Нет сессии');
    setLoading(true);
    setError(null);
    try {
      await entranceApi.finish(sessionToken);
    } catch (e) {
      setError(e.message || 'Не удалось завершить тест');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  const fetchResult = useCallback(async (rawCode) => {
    const normalized = (rawCode || code).trim().toUpperCase();
    setLoading(true);
    setError(null);
    try {
      const data = await entranceApi.result(normalized);
      setResult(data);
      return data;
    } catch (e) {
      setError(e.message || 'Результат пока недоступен');
      setResult(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [code]);

  const value = useMemo(
    () => ({
      code,
      sessionToken,
      session,
      answers,
      loading,
      error,
      result,
      startedAt,
      reset,
      authenticate,
      startTest,
      saveAnswer,
      logSuspicious,
      finishTest,
      fetchResult,
      setError,
    }),
    [
      code,
      sessionToken,
      session,
      answers,
      loading,
      error,
      result,
      startedAt,
      reset,
      authenticate,
      startTest,
      saveAnswer,
      logSuspicious,
      finishTest,
      fetchResult,
    ]
  );

  return <EntranceCtx.Provider value={value}>{children}</EntranceCtx.Provider>;
}

export function useEntrance() {
  const ctx = useContext(EntranceCtx);
  if (!ctx) throw new Error('useEntrance must be used within EntranceProvider');
  return ctx;
}
