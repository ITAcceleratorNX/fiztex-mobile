import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_CHROME_HEIGHT, Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card, SegmentedSwitch, StateView } from '@shared/components/ui';
import { DynamicsChart, Sparkline } from '@shared/components/DynamicsChart';
import { ChildPickerSheet, ChildSwitcherPill } from '@shared/ui/childSwitcher';
import { useParentChildren } from '@shared/hooks/useSchedule';
import { useSelectedChild } from '@shared/state/SelectedChild';
import { useChildGradeDynamics, useChildSubjectDynamics } from '@shared/hooks/useGradeDynamics';
import { useTheme } from '@shared/theme/ThemeContext';
import { PHYSTECH } from '@shared/theme/tokens';
import {
  PERIODS, changeBadge, compareLabel, dayMonth, formatIndicator, formatValue, notGraded,
  pointKind, pointValue, seriesTitle, windowLabel,
} from '@shared/api/gradeDynamicsMap';

/**
 * Динамика успеваемости родителя (Figma 2216:49851, 2216:56054) и экран предмета
 * (2216:49955). Ребёнок — общий выбор родительского приложения; период живёт на экране и
 * при возврате с предмета остаётся прежним. Все числа — ответ сервера.
 */
export function ParentGradeDynamicsScreen({ nav, payload }) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { children, loading: childrenLoading, error: childrenError } = useParentChildren();
  const { childId, setChildId } = useSelectedChild(children);
  const [period, setPeriod] = useState(payload?.period || 'QUARTER');
  const [picker, setPicker] = useState(false);
  const child = children.find((item) => item.id === childId) || null;
  const { data, loading, error, reload } = useChildGradeDynamics(childId, period);
  const overall = data?.overall;
  const value = formatIndicator(overall?.current);

  return (
    <Screen refreshing={false} onRefresh={() => reload()} contentStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + BOTTOM_CHROME_HEIGHT }}>
      <BackLink label="Главная" onPress={() => nav?.back?.()} />
      <Txt style={{ fontSize: 28, fontWeight: '700', color: c.blueInk }}>Динамика успеваемости</Txt>
      {child ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <ChildSwitcherPill child={child} index={children.indexOf(child)} canSwitch={children.length > 1} onPress={() => setPicker(true)} />
        </View>
      ) : null}
      <SegmentedSwitch value={period} options={PERIODS} onChange={setPeriod} />

      {!childId ? (
        <StateView title={childrenLoading ? 'Загрузка…' : childrenError || 'Дети не привязаны'} />
      ) : loading && !data ? <StateView title="Загрузка…" /> : error ? (
        <StateView icon="alert" title={error} actionLabel="Повторить" onAction={() => reload()} />
      ) : data ? (
        <>
          <Card style={{ gap: 10 }}>
            <Txt style={{ color: c.ink2, fontSize: 13 }}>Средний балл · {windowLabel(data.window)}</Txt>
            {value == null ? (
              <Txt style={{ fontSize: 16, color: c.ink2 }}>За период оценок пока нет</Txt>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Txt style={{ fontSize: 44, fontWeight: '800', color: c.ink }}>{value}</Txt>
                  {overall?.trend !== 'INSUFFICIENT_DATA' ? <ChangeBadge metric={overall} /> : null}
                </View>
                {overall?.trend === 'INSUFFICIENT_DATA' ? (
                  <>
                    <ChangeBadge metric={overall} />
                    <Txt style={{ color: c.ink2, fontSize: 13 }}>
                      За прошлый период оценок нет — сравнить пока не с чем. Сравнение появится, когда закончится следующий период.
                    </Txt>
                  </>
                ) : (
                  <Txt style={{ color: c.ink2, fontSize: 13 }}>{compareLabel(data.previousWindow)}</Txt>
                )}
                {(data.series || []).length > 0 ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, gap: 8 }}>
                    <Txt style={{ color: c.ink2, fontSize: 13 }}>{seriesTitle(data.seriesStep)}</Txt>
                    <DynamicsChart
                      accessibilityLabel={`${seriesTitle(data.seriesStep)}, последнее значение ${value}`}
                      from={data.window.from}
                      to={data.window.to}
                      line={data.series.map((p) => ({ date: p.to, value: Number(p.value) }))}
                      formatValue={(v) => formatValue(v, overall?.current?.mode)}
                    />
                  </View>
                ) : null}
              </>
            )}
          </Card>

          <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>По предметам</Txt>
          {(data.subjects || []).length === 0 ? <StateView title="Предметов за период нет" /> : data.subjects.map((row) => (
            <SubjectRow key={row.subjectId} row={row} previous={data.previousWindow}
              onPress={() => nav?.('grade-dynamics-subject', { subjectId: row.subjectId, subjectName: row.subjectName, period })} />
          ))}
        </>
      ) : null}

      <ChildPickerSheet visible={picker} items={children} selectedId={childId}
        onSelect={(id) => { setChildId(id); setPicker(false); }} onClose={() => setPicker(false)} />
    </Screen>
  );
}

