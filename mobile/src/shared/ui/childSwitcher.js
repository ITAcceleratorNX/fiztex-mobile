import React from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';

/*
 * Переключатель ребёнка — общий для расписания, заданий и оценок: у родителя это одна и
 * та же шапка на всех разделах, и три её копии разошлись бы в подписях и цветах.
 *
 * Figma cycles a fixed palette across the child rows so siblings stay
 * distinguishable at a glance (nodes 2022:13440…13471).
 */
const CHILD_COLORS = ['#274185', '#FB923C', '#10B981', '#8B5CF6', '#EC4899'];

export function childColor(index) {
  return CHILD_COLORS[index % CHILD_COLORS.length];
}

/**
 * Name parts, preferring the API fields and falling back to parsing
 * «Фамилия Имя …». A single-word name is treated as the given name only, so it
 * never renders doubled («Ким Ким»).
 */
function nameParts(child) {
  const parts = String(child?.fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = child?.firstName || (parts.length > 1 ? parts[1] : parts[0]) || '';
  const lastName = child?.lastName || (parts.length > 1 ? parts[0] : '') || '';
  return { firstName, lastName };
}

/** «Арсен И.» — the pill label in the design shows Имя + инициал фамилии. */
export function childShortLabel(child) {
  const { firstName, lastName } = nameParts(child);
  if (!firstName) return 'Ребёнок';
  return lastName ? `${firstName} ${lastName[0]}.` : firstName;
}

/** «Арсен Иванов» — the picker row shows Имя Фамилия. */
export function childFullLabel(child) {
  const { firstName, lastName } = nameParts(child);
  return [firstName, lastName].filter(Boolean).join(' ') || 'Ребёнок';
}

export function childInitials(child) {
  const { firstName, lastName } = nameParts(child);
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';
}

function InitialsBadge({ child, color, width, height, radius, fontSize }) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
      }}
    >
      <Txt style={{ fontSize, fontWeight: '700', color: '#fff' }}>{childInitials(child)}</Txt>
    </View>
  );
}

/**
 * Figma `child-switcher-pill` (node 2022:13102) — sits under the screen title.
 * The chevron only appears when there is more than one child to switch to.
 */
export function ChildSwitcherPill({ child, index = 0, canSwitch, onPress }) {
  const { c } = useTheme();
  const label = childShortLabel(child);
  const suffix = child?.className ? ` · ${child.className}` : '';
  return (
    <Pressable
      onPress={canSwitch ? onPress : undefined}
      disabled={!canSwitch}
      accessibilityRole={canSwitch ? 'button' : undefined}
      accessibilityLabel={`Ребёнок: ${label}${suffix}`}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 10,
        paddingRight: 14,
        paddingVertical: 6,
        borderRadius: 24,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
        opacity: pressed && canSwitch ? 0.9 : 1,
      })}
    >
      <InitialsBadge child={child} color={childColor(index)} width={24} height={24} radius={12} fontSize={11} />
      <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink }} numberOfLines={1}>
        {label}
        {suffix}
      </Txt>
      {canSwitch ? <Icon name="chevronDown" size={14} color={c.ink} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

/**
 * Figma «Родитель (1 ребёнок) – Сетка» (node 2085:10059): единственный ребёнок
 * подписан строкой под заголовком, без чипа — переключать всё равно не на кого,
 * а чип в сетке отнимал бы у таблицы высоту.
 */
export function ChildSubtitle({ child }) {
  const { c } = useTheme();
  const label = childShortLabel(child);
  const suffix = child?.className ? ` · ${child.className}` : '';
  return (
    <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink3 }} numberOfLines={1}>
      {label}
      {suffix}
    </Txt>
  );
}

/** Figma `bottom-sheet` (node 2022:13432) — the child picker. */
export function ChildPickerSheet({ visible, items, selectedId, onSelect, onClose }) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 8,
            paddingHorizontal: 16,
            // Design pads 44px below the list; on notched devices that is the
            // home-indicator area, so keep whichever is larger.
            paddingBottom: Math.max(44, insets.bottom + 10),
            gap: 16,
            shadowColor: '#000',
            shadowOpacity: 0.13,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -8 },
            elevation: 16,
          }}
        >
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.stripeIdle }} />
          </View>

          <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>Выберите ребёнка</Txt>

          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 6 }}>
              {items.map((item, i) => {
                const on = item.id === selectedId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onSelect(item.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: on
                        ? dark
                          ? 'rgba(255,255,255,0.07)'
                          : 'rgba(39,65,133,0.06)'
                        : 'transparent',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <InitialsBadge
                        child={item}
                        color={childColor(i)}
                        width={36}
                        height={32}
                        radius={18}
                        fontSize={13}
                      />
                      <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
                        <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }} numberOfLines={1}>
                          {childFullLabel(item)}
                        </Txt>
                        <Txt style={{ fontSize: 13, fontWeight: '400', color: c.inkMuted }} numberOfLines={1}>
                          {item.className || 'Класс не назначен'}
                        </Txt>
                      </View>
                    </View>
                    {on ? (
                      <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="check" size={18} color={c.blue} strokeWidth={2.4} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
