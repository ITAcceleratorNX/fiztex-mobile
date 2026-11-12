import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card, Pill } from '@shared/components/ui';
import { activeWorks, learnerWorkView } from '@shared/api/assessmentMap';

/**
 * «Суммативная работа» в уроке ученика и родителя (Figma S2–S4, P3–P5).
 *
 * Показывает работу, её тип, статус и максимум; после проведения — **только собственный**
 * результат (у родителя — выбранного ребёнка): «17 / 20». Раньше проведения балла нет, чужих баллов
 * и предварительных четвертных значений здесь не бывает вовсе — сервер их не присылает
 * (`myResult` приходит только у проведённой работы). Экран ничего не вычисляет.
 */
export function AssessmentResultCard({ works }) {
  const visible = activeWorks(works);
  if (visible.length === 0) return null;
  return (
    <>
      {visible.map((work) => (
        <WorkResult key={work.id} work={work} />
      ))}
    </>
  );
}

function WorkResult({ work }) {
  const { c } = useTheme();
  const view = learnerWorkView(work);
  return (
    <Card elevated style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="clipboardCheck" size={16} color={c.blue} strokeWidth={2} />
          <Txt style={{ fontSize: 11, fontWeight: '700', color: c.blue, textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Суммативная работа
          </Txt>
        </View>
        <Pill color={view.chipTone === 'green' ? 'success' : view.chipTone}>{view.chip}</Pill>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{view.title}</Txt>
          {view.caption ? <Txt style={{ fontSize: 13, color: c.ink3 }}>{view.caption}</Txt> : null}
        </View>
        {view.scoreParts ? (
          <Txt accessibilityLabel={`Результат ${view.score}`} style={{ color: c.ink3 }}>
            <Txt style={{ fontSize: 28, fontWeight: '700', color: c.ink }}>{view.scoreParts.score}</Txt>
            {view.scoreParts.maxScore != null ? <Txt style={{ fontSize: 17, color: c.ink3 }}>{` / ${view.scoreParts.maxScore}`}</Txt> : null}
          </Txt>
        ) : null}
      </View>
    </Card>
  );
}
