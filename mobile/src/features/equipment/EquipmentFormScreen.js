import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen, shadowLg } from '@shared/components/Screen';
import { FilledButton, PickerSheet, TextField } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useEquipmentCommands, useEquipmentItems } from '@shared/hooks/useEquipment';
import { EquipmentHero } from './EquipmentParts';
import { conflictItem } from './equipmentModel';

const MAX_UNITS = 50;

const emptyUnit = { inventoryNumber: '', serialNumber: '' };

/**
 * Три сценария одной формы (ТЗ §7.1):
 *
 * <ul>
 *   <li>новая позиция сразу с экземплярами;</li>
 *   <li>экземпляры в существующую позицию — в том числе ту, у которой всё списано: в
 *       рабочих списках её нет, а в справочнике есть;</li>
 *   <li>правка номеров одного экземпляра.</li>
 * </ul>
 *
 * <p>Занятое название — не ошибка ввода, а развилка: сервер отвечает 409 с самой позицией,
 * и форма переключается на «добавить в неё». Вторую позицию с тем же именем завести нельзя.
 */
export function EquipmentFormScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const editingUnit = payload?.unit ?? null;
  const commands = useEquipmentCommands();
  const catalog = useEquipmentItems(!editingUnit);

  const [target, setTarget] = useState(payload?.item ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [units, setUnits] = useState(
    editingUnit
      ? [{ inventoryNumber: editingUnit.inventoryNumber ?? '', serialNumber: editingUnit.serialNumber ?? '' }]
      : [{ ...emptyUnit }],
  );
  const [unitNote, setUnitNote] = useState(editingUnit?.note ?? '');
  const [touched, setTouched] = useState(false);
  const [notice, setNotice] = useState(null);

  const filled = units.filter((unit) => unit.inventoryNumber.trim().length > 0);
  const nameValid = Boolean(editingUnit) || target != null || name.trim().length > 0;
  const valid = nameValid && filled.length > 0;

  function patchUnit(index, patch) {
    setUnits((current) => current.map((unit, position) => (position === index ? { ...unit, ...patch } : unit)));
  }

  async function submit() {
    setTouched(true);
    setNotice(null);
    if (!valid) return;

    if (editingUnit) {
      const saved = await commands.updateUnit(editingUnit.id, {
        inventoryNumber: filled[0].inventoryNumber.trim(),
        serialNumber: filled[0].serialNumber.trim() || null,
        note: unitNote.trim() || null,
      });
      if (saved) nav?.back();
      return;
    }

    const payloadUnits = filled.map((unit) => ({
      inventoryNumber: unit.inventoryNumber.trim(),
      serialNumber: unit.serialNumber.trim() || null,
    }));
    const saved = await commands.saveItem({
      itemId: target?.id,
      name,
      note,
      units: payloadUnits,
    });
    if (saved) {
      nav?.tabs('equipment-stock', {
        success: target ? `Добавлено экземпляров: ${payloadUnits.length}` : 'Позиция добавлена',
      });
      return;
    }
    const existing = conflictItem(commands.error);
    if (existing) {
      setTarget(existing);
      setNotice(`Позиция «${existing.name}» уже есть — экземпляры добавятся в неё`);
    }
  }

  const title = editingUnit
    ? 'Изменить экземпляр'
    : target ? 'Добавить экземпляры' : 'Новая позиция';

  return (
    <Screen scroll={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 112 + insets.bottom, gap: 18 }} showsVerticalScrollIndicator={false}>
        <EquipmentHero
          title={title}
          subtitle={editingUnit?.itemName || target?.name || 'Название техники и её экземпляры'}
          onBack={() => nav?.back()}
        />

        {notice ? (
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.goldSoft || c.bg2 }}>
            <Txt style={{ fontSize: 13, color: c.ink }}>{notice}</Txt>
          </View>
        ) : null}

        {!editingUnit && (
          target ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.blueSoft }}>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 12, color: c.inkMuted }}>Позиция</Txt>
                <Txt style={{ fontSize: 14, fontWeight: '700', color: c.blue }}>{target.name}</Txt>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setTarget(null)}>
                <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>Новая</Txt>
              </Pressable>
            </View>
          ) : (
            <>
              <TextField
                label="Название позиции"
                required
                value={name}
                onChangeText={setName}
                placeholder="Например, Ноутбук Lenovo ThinkPad"
                maxLength={200}
                error={touched && !nameValid ? 'Укажите название позиции.' : null}
              />
              <TextField
                label="Примечание"
                value={note}
                onChangeText={setNote}
                placeholder="Кабинет, комплектация, ориентир"
                multiline
                maxLength={2000}
              />
              {catalog.rows.length ? (
                <Pressable accessibilityRole="button" onPress={() => setPickerOpen(true)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', opacity: pressed ? 0.75 : 1 })}>
                  <Icon name="inbox" size={17} color={c.blue} />
                  <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>Добавить в существующую позицию</Txt>
                </Pressable>
              ) : null}
            </>
          )
        )}

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>
              {editingUnit ? 'Номера' : 'Экземпляры'}
            </Txt>
            {!editingUnit ? <Txt style={{ fontSize: 12, color: c.inkMuted }}>{filled.length} из {MAX_UNITS}</Txt> : null}
          </View>

          {units.map((unit, index) => (
            <View key={`unit-${index}`} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.blueSoft }}>
                  <Icon name="laptop" size={18} color={c.blue} />
                </View>
                <TextField
                  style={{ flex: 1 }}
                  value={unit.inventoryNumber}
                  onChangeText={(value) => patchUnit(index, { inventoryNumber: value })}
                  placeholder="Инвентарный номер"
                  maxLength={100}
                />
                {!editingUnit && units.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Убрать экземпляр ${index + 1}`}
                    onPress={() => setUnits((current) => current.filter((_, position) => position !== index))}
                    hitSlop={8}
                  >
                    <Icon name="x" size={19} color={c.inkMuted} />
                  </Pressable>
                ) : null}
              </View>
              <TextField
                value={unit.serialNumber}
                onChangeText={(value) => patchUnit(index, { serialNumber: value })}
                placeholder="Серийный номер (необязательно)"
                maxLength={100}
              />
            </View>
          ))}

          {touched && filled.length === 0 ? (
            <Txt accessibilityRole="alert" style={{ fontSize: 12, color: c.red }}>Укажите инвентарный номер.</Txt>
          ) : null}

          {!editingUnit && units.length < MAX_UNITS ? (
            <Pressable accessibilityRole="button" onPress={() => setUnits((current) => [...current, { ...emptyUnit }])} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, opacity: pressed ? 0.75 : 1 })}>
              <Icon name="plus" size={18} color={c.green} strokeWidth={2.4} />
              <Txt style={{ fontSize: 13, fontWeight: '700', color: c.green }}>Ещё экземпляр</Txt>
            </Pressable>
          ) : null}

          {editingUnit ? (
            <TextField
              label="Примечание"
              value={unitNote}
              onChangeText={setUnitNote}
              multiline
              maxLength={2000}
            />
          ) : null}
        </View>

        {commands.errorText && !notice ? (
          <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{commands.errorText}</Txt>
        ) : null}
      </ScrollView>

      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 8), borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, ...shadowLg }, shadowLg]}>
        <FilledButton disabled={commands.busy} onPress={submit}>
          {commands.busy ? 'Сохраняем…' : 'Сохранить'}
        </FilledButton>
      </View>

      <PickerSheet
        visible={pickerOpen}
        title="В какую позицию добавить?"
        options={catalog.rows.map((item) => ({
          value: item.id,
          label: item.name,
          hint: `${item.activeUnitCount ?? 0} экз. в учёте`,
        }))}
        value={target?.id ?? null}
        onClose={() => setPickerOpen(false)}
        onSelect={(value) => {
          const item = catalog.rows.find((row) => row.id === value);
          setPickerOpen(false);
          if (item) setTarget({ id: item.id, name: item.name });
        }}
      />
    </Screen>
  );
}