function SubjectRow({ row, previous, onPress }) {
  const { c } = useTheme();
  const graded = !notGraded(row.metric);
  const value = formatIndicator(row.metric?.current);
  const noPrevious = row.metric?.trend === 'INSUFFICIENT_DATA' && value != null;
  return (
    <Card onPress={graded ? onPress : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>{row.subjectName}</Txt>
        <Txt style={{ fontSize: 13, color: c.ink2 }}>
          {!graded ? 'Оценки не выставляются' : value == null ? 'Нет оценок за период'
            : noPrevious ? 'Новый предмет / нет прошлых оценок' : compareLabel(previous)}
        </Txt>
        {noPrevious ? <View style={{ alignSelf: 'flex-start' }}><ChangeBadge metric={row.metric} /></View> : null}
      </View>
      {value != null ? (
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Txt style={{ fontSize: 20, fontWeight: '800', color: c.blueInk }}>{value}</Txt>
          {!noPrevious ? <ChangeBadge metric={row.metric} /> : null}
        </View>
      ) : null}
      {graded ? <Icon name="chevronRight" size={18} color={c.ink3} /> : null}
    </Card>
  );
}

export function ParentSubjectDynamicsScreen({ nav, payload }) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { children } = useParentChildren();
  const { childId, setChildId } = useSelectedChild(children);
  const [period, setPeriod] = useState(payload?.period || 'QUARTER');
  const [picker, setPicker] = useState(false);
  const child = children.find((item) => item.id === childId) || null;
  const subjectId = payload?.subjectId ?? null;
  const { data, loading, error, reload } = useChildSubjectDynamics(childId, subjectId, period);
  const metric = data?.metric;
  const value = formatIndicator(metric?.current);
  const mode = metric?.current?.mode;
  const points = (data?.points || []).filter((p) => p.cumulativeValue != null);
  const previous = metric?.previous;
  const reference = previous?.state === 'AVAILABLE' && previous.value != null && previous.mode === mode
    ? { value: Number(previous.value), label: `Прошлый период: ${formatValue(previous.value, mode)}` } : undefined;

  return (
    <Screen refreshing={false} onRefresh={() => reload()} contentStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + BOTTOM_CHROME_HEIGHT }}>
      <BackLink label="Динамика" onPress={() => nav?.back?.()} />
      <Txt style={{ fontSize: 28, fontWeight: '700', color: c.blueInk }}>{data?.subjectName || payload?.subjectName || 'Предмет'}</Txt>
      {child ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <ChildSwitcherPill child={child} index={children.indexOf(child)} canSwitch={children.length > 1} onPress={() => setPicker(true)} />
        </View>
      ) : null}
      <SegmentedSwitch value={period} options={PERIODS} onChange={setPeriod} />

      {loading && !data ? <StateView title="Загрузка…" /> : error ? (
        <StateView icon="alert" title={error} actionLabel="Повторить" onAction={() => reload()} />
      ) : data ? (
        <>
          <Card style={{ gap: 10 }}>
            <Txt style={{ color: c.ink2, fontSize: 13 }}>Средний балл · {windowLabel(data.window)}</Txt>
            {value == null ? (
              <Txt style={{ fontSize: 16, color: c.ink2 }}>{notGraded(metric) ? 'Оценки не выставляются' : 'За период оценок пока нет'}</Txt>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Txt style={{ fontSize: 44, fontWeight: '800', color: c.ink }}>{value}</Txt>
                  <ChangeBadge metric={metric} />
                </View>
                <Txt style={{ color: c.ink2, fontSize: 13 }}>
                  {metric?.trend === 'INSUFFICIENT_DATA' ? 'За прошлый период оценок нет — сравнить пока не с чем' : compareLabel(data.previousWindow)}
                </Txt>
                {points.length > 0 ? (
                  <DynamicsChart
                    accessibilityLabel={`Оценки и средний балл, последнее значение ${value}`}
                    from={data.window.from}
                    to={data.window.to}
                    line={points.map((p) => ({ date: p.date, value: Number(p.cumulativeValue) }))}
                    markers={points.map((p) => ({ key: String(p.gradeId), date: p.date, value: Number(p.cumulativeValue), kind: pointKind(p) }))}
                    reference={reference}
                    formatValue={(v) => formatValue(v, mode)}
                  />
                ) : null}
              </>
            )}
          </Card>
          <GradeGrid points={data.points || []} />
        </>
      ) : null}

      <ChildPickerSheet visible={picker} items={children} selectedId={childId}
        onSelect={(id) => { setChildId(id); setPicker(false); }} onClose={() => setPicker(false)} />
    </Screen>
  );
}

