import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/AuthContext';
import { Screen, TAB_BAR_HEIGHT, shadowLg } from '@shared/components/Screen';
import { FilledButton, Pill, TextField } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useKeysDashboard } from '@shared/hooks/useKeys';
import { useMyEquipment } from '@shared/hooks/useEquipment';
import { MyEquipmentCard } from '@features/equipment/MyEquipmentCard';
import { AccountMenu, GroupHeader, KeysHero, KeysLoading, KeysState, KeyUnitRow } from './KeyParts';

function buildRows(groups) {
  const rows = [];
  groups.forEach((group, groupIndex) => {
    const units = group.units ?? [];
    rows.push({ kind: 'group', key: `group-${group.id}`, group, first: groupIndex === 0, empty: units.length === 0 });
    units.forEach((unit, index) => rows.push({
      kind: 'unit', key: `unit-${unit.id}`, group, unit, first: index === 0, last: index === units.length - 1,
    }));
  });
  return rows;
}

export function SecurityKeysScreen({ nav, onSignOut, payload, state = 'ON_POST' }) {
  const { c } = useTheme();
  const { fullName } = useAuth();
  const insets = useSafeAreaInsets();
  const dashboard = useKeysDashboard(state);
  // «Моя техника» охранника (ТЗ «Техника и инвентарь» §10): рация и фонарь числятся за
  // ним так же, как за любым сотрудником, а своего профиля у этой роли в приложении нет.
  const myEquipment = useMyEquipment();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [selectionError, setSelectionError] = useState(null);
  const [success, setSuccess] = useState(payload?.success || null);
  const data = useMemo(() => buildRows(dashboard.data?.groups ?? []), [dashboard.data]);
  const issued = state === 'ISSUED';

  function toggle(unit) {
    setSelectionError(null);
    setSelected((current) => {
      if (current.includes(unit.id)) return current.filter((id) => id !== unit.id);
      if (current.length >= 50) {
        setSelectionError('За одну операцию можно выдать не больше 50 ключей.');
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
        <KeysHero
          title={issued ? 'Выданные ключи' : 'Ключи на посту'}
          subtitle={`${dashboard.data?.summary?.total ?? 0} в выбранном разделе`}
          fullName={fullName}
          onAvatarPress={() => setMenuOpen(true)}
        />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {!issued ? <MyEquipmentCard rows={myEquipment.rows} /> : null}
        {success ? (
          <Pressable onPress={() => setSuccess(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 11, backgroundColor: c.successSoft }}>
            <Icon name="check" size={17} color={c.success} strokeWidth={2.5} />
            <Txt style={{ flex: 1, fontSize: 12, fontWeight: '600', color: c.success }}>{success}</Txt>
            <Icon name="x" size={15} color={c.success} />
          </Pressable>
        ) : null}
        <View>
          <TextField value={dashboard.query} onChangeText={dashboard.setQuery} placeholder="Поиск по объекту, ключу или сотруднику" returnKeyType="search" inputStyle={{ height: 44, paddingLeft: 42 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 13 }}><Icon name="search" size={18} color={c.ink3} /></View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: dashboard.problemOnly }} onPress={() => dashboard.setProblemOnly((value) => !value)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <Pill color={dashboard.problemOnly ? 'red' : 'gray'}><Icon name="alertTriangle" size={13} /> Только с проблемой</Pill>
          </Pressable>
          {issued ? (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: dashboard.holderInactiveOnly }} onPress={() => dashboard.setHolderInactiveOnly((value) => !value)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <Pill color={dashboard.holderInactiveOnly ? 'gold' : 'gray'}>У неактивных</Pill>
            </Pressable>
          ) : null}
          {!issued ? (
            <Pressable accessibilityRole="button" onPress={selecting ? leaveSelection : () => setSelecting(true)} style={{ marginLeft: 'auto', padding: 6 }}>
              <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>{selecting ? 'Отменить' : 'Выдать ключи'}</Txt>
            </Pressable>
          ) : null}
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
        renderItem={({ item }) => item.kind === 'group' ? (
      <GroupHeader group={item.group} first={item.first} empty={item.empty} />
        ) : (
          <KeyUnitRow
            unit={item.unit}
            first={false}
            last={item.last}
            selectable={selecting}
            selected={selected.includes(item.unit.id)}
            onToggle={() => toggle(item.unit)}
            onPress={() => nav?.('key-detail', { unitId: item.unit.id, group: item.group })}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={dashboard.loading ? <KeysLoading label={issued ? 'Загружаем выданные ключи…' : 'Загружаем ключи на посту…'} /> : dashboard.error ? <KeysState kind="error" error={dashboard.error} onRetry={() => dashboard.reload()} /> : <KeysState kind="empty" />}
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
          <FilledButton disabled={selected.length === 0} onPress={() => nav?.('key-recipient', { mode: 'issue', unitIds: selected })}>
            {selected.length ? `Выдать · ${selected.length}` : 'Выберите ключи'}
          </FilledButton>
        </View>
      ) : !issued ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Добавить объект" onPress={() => nav?.('key-group-form')} style={({ pressed }) => ({ position: 'absolute', right: 24, bottom: insets.bottom + TAB_BAR_HEIGHT + 18, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: c.green, opacity: pressed ? 0.9 : 1, ...shadowLg })}>
          <Icon name="plus" size={25} color={c.heroInk} strokeWidth={2.5} />
        </Pressable>
      ) : null}

      <AccountMenu visible={menuOpen} onClose={() => setMenuOpen(false)} onSignOut={onSignOut} />
    </Screen>
  );
}

export function SecurityOnPostScreen(props) {
  return <SecurityKeysScreen {...props} state="ON_POST" />;
}

export function SecurityIssuedScreen(props) {
  return <SecurityKeysScreen {...props} state="ISSUED" />;
}
