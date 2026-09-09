import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkApi } from '@shared/api/homeworkApi';
import { allowsAntiCheatEvent } from './homeworkTestModel';

/**
 * Античит домашнего задания на телефоне (ТЗ ANTICHEAT-001 §3, §4).
 *
 * <p><b>Два разных режима, а не один с флажком.</b> У теста фиксируется уход из приложения:
 * ученик проходит его здесь и сейчас, и переключение в браузер — это то, ради чего античит
 * и включали. У обычного задания то же переключение нарушением не является — ребёнок и
 * должен открыть учебник, — поэтому там остаётся только защита содержимого от скриншотов
 * (`mode: 'content'`).
 *
 * <p><b>Ошибки записи не доходят до ученика.</b> Он в этот момент решает работу; сбой сети
 * при записи события — проблема наблюдения, а не его. Всё гасится здесь.
 *
 * <p><b>Предупреждение показывается, но ничего не прерывает</b> (§3): тест не завершается,
 * ответы не стираются, оценка не меняется. Это сообщение «учитель это увидит», а не
 * наказание.
 */
export function useHomeworkAnticheat({ enabled, homeworkId, mode = 'test', questionIdRef }) {
  const { token } = useAuth();
  const [warning, setWarning] = useState(null);
  const appState = useRef(AppState.currentState);
  const wasAway = useRef(false);

  const log = useCallback(
    (type) => {
      if (!token || !homeworkId) return;
      // Сервер отбросит лишнее и сам, но платить за это трафиком ребёнка незачем.
      if (!allowsAntiCheatEvent(mode, type)) return;
      const questionId = questionIdRef?.current ?? null;
      homeworkApi.logAntiCheatEvent(token, homeworkId, type, questionId).catch(() => undefined);
    },
    [token, homeworkId, mode, questionIdRef],
  );

  const captureKey = `homework-anticheat:${mode}:${homeworkId}`;

  useEffect(() => {
    if (!enabled || !homeworkId) return undefined;

    // Скриншоты запрещаются в обоих режимах: у теста они выносят наружу вопросы, у
    // обычного задания — сам текст, ради которого §4 и написан.
    //
    // Запрет именной: карточка задания остаётся в стеке под экраном теста, и безымянный
    // `allow` при уходе с теста снял бы заодно и её защиту. Ключ считает владельцев сам —
    // снимется запрет только тогда, когда его отпустит последний.
    ScreenCapture.preventScreenCaptureAsync(captureKey).catch(() => undefined);
    const shot = ScreenCapture.addScreenshotListener(() => {
      log('SCREENSHOT_ATTEMPT');
      setWarning('Скриншот задания запрещён. Попытка отмечена для учителя.');
    });

    // Уход из приложения — нарушение только у теста. У обычного задания слушателя нет
    // вовсе: сервер такое событие и не примет, а отправлять запрос, чтобы его выбросили,
    // значит тратить сеть ребёнка на пустое.
    const state =
      mode === 'test'
        ? AppState.addEventListener('change', (next) => {
            const was = appState.current;
            appState.current = next;
            if (/active/.test(was) && /inactive|background/.test(next)) {
              wasAway.current = true;
              log('APP_BACKGROUND');
              return;
            }
            if (/inactive|background/.test(was) && next === 'active' && wasAway.current) {
              wasAway.current = false;
              log('RE_ENTRY');
              setWarning('Вы выходили из приложения. Это отмечено для учителя.');
            }
          })
        : null;

    return () => {
      state?.remove?.();
      shot?.remove?.();
      ScreenCapture.allowScreenCaptureAsync(captureKey).catch(() => undefined);
    };
  }, [enabled, homeworkId, mode, captureKey, log]);

  return {
    warning,
    dismissWarning: useCallback(() => setWarning(null), []),
    /** Явный уход с экрана теста до отправки — это тоже выход из работы (§3). */
    logLeave: useCallback(() => {
      if (enabled && mode === 'test') log('PAGE_CLOSE');
    }, [enabled, mode, log]),
  };
}
