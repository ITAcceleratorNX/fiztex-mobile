import React from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Avatar, Pill, StateView } from '@shared/components/ui';
import { shadowCard } from '@shared/components/Screen';
import { problemLabel, stateMeta } from './equipmentModel';

/** Шапка раздела. Тот же приём, что у ключей: заголовок, счётчик и аватар с выходом. */
export function EquipmentHero({ title, subtitle, fullName, onAvatarPress, onBack }) {
  const { c } = useTheme();
  return (
    <View style={{ minHeight: 110, marginHorizontal: -16, marginTop: -4, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 22, backgroundColor: c.blue, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={onBack} hitSlop={10}>
            <Icon name="chevronLeft" size={24} color={c.heroInk} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt numberOfLines={1} style={{ fontSize: 19, fontWeight: '700', color: c.heroInk }}>{title}</Txt>
          {subtitle ? <Txt numberOfLines={1} style={{ marginTop: 3, fontSize: 12, color: c.heroInkSoft }}>{subtitle}</Txt> : null}
        </View>
        {onAvatarPress ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Меню аккаунта" onPress={onAvatarPress}>
            <Avatar name={fullName} size={38} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function EquipmentAccountMenu({ visible, onClose, onSignOut }) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'transparent' }} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation?.()} style={[{ position: 'absolute', top: 72, right: 16, width: 190, borderRadius: 14, padding: 8, backgroundColor: c.surface, ...shadowCard }, shadowCard]}>
          <Pressable accessibilityRole="button" onPress={onSignOut} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: pressed ? c.bg2 : c.surface })}>
            <Icon name="logOut" size={19} color={c.red} />
            <Txt style={{ fontSize: 14, fontWeight: '600', color: c.red }}>Выйти из аккаунта</Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Строка экземпляра. В режиме выбора нажатие отмечает, а не открывает: выбор нужен ровно
 * для выдачи пачкой (§7.2), и выдавать можно не всё — `issuable` приходит с сервера.
 */
export function EquipmentUnitRow({ unit, onPress, selectable = false, selected = false, onToggle, first = false, last = false }) {
  const { c } = useTheme();
  const problem = problemLabel(unit.problem);
  const state = stateMeta(unit.state);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unit.itemName || 'Позиция'}, инвентарный номер ${unit.inventoryNumber || ''}`}
      onPress={selectable ? onToggle : onPress}
      disabled={selectable && !unit.issuable}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        paddingHorizontal: 14,
        paddingVertical: 13,
        minHeight: 64,
        borderTopWidth: first ? 0 : 1,
        borderColor: c.border,
        borderTopLeftRadius: first ? 14 : 0,
        borderTopRightRadius: first ? 14 : 0,
        borderBottomLeftRadius: last ? 14 : 0,
        borderBottomRightRadius: last ? 14 : 0,
        backgroundColor: selected ? c.blueSoft : c.surface,
        opacity: selectable && !unit.issuable ? 0.55 : pressed ? 0.88 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {selectable ? (
          <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: selected ? 0 : 1, borderColor: c.borderStrong, backgroundColor: selected ? c.blue : c.surface, alignItems: 'center', justifyContent: 'center' }}>
            {selected ? <Icon name="check" size={13} color={c.heroInk} strokeWidth={3} /> : null}
          </View>
        ) : (
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: problem ? c.redSoft : c.blueSoft }}>
            <Icon name="laptop" size={20} color={problem ? c.red : c.blue} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: '700', color: c.ink }}>{unit.inventoryNumber || 'Без номера'}</Txt>
            {problem ? <Pill color="red">{problem}</Pill> : null}
            {!problem && unit.holder?.active === false ? <Pill color="gold">Неактивен</Pill> : null}
          </View>
          <Txt numberOfLines={1} style={{ fontSize: 12, color: c.inkMuted }}>
            {unit.state === 'ISSUED'
              ? `${unit.holder?.fullName || 'Выдано'}${unit.holder?.active === false ? ' · неактивен' : ''}`
              : unit.note || state.label}
          </Txt>
        </View>
        {!selectable ? <Icon name="chevronRight" size={18} color={c.ink3} /> : null}
      </View>
    </Pressable>
  );
}

/** Заголовок позиции над её экземплярами. */
export function EquipmentItemHeader({ item, first = false, empty = false }) {
  const { c } = useTheme();
  return (
    <View style={{ marginHorizontal: 16, marginTop: first ? 0 : 12, paddingHorizontal: 14, paddingTop: 13, paddingBottom: empty ? 13 : 9, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: empty ? 14 : 0, borderBottomRightRadius: empty ? 14 : 0, backgroundColor: c.surface }}>
      <Txt numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{item.name || 'Без названия'}</Txt>
      {item.note ? <Txt numberOfLines={1} style={{ marginTop: 3, fontSize: 12, color: c.inkMuted }}>{item.note}</Txt> : null}
    </View>
  );
}

export function EquipmentLoading({ label = 'Загружаем технику…' }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="progressbar" style={{ padding: 28, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={c.blue} />
      <Txt style={{ fontSize: 13, color: c.inkMuted }}>{label}</Txt>
      {[0, 1, 2].map((value) => <View key={value} style={{ width: '100%', height: 64, borderRadius: 14, backgroundColor: c.bg2 }} />)}
    </View>
  );
}

export function EquipmentState({ kind, error, onRetry, subtitle }) {
  if (kind === 'error') {
    return (
      <StateView
        icon="alertTriangle"
        tone="error"
        title="Не удалось загрузить технику"
        subtitle={error}
        actionLabel="Повторить"
        onAction={onRetry}
        style={{ paddingTop: 56 }}
      />
    );
  }
  return (
    <StateView
      icon="inbox"
      title="Здесь пока пусто"
      subtitle={subtitle || 'Добавьте позицию — например «Ноутбук Lenovo ThinkPad» — и её экземпляры.'}
      style={{ paddingTop: 56 }}
    />
  );
}

/** Лист действий над экземпляром. Состав приходит из `unitActions`, а не собирается тут. */
export function EquipmentActionsSheet({ visible, actions, onClose, onSelect }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: c.modalBackdrop }} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation?.()} style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: Math.max(20, insets.bottom + 12), backgroundColor: c.surface }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, marginBottom: 14, borderRadius: 2, backgroundColor: c.borderStrong }} />
          <Txt style={{ marginBottom: 8, fontSize: 17, fontWeight: '700', color: c.ink }}>Действия с экземпляром</Txt>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              onPress={() => { onClose(); onSelect(action.key); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 8, borderRadius: 10, backgroundColor: pressed ? c.bg2 : c.surface })}
            >
              <Icon name={action.icon} size={20} color={action.danger ? c.red : c.blue} />
              <Txt style={{ fontSize: 15, fontWeight: '600', color: action.danger ? c.red : c.ink }}>{action.label}</Txt>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
