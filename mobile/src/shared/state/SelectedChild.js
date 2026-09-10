import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Выбранный ребёнок родителя — один на всё приложение.
 *
 * <p>Раньше выбор жил состоянием каждого экрана: на «Главной» родитель переключался на
 * второго ребёнка, а «Расписание», «Задания» и «Оценки» продолжали показывать первого.
 * Терпимо, пока у каждого экрана свой видимый переключатель, — и невозможно с того
 * момента, как появилась кнопка «Текущий урок»: она живёт в нижней панели, своего
 * переключателя не имеет и обязана вести к уроку <b>того самого</b> ребёнка, которого
 * родитель выбрал (ТЗ Быстрый доступ §2).
 *
 * <p>Выбор намеренно не сохраняется между запусками: это контекст сеанса, а не настройка,
 * и «прошлый раз смотрели второго» через неделю читалось бы как ошибка приложения.
 */
const SelectedChildCtx = createContext(null);

export function SelectedChildProvider({ children }) {
  const [childId, setChildId] = useState(null);
  const value = useMemo(() => ({ childId, setChildId }), [childId]);
  return <SelectedChildCtx.Provider value={value}>{children}</SelectedChildCtx.Provider>;
}

/**
 * Текущий выбор плюс автоподстановка первого ребёнка.
 *
 * @param {Array<{id: number}>} children список из `useParentChildren`; пока он не пришёл,
 *   выбор остаётся пустым, и экраны не начинают грузить данные несуществующего ребёнка.
 */
export function useSelectedChild(children = []) {
  const ctx = useContext(SelectedChildCtx);
  const childId = ctx?.childId ?? null;
  const setChildId = ctx?.setChildId;

  // Первый ребёнок выбирается сам: экран без выбора показал бы пустоту тому, у кого
  // ребёнок один и выбирать нечего.
  useEffect(() => {
    if (childId == null && children.length > 0 && setChildId) setChildId(children[0].id);
  }, [children, childId, setChildId]);

  // Ребёнок мог исчезнуть из списка (связь отозвали) — держаться за его id значит
  // показывать пустые экраны без объяснения.
  useEffect(() => {
    if (childId != null && children.length > 0 && setChildId
        && !children.some((child) => child.id === childId)) {
      setChildId(children[0].id);
    }
  }, [children, childId, setChildId]);

  return { childId, setChildId: setChildId ?? (() => {}) };
}
