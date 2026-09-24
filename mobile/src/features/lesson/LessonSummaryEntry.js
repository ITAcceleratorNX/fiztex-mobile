import React, { useEffect } from 'react';
import { ModuleRow } from '@shared/ui/rows';
import { useLessonSummary } from '@shared/hooks/useLessonSummary';

export function LessonSummaryEntry({ lessonId, childId, nav, staff = false, refreshing = false }) {
  const { data, loading, error, reload } = useLessonSummary(lessonId, childId);
  useEffect(() => { if (refreshing) void reload(true); }, [refreshing, reload]);
  if (!staff && !data?.content && !error) return null;
  return <ModuleRow icon="textbook" tint="blue" label="Конспект урока"
    value={loading ? 'Загружаем…' : error ? 'Не удалось загрузить · повторить' :
      data?.publishedAt ? 'Конспект и ' + (data.content?.companionKind === 'PLAN' ? 'план урока' : 'пересказ') :
      data?.content ? 'Черновик · только для сотрудников' : 'Создать в веб-версии'}
    onPress={() => nav?.('lesson-summary', { lessonInstanceId: lessonId, childId, staff })} />;
}
