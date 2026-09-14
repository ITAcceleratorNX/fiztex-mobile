import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen, shadowLg } from '@shared/components/Screen';
import { FilledButton, TextField } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useKeyCommands } from '@shared/hooks/useKeys';
import { KeysHero } from './KeyParts';

export function KeyGroupFormScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const group = payload?.group;
  const existingUnits = useMemo(() => group?.units ?? [], [group]);
  const [name, setName] = useState(group?.name ?? '');
  const [note, setNote] = useState(group?.note ?? '');
  const [labels, setLabels] = useState(() => existingUnits.length ? existingUnits.map((unit) => unit.label ?? '') : ['']);
  const [touched, setTouched] = useState(false);
  const commands = useKeyCommands();
  const editing = Boolean(group?.id);
  const valid = name.trim().length > 0 && labels.length > 0 && labels.length <= 50;

  function setLabel(index, value) {
    setLabels((current) => current.map((label, position) => position === index ? value : label));
  }

  async function submit() {
    setTouched(true);
    if (!valid) return;
    const saved = await commands.saveGroup({ group, name, note, labels });
    if (saved) nav?.tabs('keys-on-post', { success: editing ? 'Объект обновлён' : 'Объект добавлен' });
  }

  return (
    <Screen scroll={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 112 + insets.bottom, gap: 18 }} showsVerticalScrollIndicator={false}>
        <KeysHero title={editing ? 'Редактировать объект' : 'Добавить объект'} subtitle={editing ? group.name : 'Новая группа ключей'} onBack={() => nav?.back()} />
        <TextField label="Название объекта" required value={name} onChangeText={setName} placeholder="Например, Кабинет 305" maxLength={200} error={touched && !name.trim() ? 'Укажите название объекта.' : null} />
        <TextField label="Примечание" value={note} onChangeText={setNote} placeholder="Этаж, корпус или ориентир" multiline maxLength={2000} />

        <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Ключи</Txt>
          <Txt style={{ fontSize: 12, color: c.inkMuted }}>{labels.length} из 50</Txt>
        </View>
        {labels.map((label, index) => (
          <View key={existingUnits[index]?.id ?? `new-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.blueSoft }}><Icon name="key" size={18} color={c.blue} /></View>
            <TextField style={{ flex: 1 }} value={label} onChangeText={(value) => setLabel(index, value)} placeholder={`Ключ ${index + 1}`} maxLength={200} />
            {!editing && labels.length > 1 ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Удалить ключ ${index + 1}`} onPress={() => setLabels((current) => current.filter((_, position) => position !== index))} hitSlop={8}>
                <Icon name="x" size={19} color={c.inkMuted} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {labels.length < 50 ? (
          <Pressable accessibilityRole="button" onPress={() => setLabels((current) => [...current, ''])} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, opacity: pressed ? 0.75 : 1 })}>
            <Icon name="plus" size={18} color={c.green} strokeWidth={2.4} />
            <Txt style={{ fontSize: 13, fontWeight: '700', color: c.green }}>Добавить ещё ключ</Txt>
          </Pressable>
        ) : null}
        </View>

        {commands.errorText ? <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{commands.errorText}</Txt> : null}
      </ScrollView>

      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 8), borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, ...shadowLg }, shadowLg]}>
        <FilledButton disabled={commands.busy} onPress={submit}>{commands.busy ? 'Сохраняем…' : editing ? 'Сохранить изменения' : 'Добавить объект'}</FilledButton>
      </View>
    </Screen>
  );
}
