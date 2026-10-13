import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { BOTTOM_CHROME_HEIGHT, Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useAuth } from '@features/auth/AuthContext';
import { useNotificationFeed } from '@shared/hooks/useNotificationCenter';
import { requestChildSelection } from '@shared/state/SelectedChild';
import { resolvePushTarget } from '@shared/push/routes';
import {
  contextTag, groupByDay, iconFor, pushDataFor, timeLabel,
} from '@shared/api/notificationCenterMap';

/**
 * Центр уведомлений (Figma phyztex «Уведомления», 1791:39738; ТЗ «Внутренние уведомления — Student / Parent» §8).
 *
 * Лента своего аккаунта, новые сверху и по дням. Непрочитанная строка — голубая с оранжевой точкой; нажатие
 * отмечает её прочитанной и ведёт туда же, куда пуш о том же событии: переход строится словарём маршрутов пуша, а не
 * своей таблицей. У родителя сначала выбирается ребёнок, о котором строка.
 *
 * Что попадает в ленту, решает бэк — экран не фильтрует по роли и не знает видов уведомлений, кроме иконки.
 */
export function NotificationsScreen({ nav }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { role, accountId } = useAuth();
  const feed = useNotificationFeed();
  const [refreshing, setRefreshing] = useState(false);
  const sections = useMemo(() => groupByDay(feed.items), [feed.items]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await feed.reload(true);
    setRefreshing(false);
  }, [feed]);

  const open = useCallback((item) => {
    feed.markRead(item);
    // `rootRoute` — любой непустой: экран уже внутри раздела роли, и навигация идёт по его стеку.
    const target = resolvePushTarget(pushDataFor(item, accountId), { role, accountId, rootRoute: 'self' });
    if (target.type !== 'open') return;
    if (target.childId != null) requestChildSelection(target.childId);
    if (target.screen) nav(target.screen, target.payload);
    else if (target.tab) nav.tabs(target.tab);
  }, [feed, role, accountId, nav]);

  const canReadAll = feed.unreadCount > 0 && feed.items.length > 0;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={feed.error || feed.loading ? undefined : onRefresh}
      contentStyle={{ paddingBottom: insets.bottom + BOTTOM_CHROME_HEIGHT }}
    >
      <Header
        onBack={() => nav.back()}
        onReadAll={canReadAll ? feed.markAllRead : null}
      />

      {feed.loading && !feed.items.length ? (
        <FeedSkeleton />
      ) : feed.error && !feed.items.length ? (
        <FeedError onRetry={() => feed.reload()} />
      ) : !feed.items.length ? (
        <FeedEmpty />
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 14 }}>
          {sections.map((section) => (
            <View key={section.key} style={{ gap: 8 }}>
              <Txt style={{ fontSize: 12, fontWeight: '700', color: c.ink2, paddingTop: 8, paddingBottom: 4, paddingLeft: 4 }}>
                {section.title}
              </Txt>
              {section.items.map((item) => (
                <NotificationCard key={item.id} item={item} onPress={() => open(item)} />
              ))}
            </View>
          ))}
          {feed.hasMore ? (
            <Pressable
              accessibilityRole="button"
              onPress={feed.loadMore}
              disabled={feed.loadingMore}
              style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 }}
            >
              {feed.loadingMore
                ? <ActivityIndicator color={c.blue} />
                : <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ntToneBlue }}>Показать ещё</Txt>}
            </Pressable>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

/** Шапка макета: квадратная «назад», крупный синий заголовок и текстовое «Прочитать все» справа. */
function Header({ onBack, onReadAll }) {
  const { c } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={onBack}
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: c.bg2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevronLeft" size={16} color={c.ntToneBlue} strokeWidth={2.4} />
        </Pressable>
        <Txt style={{ fontSize: 24, fontWeight: '800', color: c.blue }} numberOfLines={1}>Уведомления</Txt>
      </View>
      {onReadAll ? (
        <Pressable accessibilityRole="button" onPress={onReadAll} hitSlop={8}>
          <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ntToneBlue }}>Прочитать все</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function NotificationCard({ item, onPress }) {
  const { c } = useTheme();
  const { icon, tone } = iconFor(item.kind);
  const unread = !item.read;
  const tag = contextTag(item);
  const toneColor = {
    blue: c.ntToneBlue, orange: c.ntToneOrange, green: c.ntToneGreen, red: c.ntToneRed,
  }[tone] ?? c.ntToneBlue;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Непрочитано. ' : ''}${item.title}. ${item.body ?? ''}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: unread ? c.ntUnreadBorder : c.border,
        backgroundColor: unread ? c.ntUnreadBg : c.surface,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        backgroundColor: unread ? c.ntIconUnread : c.bg2,
      }}
      >
        <Icon name={icon} size={20} color={toneColor} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.ntUnreadDot }} /> : null}
          <Txt style={{ flex: 1, fontSize: 14, fontWeight: unread ? '700' : '600', color: c.ink }}>
            {item.title}
          </Txt>
        </View>
        {item.body ? (
          <Txt style={{ fontSize: 13, lineHeight: 18, color: c.ink2 }}>{item.body}</Txt>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 }}>
          <Txt style={{ fontSize: 11, fontWeight: '500', color: c.ink3 }}>{timeLabel(item.createdAt)}</Txt>
          {tag ? (
            <View style={{
              borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
              backgroundColor: unread ? c.ntTagBg : c.border,
            }}
            >
              <Txt style={{ fontSize: 10, fontWeight: '600', color: c.ntToneBlue }}>{tag}</Txt>
            </View>
          ) : null}
        </View>
      </View>

      <Icon name="chevronRight" size={16} color={c.ink3} />
    </Pressable>
  );
}

function FeedSkeleton() {
  const { c } = useTheme();
  const bar = (width, height) => ({ width, height, borderRadius: 4, backgroundColor: c.bg2 });
  return (
    <View accessibilityLabel="Загрузка уведомлений" style={{ paddingHorizontal: 16, paddingTop: 12, gap: 14 }}>
      <View style={{ paddingTop: 8, paddingBottom: 4 }}>
        <View style={[bar(80, 14), { backgroundColor: c.border }]} />
      </View>
      {[180, 140, 160].map((width) => (
        <View
          key={width}
          style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.surface }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg2 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={bar(width, 12)} />
            <View style={bar('100%', 10)} />
            <View style={bar(width / 2, 8)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function FeedEmpty() {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, gap: 16 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="bell" size={18} color={c.ink2} />
      </View>
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center' }}>Пока нет уведомлений</Txt>
        <Txt style={{ fontSize: 14, color: c.ink3, textAlign: 'center' }}>
          Здесь будут появляться ваши новые оповещения и важные события.
        </Txt>
      </View>
    </View>
  );
}

function FeedError({ onRetry }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 32, gap: 20 }}>
      <View style={{ width: 65, height: 65, borderRadius: 40, backgroundColor: c.redSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="alertTriangle" size={32} color={c.ntToneRed} />
      </View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center' }}>
          Не удалось загрузить уведомления
        </Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, textAlign: 'center' }}>
          Проверьте интернет-соединение и попробуйте еще раз.
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => ({
          backgroundColor: c.blue, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Txt style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Повторить</Txt>
      </Pressable>
    </View>
  );
}