/** «Оценки · 17»: плитки от новых к старым; СОР — зелёная рамка «23/25», СОЧ — тёмная плитка. */
function GradeGrid({ points }) {
  const { c } = useTheme();
  const tiles = [...points].reverse();
  return (
    <Card style={{ gap: 12 }}>
      <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>Оценки · {points.length}</Txt>
      {tiles.length === 0 ? <Txt style={{ color: c.ink2 }}>За период оценок нет</Txt> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {tiles.map((point) => {
            const kind = pointKind(point);
            const v = pointValue(point);
            const label = kind === 'SOR' ? 'СОР' : kind === 'SOCH' ? 'СОЧ' : 'Оценка';
            const ink = kind === 'SOCH' ? c.surface : kind === 'SOR' ? c.markPresent : c.blueInk;
            return (
              <View key={point.gradeId} accessible accessibilityLabel={`${label} ${v.max ? `${v.main} из ${v.max}` : v.main}, ${dayMonth(point.date)}`}
                style={{
                  width: 58, height: 74, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: kind === 'SOCH' ? c.blueInk : kind === 'SOR' ? c.surface : c.blueSoft,
                  borderWidth: kind === 'SOR' ? 2 : 0, borderColor: c.markPresent,
                }}>
                <Txt style={{ fontSize: 22, fontWeight: '800', color: ink }}>
                  {v.main}{v.max ? <Txt style={{ fontSize: 13, fontWeight: '700', color: ink }}>/{v.max}</Txt> : null}
                </Txt>
                <Txt style={{ fontSize: 11, color: kind === 'SOCH' ? c.surface : c.ink2 }}>{dayMonth(point.date)}</Txt>
                {kind !== 'REGULAR' ? <Txt style={{ fontSize: 10, fontWeight: '800', color: ink }}>{label}</Txt> : null}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

/** Изменение к прошлому периоду; без сравнения — «Нет данных для сравнения» без числа. */
export function ChangeBadge({ metric }) {
  const { c } = useTheme();
  const badge = changeBadge(metric);
  const palette = {
    growth: { bg: c.successSoft, fg: c.success },
    decline: { bg: c.redSoft, fg: PHYSTECH.red },
    stable: { bg: c.bg2, fg: c.ink2 },
    neutral: { bg: c.bg2, fg: c.ink2 },
  }[badge.tone];
  return (
    <View style={{ backgroundColor: palette.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Txt style={{ fontSize: 13, fontWeight: '700', color: palette.fg }}>{badge.text}</Txt>
    </View>
  );
}

function BackLink({ label, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Назад: ${label}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 8 }}>
      <Icon name="chevronLeft" size={16} color={c.blueInk} />
      <Txt style={{ fontSize: 15, fontWeight: '600', color: c.blueInk }}>{label}</Txt>
    </Pressable>
  );
}

/**
 * Плитка «Динамика успеваемости · четверть» на главной родителя (Figma 2201:52702): средний,
 * изменение и мини-график того же ответа, что у полного экрана.
 */
export function GradeDynamicsHomeTile({ childId, onPress }) {
  const { c } = useTheme();
  const { data, loading } = useChildGradeDynamics(childId, 'QUARTER');
  const value = formatIndicator(data?.overall?.current);
  return (
    <Card onPress={onPress} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt style={{ fontSize: 13, color: c.ink2 }}>Динамика успеваемости · четверть</Txt>
        <Icon name="chevronRight" size={16} color={c.ink3} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt style={{ fontSize: 30, fontWeight: '800', color: c.blueInk }}>{loading && !data ? '…' : value ?? '—'}</Txt>
          {value != null ? <ChangeBadge metric={data.overall} /> : null}
        </View>
        <Sparkline values={(data?.series || []).map((p) => Number(p.value))} />
      </View>
      {!loading && value == null ? <Txt style={{ fontSize: 13, color: c.ink2 }}>За четверть оценок пока нет</Txt> : null}
    </Card>
  );
}
