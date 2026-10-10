import React from 'react';
import { Card, OutlineButton } from './ui';
import { Txt } from './Txt';
import { useTheme } from '../theme/ThemeContext';
import { DOCUMENT, FONT } from '../theme/tokens';
import { gradeValueLabel } from '../api/gradesMap';

/** Confirmed totals only. This component never receives answers or answer keys. */
export function HomeworkResultCard({ status, isTest, result, grade, gradeLoading, gradeError, onRetry }) {
  const { c } = useTheme();
  if (status !== 'DONE') return null;
  const hasResult = result?.score != null && result?.maxScore != null
    && Number.isFinite(Number(result.score)) && Number.isFinite(Number(result.maxScore));
  const number = (value) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 20 }).format(value);
  const gradeLabel = gradeValueLabel(grade);
  const bodyStyle = { fontSize: DOCUMENT.bodySize, lineHeight: DOCUMENT.bodyLine, color: c.ink };

  return (
    <Card style={{ gap: DOCUMENT.gap }}>
      <Txt style={{ fontFamily: FONT.bold, fontSize: DOCUMENT.headingSize,
        lineHeight: DOCUMENT.headingLine, color: c.ink }}>Результат проверки</Txt>
      {isTest ? (
        <Txt style={bodyStyle}>
          {hasResult
            ? `Результат: ${number(result.score)} из ${number(result.maxScore)} баллов`
            : 'Баллы пока не выставлены'}
        </Txt>
      ) : null}
      {gradeLabel ? <Txt style={bodyStyle}>Оценка: {gradeLabel}</Txt> : null}
      {gradeLoading ? (
        <Txt style={bodyStyle}>Загружаем оценку…</Txt>
      ) : gradeError ? (
        <>
          <Txt style={bodyStyle}>Не удалось обновить оценку</Txt>
          <OutlineButton onPress={onRetry}>Повторить загрузку оценки</OutlineButton>
        </>
      ) : !gradeLabel ? <Txt style={bodyStyle}>Оценка пока не выставлена</Txt> : null}
    </Card>
  );
}
