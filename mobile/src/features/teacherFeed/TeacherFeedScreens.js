import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { ScreenHeader, ScrollTabs, StateView } from '@shared/components/ui';
import { ChildPickerSheet, ChildSwitcherPill } from '@shared/ui/childSwitcher';
import { useParentChildren } from '@shared/hooks/useSchedule';
import { useSelectedChild } from '@shared/state/SelectedChild';
import { useTeacherFeed } from '@shared/hooks/useTeacherFeed';
import { useChildMonthlyFeedback } from '@shared/hooks/useMonthlyFeedback';
import { useSeenAiReports } from '@shared/hooks/useAiReports';
import { FEED_FILTERS, FEED_KINDS, filterFeed, monthSeenKey, newCount, newLabel } from '@shared/api/teacherFeedMap';
import { SurfaceCard } from '@features/home/HomeParts';
import { MonthlyFeedbackBlock } from '@features/home/MonthlyFeedbackBlock';

/**
 * «От учителей» у родителя: сводки об учёбе, отзывы за месяц и комментарии к урокам одной лентой.
 * Каждая строка открывает свой прежний экран — у сводки, месяца и комментария разные правила
 * (публикация, анализ, «прочитано»), и лента их не повторяет, а только собирает.
 */

const HOME_ROWS = 3;

function NewDot({ label }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: c.blueSoft }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.blue }} />
      <Txt style={{ fontSize: 12, fontWeight: '600', color: c.blue }}>{label}</Txt>
    </View>
  );
}

function KindIcon({ kind, size = 32 }) {
  const { c } = useTheme();
  const meta = FEED_KINDS[kind];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c[`${meta.tone}Soft`], alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={meta.icon} size={size / 2} color={c[meta.tone]} strokeWidth={2} />
    </View>
  );
}

/** Куда ведёт строка: экран своего источника, с ребёнком. Месяц помечается прочитанным сразу. */
function useOpenItem(nav, childId, markSeenKey) {
  return (item) => {
    if (item.seenKey) void markSeenKey(item.seenKey);
    nav?.(item.target.screen, { ...item.target.params, childId });
  };
}

/** Карточка на главной: три последних сообщения любого вида и число новых. */
export function TeacherFeedHomeCard({ childId, nav }) {
  const { c } = useTheme();
  const feed = useTeacherFeed(childId);
  const open = useOpenItem(nav, childId, feed.markSeenKey);
  const rows = feed.items.slice(0, HOME_ROWS);
  const fresh = newCount(feed.items);
  const openFeed = () => nav?.('teacher-feed', { childId });

  return (
    <SurfaceCard radius={16} padding={14} style={{ gap: 10, borderWidth: fresh ? 1 : 0, borderColor: c.blue }}>
      <Pressable accessibilityRole="button" accessibilityLabel="От учителей, все сообщения" onPress={openFeed}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="users" size={18} color={c.blue} strokeWidth={2} />
        </View>
        <Txt style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.ink }}>От учителей</Txt>
        {fresh ? <NewDot label={newLabel(fresh)} /> : null}
        <Icon name="chevronRight" size={20} color={c.ink3} strokeWidth={2} />
      </Pressable>

      {rows.length === 0 ? (
        <Txt style={{ fontSize: 13, color: feed.error ? c.red : c.inkMuted }}>
          {feed.loading ? 'Загрузка…' : feed.error || 'Сводки, отзывы и комментарии учителей появятся здесь'}
        </Txt>
      ) : rows.map((item, index) => (
        <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`${FEED_KINDS[item.kind].label}: ${item.title}`}
          onPress={() => open(item)}
          style={{ flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border }}>
          <KindIcon kind={item.kind} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.ink }}>{item.title}</Txt>
              {item.isNew ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.blue }} /> : null}
            </View>
            <Txt numberOfLines={1} style={{ fontSize: 13, color: c.inkMuted }}>{item.text}</Txt>
          </View>
        </Pressable>
      ))}

      {feed.items.length > HOME_ROWS ? (
        <Pressable onPress={openFeed} hitSlop={8} accessibilityRole="button" accessibilityLabel="Все сообщения учителей">
          <Txt style={{ fontSize: 13, fontWeight: '600', color: c.blue }}>Все · {feed.items.length}</Txt>
        </Pressable>
      ) : null}
    </SurfaceCard>
  );
}

