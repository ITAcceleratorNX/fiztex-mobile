import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, TAB_BAR_HEIGHT, shadowLg } from '@shared/components/Screen';
import { FilledButton, Pill, TextField } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useEquipmentDashboard } from '@shared/hooks/useEquipment';
import {
  EquipmentHero,
  EquipmentItemHeader,
  EquipmentLoading,
  EquipmentState,
  EquipmentUnitRow,
} from './EquipmentParts';

const MAX_SELECTION = 50;

function buildRows(items) {
  const rows = [];
  items.forEach((item, itemIndex) => {
    const units = item.units ?? [];
    rows.push({ kind: 'item', key: `item-${item.id}`, item, first: itemIndex === 0, empty: units.length === 0 });
    units.forEach((unit, index) => rows.push({
      kind: 'unit', key: `unit-${unit.id}`, item, unit, last: index === units.length - 1,
    }));
  });
  return rows;
}

/**
 * Вкладки «В наличии» и «Выдано» — один экран с разным `state` (ТЗ §9).
 *
 * <p>Галочки есть только на «В наличии»: выбор нужен ровно для выдачи пачкой (§7.2), а
 * возврат, передача и списание живут в карточке экземпляра — там у них есть подтверждение
 * и история.
 */
export function EquipmentListScreen({ nav, payload, state = 'IN_STOCK' }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const dashboard = useEquipmentDashboard(state);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [selectionError, setSelectionError] = useState(null);
  const [success, setSuccess] = useState(payload?.success || null);
  const data = useMemo(() => buildRows(dashboard.data?.items ?? []), [dashboard.data]);
  const issued = state === 'ISSUED';

  function toggle(unit) {
    setSelectionError(null);
    setSelected((current) => {
      if (current.includes(unit.id)) return current.filter((id) => id !== unit.id);
      if (current.length >= MAX_SELECTION) {
        setSelectionError(`За одну операцию можно выдать не больше ${MAX_SELECTION} экземпляров.`);
        return current;
      }
      return [...current, unit.id];
    });
  }

  function leaveSelection() {
    setSelecting(false);
    setSelected([]);
    setSelectionError(null);
  }

  const listHeader = (
    <View style={{ gap: 14, paddingBottom: 12 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <EquipmentHero
          title={issued ? 'Выданная техника' : 'Техника в наличии'}
          subtitle={`${dashboard.data?.summary?.total ?? 0} в выбранном разделе`}
        />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {success ? (
          <Pressable onPress={() => setSuccess(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 11, backgroundColor: c.successSoft }}>
            <Icon name="check" size={17} color={c.success} strokeWidth={2.5} />
            <Txt style={{ flex: 1, fontSize: 12, fontWeight: '600', color: c.success }}>{success}</Txt>
            <Icon name="x" size={15} color={c.success} />
          </Pressable>
        ) : null}
        <View>
          <TextField
            value={dashboard.query}
            onChangeText={dashboard.setQuery}
            placeholder="Поиск по позиции, номеру или сотруднику"
            returnKeyType="search"
            inputStyle={{ height: 44, paddingLeft: 42 }}
          />
          <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 13 }}>
            <Icon name="search" size={18} color={c.ink3} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: dashboard.problemOnly }}
            onPress={() => dashboard.setProblemOnly((value) => !value)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Pill color={dashboard.problemOnly ? 'red' : 'gray'}><Icon name="alertTriangle" size={13} /> С проблемой</Pill>
          </Pressable>
          {issued ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: dashboard.holderInactiveOnly }}
              onPress={() => dashboard.setHolderInactiveOnly((value) => !value)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Pill color={dashboard.holderInactiveOnly ? 'gold' : 'gray'}>У неактивных</Pill>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={selecting ? leaveSelection : () => setSelecting(true)} style={{ marginLeft: 'auto', padding: 6 }}>
              <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>{selecting ? 'Отменить' : 'Выдать технику'}</Txt>
            </Pressable>
          )}
        </View>
        {selectionError ? <Txt accessibilityRole="alert" style={{ fontSize: 12, color: c.red }}>{selectionError}</Txt> : null}
      </View>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={dashboard.loading ? [] : data}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.kind === 'item' ? (
          <EquipmentItemHeader item={item.item} first={item.first} empty={item.empty} />
        ) : (
          <EquipmentUnitRow
            unit={item.unit}
            last={item.last}
            selectable={selecting}
            selected={selected.includes(item.unit.id)}
            onToggle={() => toggle(item.unit)}
            onPress={() => nav?.('equipment-detail', { unitId: item.unit.id })}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={dashboard.loading ? (
          <EquipmentLoading label={issued ? 'Загружаем выданную технику…' : 'Загружаем технику…'} />
        ) : dashboard.error ? (
          <EquipmentState kind="error" error={dashboard.error} onRetry={() => dashboard.reload()} />
        ) : (
          <EquipmentState
            kind="empty"
            subtitle={issued ? 'Здесь появится техника, выданная сотрудникам.' : undefined}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + (selecting ? 86 : 24), flexGrow: 1 }}
        refreshing={dashboard.refreshing}
        onRefresh={dashboard.refresh}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={18}
        maxToRenderPerBatch={20}
        windowSize={9}
      />

      {selecting ? (
        <View style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + TAB_BAR_HEIGHT + 8, padding: 10, borderRadius: 18, backgroundColor: c.surface, ...shadowLg }, shadowLg]}>
          <FilledButton disabled={selected.length === 0} onPress={() => nav?.('equipment-recipient', { mode: 'issue', unitIds: selected })}>
            {selected.length ? `Выдать · ${selected.length}` : 'Выберите экземпляры'}
          </FilledButton>
        </View>
      ) : !issued ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить позицию"
          onPress={() => nav?.('equipment-form')}
          style={({ pressed }) => ({ position: 'absolute', right: 24, bottom: insets.bottom + TAB_BAR_HEIGHT + 18, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: c.green, opacity: pressed ? 0.9 : 1, ...shadowLg })}
        >
          <Icon name="plus" size={25} color={c.heroInk} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

export function EquipmentStockScreen(props) {
  return <EquipmentListScreen {...props} state="IN_STOCK" />;
}

export function EquipmentIssuedScreen(props) {
  return <EquipmentListScreen {...props} state="ISSUED" />;
}
