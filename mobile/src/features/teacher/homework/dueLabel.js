import { dueShort } from '@shared/api/homeworkMap';

/**
 * Подпись срока в списке у учителя.
 *
 * «До следующего урока» до публикации даты не имеет — момент подставит сервер (ТЗ
 * HOMEWORK-001 §9). Показывать вместо неё «без срока» нельзя: срок выбран, просто он ещё
 * не выражен числом, и учитель, увидев «без срока», полез бы его исправлять.
 */
export function dueRowLabel(homework) {
  if (homework?.dueType === 'NEXT_LESSON' && !homework?.dueAt) return 'До следующего урока';
  return dueShort(homework);
}
