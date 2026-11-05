import { AUTH } from '@shared/theme/tokens';

/**
 * Геометрия шапки M1 от верха окна: высота синего, где начинается лист и где центр знака.
 *
 * Одна на экран входа и на анимацию первого запуска: та приводит знак и лист ровно сюда, а
 * потом открывает настоящий экран. Посчитай их каждый по-своему — в конце анимации знак и край
 * листа прыгали бы на несколько точек.
 */
export function signInHero(topInset) {
  const visible = AUTH.heroHeight - AUTH.sheetOverlap;
  return {
    height: topInset + AUTH.heroHeight,
    sheetTop: topInset + visible,
    logoCenterY: topInset + visible / 2,
    logoHeight: AUTH.logoHeight,
  };
}
