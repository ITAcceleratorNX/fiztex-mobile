import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { entranceApi } from '../api/entranceApi';
import React from 'react';

const EntranceCtx = createContext(null);

const TOKEN_KEY = 'fiztex.admissions.token';
const ATTEMPT_KEY = 'fiztex.admissions.attemptId';

const SAVE_DEBOUNCE_MS = 700;

/** Thin provider — session lives in entranceSession.js; flow state in EntranceFlow. */
export function EntranceProvider({ children }) {
  const [token, setToken] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [attempt, setAttempt] = useState(null); // AttemptDetail
  const [answers, setAnswers] = useState({}); // questionId -> draft payload
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveTimers = useRef({});

  const persistSession = useCallback(async (nextToken, attemptId) => {
    try {
      if (nextToken) await AsyncStorage.setItem(TOKEN_KEY, nextToken);
      if (attemptId) await AsyncStorage.setItem(ATTEMPT_KEY, String(attemptId));
      else await AsyncStorage.removeItem(ATTEMPT_KEY);
    } catch {
      /* best effort */
    }
  }, []);

  const clearSession = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, ATTEMPT_KEY]);
    } catch {
      /* best effort */
    }
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    setApplicant(null);
    setAssignments([]);
    setAttempt(null);
    setAnswers({});
    setResult(null);
    setError(null);
    setLoading(false);
    clearSession();
  }, [clearSession]);

  const verifyCode = useCallback(
    async (rawCode) => {
      const code = rawCode.trim().toUpperCase();
      setLoading(true);
      setError(null);
      try {
        const data = await entranceApi.verifyCode(code);
        setToken(data.accessToken);
        setApplicant(data.applicant);
        await persistSession(data.accessToken, null);
        return data;
      } catch (e) {
        setError(e.message || 'Не удалось проверить код');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

  const loadAssignments = useCallback(async () => {
    if (!token) throw new Error('Нет сессии');
    setLoading(true);
    setError(null);
    try {
      const data = await entranceApi.getAssignments(token);
      setAssignments(data.assignments || []);
      if (data.applicant) setApplicant(data.applicant);
      return data;
    } catch (e) {
      setError(e.message || 'Не удалось загрузить список тестов');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const startAttempt = useCallback(
    async (assignmentId) => {
      if (!token) throw new Error('Нет сессии');
      setLoading(true);
      setError(null);
      try {
        const data = await entranceApi.startAttempt(token, assignmentId);
        setAttempt(data);
        setAnswers({});
        await persistSession(token, data.attemptId);
        return data;
      } catch (e) {
        setError(e.message || 'Не удалось начать тест');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [token, persistSession]
  );

  const resumeAttempt = useCallback(
    async (attemptId) => {
      if (!token) throw new Error('Нет сессии');
      setLoading(true);
      setError(null);
      try {
        const data = await entranceApi.getAttempt(token, attemptId);
        setAttempt(data);
        const draft = {};
        (data.answers || []).forEach((a) => {
          draft[a.questionId] = a;
        });
        setAnswers(draft);
        await persistSession(token, data.attemptId);
        return data;
      } catch (e) {
        setError(e.message || 'Не удалось восстановить тест');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [token, persistSession]
  );

  const saveAnswerNow = useCallback(
    async (questionId, payload) => {
      if (!token || !attempt) return null;
      // `photos` are persisted via the dedicated upload/delete endpoints, not the answer
      // payload — strip them so the network call only ever sends the fields the API accepts.
      const { photos, ...networkPayload } = payload;
      const data = await entranceApi.saveAnswer(token, attempt.attemptId, { questionId, ...networkPayload });
      if (data && typeof data.remainingSeconds === 'number') {
        setAttempt((prev) => (prev ? { ...prev, remainingSeconds: data.remainingSeconds } : prev));
      }
      return data;
    },
    [token, attempt]
  );

  // Updates local answer state without triggering a network save — used for photo
  // attach/detach, which are already persisted server-side via uploadPhoto/deletePhoto.
  const updateLocalAnswer = useCallback((questionId, partial) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...partial, questionId } }));
  }, []);

  // Debounced autosave — mirrors the web's ~700ms scheduleSave, with local state updated
  // immediately so the UI never waits on the network.
  const saveAnswer = useCallback(
    (questionId, payload) => {
      setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...payload, questionId } }));
      return new Promise((resolve, reject) => {
        clearTimeout(saveTimers.current[questionId]);
        saveTimers.current[questionId] = setTimeout(async () => {
          try {
            const data = await saveAnswerNow(questionId, payload);
            resolve(data);
          } catch (e) {
            reject(e);
          }
        }, SAVE_DEBOUNCE_MS);
      });
    },
    [saveAnswerNow]
  );

  const flushAnswer = useCallback(
    async (questionId) => {
      clearTimeout(saveTimers.current[questionId]);
      const payload = answers[questionId];
      if (!payload) return null;
      return saveAnswerNow(questionId, payload);
    },
    [answers, saveAnswerNow]
  );

  const logSuspicious = useCallback(
    (type, details) => {
      if (!token || !attempt) return;
      entranceApi.logEvent(token, attempt.attemptId, { type, details });
    },
    [token, attempt]
  );

  const uploadPhoto = useCallback(
    async (questionId, fileUri) => {
      if (!token || !attempt) throw new Error('Нет активной попытки');
      return entranceApi.uploadPhoto(token, attempt.attemptId, questionId, fileUri);
    },
    [token, attempt]
  );

  const deletePhoto = useCallback(
    async (questionId, photoId) => {
      if (!token || !attempt) throw new Error('Нет активной попытки');
      return entranceApi.deletePhoto(token, attempt.attemptId, questionId, photoId);
    },
    [token, attempt]
  );

  const submitAttempt = useCallback(async () => {
    if (!token || !attempt) throw new Error('Нет активной попытки');
    setLoading(true);
    setError(null);
    try {
      Object.keys(saveTimers.current).forEach((id) => clearTimeout(saveTimers.current[id]));
      await entranceApi.submitAttempt(token, attempt.attemptId);
      await persistSession(token, null);
      return true;
    } catch (e) {
      setError(e.message || 'Не удалось завершить тест');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [token, attempt, persistSession]);

  const fetchResult = useCallback(
    async (assignmentId) => {
      if (!token) throw new Error('Нет сессии');
      setLoading(true);
      setError(null);
      try {
        const data = await entranceApi.getResult(token, assignmentId);
        setResult(data);
        return data;
      } catch (e) {
        setError(e.message || 'Результат пока недоступен');
        setResult(null);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const value = useMemo(
    () => ({
      token,
      applicant,
      assignments,
      attempt,
      answers,
      result,
      loading,
      error,
      setError,
      reset,
      verifyCode,
      loadAssignments,
      startAttempt,
      resumeAttempt,
      saveAnswer,
      flushAnswer,
      updateLocalAnswer,
      logSuspicious,
      uploadPhoto,
      deletePhoto,
      submitAttempt,
      fetchResult,
    }),
    [
      token,
      applicant,
      assignments,
      attempt,
      answers,
      result,
      loading,
      error,
      reset,
      verifyCode,
      loadAssignments,
      startAttempt,
      resumeAttempt,
      saveAnswer,
      flushAnswer,
      updateLocalAnswer,
      logSuspicious,
      uploadPhoto,
      deletePhoto,
      submitAttempt,
      fetchResult,
    ]
  );

  return <EntranceCtx.Provider value={value}>{children}</EntranceCtx.Provider>;
  return children;
}

export function useEntrance() {
  throw new Error('useEntrance is deprecated — use EntranceFlow props or admissionsApi directly');
}
