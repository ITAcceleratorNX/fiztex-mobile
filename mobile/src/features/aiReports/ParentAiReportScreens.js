import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { ScreenHeader, StateView } from '@shared/components/ui';
import { ChildSwitcherPill, ChildPickerSheet } from '@shared/ui/childSwitcher';
import { useParentChildren } from '@shared/hooks/useSchedule';
import { useSelectedChild } from '@shared/state/SelectedChild';
import { useChildAiReport, useChildAiReports, useSeenAiReports } from '@shared/hooks/useAiReports';
import {
  isNew, parentBlocks, periodRange, publishedLine, publishedShort, reportHeading, excerpt,
} from '@shared/api/aiReportMap';
import { SurfaceCard } from '@features/home/HomeParts';

/**
 * Сводки об учёбе у родителя (ТЗ «AI-отчётность — Frontend» §8, Figma М1–М9). Только чтение: ни
 * черновиков, ни внутреннего отчёта учителя, ни действий — их сервер родителю и не отдаёт.
 */

function NewBadge() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: c.blueSoft }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.blue }} />
      <Txt style={{ fontSize: 12, fontWeight: '600', color: c.blue }}>Новая</Txt>
    </View>
  );
}

function useChildChoice(preferredId) {
  const { children, loading, error, reload } = useParentChildren();
  const { childId, setChildId } = useSelectedChild(children);
  // Из уведомления — сразу тот ребёнок, о котором оно (ТЗ §8).
  useEffect(() => {
    if (preferredId != null && preferredId !== childId && children.some((item) => item.id === preferredId)) setChildId(preferredId);
  }, [children, childId, preferredId, setChildId]);
  const [picker, setPicker] = useState(false);
  const child = children.find((item) => item.id === childId) || null;
  const switcher = child ? <ChildSwitcherPill child={child} index={children.indexOf(child)} canSwitch={children.length > 1} onPress={() => setPicker(true)} /> : null;
  const sheet = <ChildPickerSheet visible={picker} items={children} selectedId={childId}
    onSelect={(id) => { setChildId(id); setPicker(false); }} onClose={() => setPicker(false)} />;
  return { childId, child, switcher, sheet, loading, error, reload };
}

/** Все сводки выбранного ребёнка (М5–М7, М9): новые сверху. */
export function ParentAiReportsScreen({ nav, payload }) {
  const { c } = useTheme();
  const choice = useChildChoice(payload?.childId ?? null);
  const reports = useChildAiReports(choice.childId);
  const { seen } = useSeenAiReports();
  return (
    <>
      <Screen refreshing={reports.loading && reports.items.length > 0} onRefresh={() => void reports.reload(true)}
        contentStyle={{ paddingHorizontal: 16, gap: 12 }}>
        <ScreenHeader title="Сводки об учёбе" back={() => nav?.back?.()} />
        {choice.switcher}
        {!choice.childId ? (
          <StateView title={choice.loading ? 'Загрузка…' : choice.error || 'Дети не привязаны'}
            actionLabel={choice.error ? 'Повторить' : undefined} onAction={choice.reload} />
        ) : reports.error ? (
          <StateView icon="alert" tone="error" title="Не удалось загрузить сводки" subtitle="Проверьте интернет и попробуйте ещё раз."
            actionLabel="Повторить" onAction={() => void reports.reload()} />
        ) : !reports.loaded ? (
          <StateView title="Загрузка…" />
        ) : reports.items.length === 0 ? (
          <StateView icon="fileText" tone="brand" title="Сводок пока нет"
            subtitle="Когда учитель проверит и опубликует сводку об учёбе, она появится здесь, а мы пришлём уведомление." />
        ) : reports.items.map((item) => (
          <Pressable key={item.reportId} accessibilityRole="button" accessibilityLabel={reportHeading(item)}
            onPress={() => nav?.('ai-report', { reportId: item.reportId, childId: choice.childId })}>
            <SurfaceCard radius={16} padding={14} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt style={{ flex: 1, fontSize: 15, fontWeight: '700', color: c.ink }}>{reportHeading(item)}</Txt>
                {isNew(item, seen) ? <NewBadge /> : <Icon name="chevronRight" size={18} color={c.inkMuted} />}
              </View>
              <Txt numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, color: c.inkMuted }}>{excerpt(item.text, 120)}</Txt>
              <Txt style={{ fontSize: 12, color: c.inkMuted }}>{publishedShort(item.publishedAt)}{item.authorName ? ` · ${item.authorName}` : ''}</Txt>
            </SurfaceCard>
          </Pressable>
        ))}
      </Screen>
      {choice.sheet}
    </>
  );
}

/** Одна сводка (М3, М4); снятая — «Сводка больше недоступна» (М8). Открытие снимает «Новая». */
export function ParentAiReportScreen({ nav, payload }) {
  const { c } = useTheme();
  const childId = payload?.childId ?? null;
  const reportId = payload?.reportId ?? null;
  const choice = useChildChoice(childId);
  const report = useChildAiReport(childId ?? choice.childId, reportId);
  const { markSeen } = useSeenAiReports();
  const data = report.data;
  useEffect(() => { if (data) void markSeen(data); }, [data, markSeen]);
  const blocks = parentBlocks(data?.text);

  return (
    <Screen contentStyle={{ paddingHorizontal: 16, gap: 12 }}>
      <ScreenHeader title="Сводка об учёбе" back={() => nav?.back?.()} />
      {choice.child && (childId == null || choice.childId === childId)
        ? <ChildSwitcherPill child={choice.child} canSwitch={false} /> : null}
      {report.loading ? <StateView title="Загрузка…" /> : report.gone ? (
        <StateView icon="fileText" title="Сводка больше недоступна"
          subtitle="Учитель снял её с публикации. Остальные сводки — в списке."
          actionLabel="Все сводки" onAction={() => nav?.('teacher-feed', { childId, filter: 'report' })} />
      ) : report.error || !data ? (
        <StateView icon="alert" tone="error" title="Не удалось загрузить сводку" subtitle="Проверьте интернет и попробуйте ещё раз."
          actionLabel="Повторить" onAction={report.reload} />
      ) : (
        <>
          <View style={{ gap: 2 }}>
            <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>{reportHeading(data)}</Txt>
            <Txt style={{ fontSize: 13, color: c.inkMuted }}>{periodRange(data.period)}</Txt>
          </View>
          <SurfaceCard radius={16} padding={16} style={{ gap: 14 }}>
            {blocks.map((block, index) => (
              <View key={`${block.title}-${index}`} style={{ gap: 6, paddingTop: index ? 14 : 0, borderTopWidth: index ? 1 : 0, borderTopColor: c.border }}>
                {block.title ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name={block.icon} size={16} color={c.ink} strokeWidth={2} />
                    <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{block.title}</Txt>
                  </View>
                ) : null}
                {block.paragraphs.map((paragraph, i) => (
                  <Txt key={i} style={{ fontSize: 14, lineHeight: 20, color: c.ink }}>{paragraph}</Txt>
                ))}
              </View>
            ))}
          </SurfaceCard>
          <Txt style={{ fontSize: 12, lineHeight: 17, color: c.inkMuted }}>
            {publishedLine(data)}
            {'\n'}Текст подготовлен с помощью AI и проверен учителем перед публикацией.
          </Txt>
        </>
      )}
    </Screen>
  );
}
