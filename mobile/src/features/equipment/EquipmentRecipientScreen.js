import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen, shadowLg } from '@shared/components/Screen';
import { FilledButton, StateView, TextField } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useEquipmentCommands, useEquipmentRecipients } from '@shared/hooks/useEquipment';
import { EquipmentHero } from './EquipmentParts';
import { conflictText, roleLabel } from './equipmentModel';

/**
 * Кому выдать или передать (ТЗ §7.2, §7.4).
 *
 * <p>Один экран на обе команды: вопрос у них общий и единственный. При передаче прежний
 * держатель из списка убран — «передать тому же» сервер отклонит.
 *
 * <p>Ученика и родителя в списке не бывает: сервер отдаёт только активных сотрудников, и
 * фильтровать здесь нечего.
 */
export function EquipmentRecipientScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const recipients = useEquipmentRecipients(query);
  const commands = useEquipmentCommands();
  const mode = payload?.mode === 'transfer' ? 'transfer' : 'issue';
  const unitIds = payload?.unitIds ?? [];
  const rows = useMemo(
    () => recipients.rows.filter((item) => item.accountId !== payload?.excludeAccountId),
    [recipients.rows, payload?.excludeAccountId],
  );

  async function submit() {
    if (!selected || unitIds.length === 0) return;
    const result = mode === 'transfer'
      ? await commands.transfer(unitIds, selected.accountId, comment.trim())
      : await commands.issue(unitIds, selected.accountId, comment.trim());
    if (result) {
      nav?.tabs('equipment-issued', {
        success: mode === 'transfer'
          ? 'Техника передана'
          : unitIds.length === 1 ? 'Техника выдана' : `Выдано экземпляров: ${unitIds.length}`,
      });
    }
  }

  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: 16 }}>
        <EquipmentHero
          title={mode === 'transfer' ? 'Передать технику' : 'Выдать технику'}
          subtitle={`Выбрано экземпляров: ${unitIds.length}`}
          onBack={() => nav?.back()}
        />
      </View>
      <View style={{ padding: 16, gap: 12 }}>
        <View>
          <TextField value={query} onChangeText={setQuery} placeholder="Найти сотрудника" returnKeyType="search" inputStyle={{ paddingLeft: 42 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 14 }}>
            <Icon name="search" size={18} color={c.ink3} />
          </View>
        </View>
        {selected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.blueSoft }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, fontWeight: '700', color: c.blue }}>{selected.fullName}</Txt>
              <Txt style={{ marginTop: 2, fontSize: 11, color: c.inkMuted }}>{roleLabel(selected.role)}</Txt>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Снять выбор" onPress={() => setSelected(null)}>
              <Icon name="x" size={18} color={c.blue} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.accountId)}
        renderItem={({ item }) => {
          const active = item.accountId === selected?.accountId;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelected(item)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, marginHorizontal: 16, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border, borderRadius: active ? 10 : 0, backgroundColor: active ? c.blueSoft : pressed ? c.bg2 : c.bg })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
                <Icon name="user" size={19} color={active ? c.blue : c.inkMuted} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{item.fullName}</Txt>
                <Txt style={{ marginTop: 2, fontSize: 11, color: c.inkMuted }}>{roleLabel(item.role)}</Txt>
              </View>
              {active ? <Icon name="check" size={19} color={c.blue} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={recipients.loading ? (
          <View style={{ paddingTop: 42 }}><ActivityIndicator color={c.blue} /></View>
        ) : recipients.error ? (
          <StateView icon="alertTriangle" tone="error" title="Не удалось загрузить сотрудников" subtitle={recipients.error} />
        ) : (
          <StateView icon="search" title="Никого не нашли" subtitle="Технику выдают только активным сотрудникам школы." />
        )}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: selected ? 176 + insets.bottom : 92 + insets.bottom }}
        initialNumToRender={16}
        maxToRenderPerBatch={20}
        windowSize={8}
      />

      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 8), gap: 10, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, ...shadowLg }, shadowLg]}>
        {selected ? (
          <TextField
            value={comment}
            onChangeText={setComment}
            placeholder="Комментарий: срок возврата, назначение"
            maxLength={2000}
          />
        ) : null}
        {commands.error ? (
          <Txt accessibilityRole="alert" style={{ fontSize: 12, color: c.red }}>{conflictText(commands.error)}</Txt>
        ) : null}
        <FilledButton disabled={!selected || commands.busy || unitIds.length === 0} onPress={submit}>
          {commands.busy ? 'Сохраняем…' : mode === 'transfer' ? 'Передать' : 'Выдать'}
        </FilledButton>
      </View>
    </Screen>
  );
}
