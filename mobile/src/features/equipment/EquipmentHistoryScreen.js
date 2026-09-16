import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/AuthContext';
import { Screen, TAB_BAR_HEIGHT } from '@shared/components/Screen';
import { PickerSheet, Pill, StateView } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useEquipmentHistory } from '@shared/hooks/useEquipment';
import { EquipmentAccountMenu, EquipmentHero, EquipmentLoading } from './EquipmentParts';
import {
  actionMeta,
  collapseEvents,
  eventEmployee,
  formatEquipmentDate,
  historyGroupTitle,
  HISTORY_ACTIONS,
} from './equipmentModel';

/**
 * История модуля (ТЗ §7.7, §9). Пакетная команда пишет событие на каждый экземпляр —
 * лента сворачивает их обратно в одно действие по `operationId`.
 */
export function EquipmentHistoryScreen({ onSignOut }) {
  const { c } = useTheme();
  const { fullName } = useAuth();
  const insets = useSafeAreaInsets();
  const [action, setAction] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const history = useEquipmentHistory(action);
  const groups = useMemo(() => collapseEvents(history.rows), [history.rows]);

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <EquipmentHero
          title="История техники"
          subtitle="Все операции в хронологическом порядке"
          fullName={fullName}
          onAvatarPress={() => setMenuOpen(true)}
        />
      </View>
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(true)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, height: 38, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.8 : 1 })}>
          <Icon name="filter" size={16} color={c.blue} />
          <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink }}>
            {HISTORY_ACTIONS.find((item) => item.value === action)?.label}
          </Txt>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={header}
        renderItem={({ item: group }) => {
          const event = group.first;
          const meta = actionMeta(event.action);
          const employee = eventEmployee(event);
          return (
            <View style={{ marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <Pill color={meta.color}>{meta.label}</Pill>
                <Txt style={{ fontSize: 11, color: c.ink3 }}>{formatEquipmentDate(event.createdAt)}</Txt>
              </View>
              <Txt numberOfLines={1} style={{ marginTop: 10, fontSize: 14, fontWeight: '700', color: c.ink }}>
                {historyGroupTitle(group)}
              </Txt>
              {employee ? (
                <Txt numberOfLines={1} style={{ marginTop: 4, fontSize: 12, color: c.ink2 }}>{employee}</Txt>
              ) : null}
              {event.comment ? (
                <Txt numberOfLines={2} style={{ marginTop: 4, fontSize: 12, color: c.inkMuted }}>{event.comment}</Txt>
              ) : null}
              <Txt numberOfLines={1} style={{ marginTop: 6, fontSize: 11, color: c.inkMuted }}>
                {event.actor?.fullName ? `Операцию выполнил: ${event.actor.fullName}` : 'Системное событие'}
              </Txt>
            </View>
          );
        }}
        ListEmptyComponent={history.loading ? (
          <EquipmentLoading label="Загружаем историю…" />
        ) : history.error ? (
          <StateView icon="alertTriangle" tone="error" title="Не удалось загрузить историю" subtitle={history.error} actionLabel="Повторить" onAction={history.reload} style={{ paddingTop: 56 }} />
        ) : (
          <StateView icon="history" title="История пока пуста" subtitle="Здесь появятся выдача, возврат, проблемы и списание." style={{ paddingTop: 56 }} />
        )}
        ListFooterComponent={history.rows.length > 0 && history.loading ? (
          <ActivityIndicator color={c.blue} style={{ margin: 18 }} />
        ) : history.rows.length > 0 && history.error ? (
          <Pressable onPress={history.refresh} style={{ alignItems: 'center', padding: 16 }}>
            <Txt style={{ color: c.red }}>Не удалось продолжить. Обновить историю</Txt>
          </Pressable>
        ) : null}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24 }}
        onEndReached={history.loadMore}
        onEndReachedThreshold={0.45}
        refreshing={history.refreshing}
        onRefresh={history.refresh}
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={8}
      />
      <PickerSheet
        visible={filtersOpen}
        title="Показывать"
        options={HISTORY_ACTIONS}
        value={action}
        onSelect={(value) => { setAction(value); setFiltersOpen(false); }}
        onClose={() => setFiltersOpen(false)}
      />
      <EquipmentAccountMenu visible={menuOpen} onClose={() => setMenuOpen(false)} onSignOut={onSignOut} />
    </Screen>
  );
}
