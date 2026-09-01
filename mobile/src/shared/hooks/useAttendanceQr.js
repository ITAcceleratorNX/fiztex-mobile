import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { attendanceQrApi } from '@shared/api/attendanceQrApi';

/**
 * QR-код урока у учителя (ТЗ ATTENDANCE-QR-FE-001).
 *
 * <b>Оверлей и есть сессия:</b> `open()` показывает код и включает его, `close()` гасит.
 * Фронт версиями не управляет и валидность не считает — `canOpen` приходит посчитанным.
 *
 * Ошибка чтения гасится намеренно (ТЗ §6): QR — надстройка над листом, и недоступный код
 * означает отсутствие кнопки, а не сломанный журнал.
 */
export function useAttendanceQr(lessonId, { enabled = true } = {}) {
  const { token } = useAuth();
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!token || !lessonId || !enabled) {
      setSession(null);
      return;
    }
    try {
      setSession(await attendanceQrApi.state(token, lessonId));
    } catch {
      setSession(null);
    }
  }, [token, lessonId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Ответ команды — то же представление, что отдаёт чтение, поэтому перезапрашивать
  // состояние после неё незачем: второй запрос показал бы на миг прежнюю версию.
  const run = useCallback(
    async (call) => {
      if (!token || !lessonId) return null;
      setBusy(true);
      try {
        const next = await call(token, lessonId);
        setSession(next);
        return next;
      } catch (error) {
        return { error };
      } finally {
        setBusy(false);
      }
    },
    [token, lessonId],
  );

  return {
    session,
    busy,
    reload,
    open: useCallback(() => run(attendanceQrApi.open), [run]),
    close: useCallback(() => run(attendanceQrApi.close), [run]),
  };
}
