import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { HISTORY } from '@shared/theme/tokens';
import { Txt } from '@shared/components/Txt';
import { Card, StateView } from '@shared/components/ui';
import { HistorySheet } from '@shared/ui/HistorySheet';
import { useGradeHistory } from '@shared/hooks/useGrades';
import { gradeHistoryActor, gradeHistoryDescription, gradeHistoryTime } from '@shared/api/gradeHistoryMap';

export function GradeHistorySheet({ gradeId, studentName, onClose }) {
  const { c } = useTheme();
  const { loading, error, events, reload } = useGradeHistory(gradeId);
  return (
    <HistorySheet title="История оценки" subtitle={studentName} onClose={onClose}>
      {loading ? <ActivityIndicator accessibilityLabel="Загружаем историю" color={c.blue} />
        : error ? <StateView icon="alertTriangle" title="Не удалось загрузить историю оценки" actionLabel="Повторить" onAction={() => reload()} />
        : events.length === 0 ? <StateView icon="clock" title="История пуста" />
        : events.map(event => <Card key={event.id} style={{ gap: HISTORY.gap }}>
          <Txt style={{ fontSize: HISTORY.bodySize, fontWeight: '700', color: c.ink }}>{gradeHistoryDescription(event)}</Txt>
          <Txt style={{ fontSize: HISTORY.bodySize, color: c.ink2 }}>{gradeHistoryActor(event)}</Txt>
          <Txt style={{ fontSize: HISTORY.captionSize, color: c.ink3 }}>{gradeHistoryTime(event.createdAt)}</Txt>
        </Card>)}
    </HistorySheet>
  );
}