function useChildChoice(preferredId) {
  const { children, loading, error, reload } = useParentChildren();
  const { childId, setChildId } = useSelectedChild(children);
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

const EMPTY = {
  all: 'Когда учитель опубликует сводку, отзывы за месяц или оставит комментарий к уроку, они появятся здесь.',
  report: 'Учителя ещё не публиковали сводок об учёбе.',
  month: 'Отзывов за месяц пока нет.',
  comment: 'Комментариев к урокам пока нет.',
};

/** Вся лента выбранного ребёнка с фильтром по виду. */
export function ParentTeacherFeedScreen({ nav, payload }) {
  const { c } = useTheme();
  const choice = useChildChoice(payload?.childId ?? null);
  const feed = useTeacherFeed(choice.childId);
  const open = useOpenItem(nav, choice.childId, feed.markSeenKey);
  const [filter, setFilter] = useState(payload?.filter || 'all');
  const rows = filterFeed(feed.items, filter);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await feed.reload(true); } finally { setRefreshing(false); } }}
        contentStyle={{ paddingHorizontal: 16, gap: 12 }}>
        <ScreenHeader title="От учителей" back={() => nav?.back?.()} />
        {choice.switcher}
        <ScrollTabs value={filter} options={FEED_FILTERS} onChange={setFilter} />
        {feed.error ? (
          <Txt style={{ fontSize: 13, color: c.red }} onPress={() => void feed.reload(false)}>{feed.error}. Нажмите, чтобы повторить.</Txt>
        ) : null}
        {!choice.childId ? (
          <StateView title={choice.loading ? 'Загрузка…' : choice.error || 'Дети не привязаны'}
            actionLabel={choice.error ? 'Повторить' : undefined} onAction={choice.reload} />
        ) : feed.loading && feed.items.length === 0 ? (
          <StateView title="Загрузка…" />
        ) : rows.length === 0 ? (
          <StateView icon="users" tone="brand" title="Пока ничего нет" subtitle={EMPTY[filter]} />
        ) : rows.map((item) => (
          <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`${FEED_KINDS[item.kind].label}: ${item.title}`}
            onPress={() => open(item)}>
            <SurfaceCard radius={16} padding={14} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KindIcon kind={item.kind} size={28} />
                <Txt style={{ flex: 1, fontSize: 12, fontWeight: '600', color: c.inkMuted }}>{FEED_KINDS[item.kind].label}</Txt>
                {item.isNew ? <NewDot label="Новое" /> : <Icon name="chevronRight" size={18} color={c.inkMuted} />}
              </View>
              <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{item.title}</Txt>
              {item.text ? <Txt numberOfLines={3} style={{ fontSize: 14, lineHeight: 20, color: c.ink2 }}>{item.text}</Txt> : null}
              {item.meta ? <Txt style={{ fontSize: 12, color: c.inkMuted }}>{item.meta}</Txt> : null}
            </SurfaceCard>
          </Pressable>
        ))}
        {/* В ленте — первая страница комментариев; вся история с фильтром по предмету — в их разделе. */}
        {feed.hasMoreComments && (filter === 'all' || filter === 'comment') ? (
          <Pressable onPress={() => nav?.('teacher-comments', { childId: choice.childId })} accessibilityRole="button"
            style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Txt style={{ fontSize: 14, fontWeight: '600', color: c.blue }}>Все комментарии к урокам</Txt>
          </Pressable>
        ) : null}
      </Screen>
      {choice.sheet}
    </>
  );
}

/**
 * Отзывы за месяц своим экраном — прежний блок главной (вкладки предметов, листание месяцев,
 * AI-анализ) переехал сюда целиком: на главной вместо него карточка ленты.
 */
export function ParentMonthlyFeedbackScreen({ nav, payload }) {
  const choice = useChildChoice(payload?.childId ?? null);
  const feedback = useChildMonthlyFeedback(choice.childId, payload?.month ?? null);
  const { markSeenKey } = useSeenAiReports();
  const view = feedback.view;
  useEffect(() => {
    if (view?.month) void markSeenKey(monthSeenKey({ month: view.month, publishedCount: view.coverage?.publishedSubjects }));
  }, [view, markSeenKey]);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); try { await feedback.reload(); } finally { setRefreshing(false); } }}
        contentStyle={{ paddingHorizontal: 16, gap: 12 }}>
        <ScreenHeader title="Отзывы за месяц" back={() => nav?.back?.()} />
        {choice.switcher}
        {choice.childId ? <MonthlyFeedbackBlock feedback={feedback} showTitle={false} /> : (
          <StateView title={choice.loading ? 'Загрузка…' : choice.error || 'Дети не привязаны'} />
        )}
      </Screen>
      {choice.sheet}
    </>
  );
}
