import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';
import { useParentChildren } from '@shared/hooks/useSchedule';
import { useCurrentLesson } from '@shared/hooks/useCurrentLesson';
import { useSelectedChild } from '@shared/state/SelectedChild';
import { CurrentLessonBanner } from '@shared/components/CurrentLessonBanner';
import { currentLessonPayload } from '@shared/api/currentLessonMap';
import { childPillLabel } from '@features/home/homeDate';

/**
 * Кнопка «Текущий урок», подключённая к данным: живёт в нижней панели навигации
 * ученика, родителя и учителя (ТЗ Быстрый доступ §1).
 *
 * <p>Роль в запросе не участвует — какой урок «свой», решает бэк по аккаунту. Роль
 * решает здесь ровно одно: нужен ли контекст ребёнка. У родителя он обязателен, и берётся
 * это не «первый попавшийся ребёнок», а тот, которого родитель выбрал на экранах
 * (`useSelectedChild`): смена выбора пересчитывает урок сама, потому что `childId`
 * уходит в запрос.
 *
 * <p>Хозяйственным ролям кнопка не показывается вовсе — панель у них своя, уроков нет.
 */
export function CurrentLessonBar({ style }) {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const { role, isAuthenticated, token } = useAuth();
  const isParent = role === 'PARENT';

  const { children } = useParentChildren(isParent);
  const { childId } = useSelectedChild(isParent ? children : []);
  const child = useMemo(
    () => (isParent ? children.find((item) => item.id === childId) || null : null),
    [isParent, children, childId],
  );

  // Родителю до выбора ребёнка спрашивать нечего: запрос без `childId` бэкенд отклоняет
  // (403), и «ошибка» на кнопке появлялась бы на каждом старте приложения.
  const enabled = isAuthenticated && focused && (!isParent || Boolean(childId));
  const state = useCurrentLesson({ childId: isParent ? childId : null, enabled });
  const context = useMemo(() => ({ enabled, childId, role, token }), [enabled, childId, role, token]);
  const currentContext = useRef(context);
  useLayoutEffect(() => {
    currentContext.current = context;
    return () => { if (currentContext.current === context) currentContext.current = null; };
  }, [context]);

  /**
   * ТЗ §4: при каждом нажатии урок определяется заново. Поэтому сначала перезапрос, и
   * только потом переход — иначе после звонка кнопка ещё минуту вела бы в закончившийся
   * урок. Если перезапрос не удался, идём по тому, что уже знаем: показанный урок хуже
   * не стал, а отказ открывать что-либо из-за пропавшей сети — худшее из решений.
   */
  const open = useCallback(async () => {
    const fresh = await state.reload({ silent: true });
    if (currentContext.current !== context || !enabled) return;
    const target = fresh?.lessonId ? fresh : state.data;
    const payload = currentLessonPayload(target, {
      childId: isParent ? childId : null,
      childName: child ? childPillLabel(child) : null,
    });
    if (payload) navigation.navigate('lesson', { payload });
  }, [state, isParent, childId, child, navigation, context, enabled]);

  if (!enabled) return null;
  return <CurrentLessonBanner state={state} onOpen={open} style={style} />;
}
