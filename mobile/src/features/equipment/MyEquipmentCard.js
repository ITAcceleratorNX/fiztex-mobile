import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { formatEquipmentDate, problemLabel } from './equipmentModel';

/**
 * «Моя техника» — блок получателя (ТЗ §10).
 *
 * <p>Read-only и без единой кнопки: вернуть, передать и списать сотрудник не может, а
 * кнопка, которая ничего не делает, хуже её отсутствия. Полного раздела получателю тоже
 * не дают — только то, что числится за ним.
 *
 * <p>Нет активных выдач — блока нет вовсе (§10): пустая карточка «у вас ничего нет»
 * занимала бы место на каждой главной в школе.
 */
export function MyEquipmentCard({ rows }) {
  const { c } = useTheme();
  if (!rows?.length) return null;
  const visible = rows.slice(0, 4);
  return (
    <View style={{ borderRadius: 16, padding: 15, gap: 10, backgroundColor: c.blueSoft, borderWidth: 1, borderColor: c.blue }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="laptop" size={20} color={c.blue} strokeWidth={2.2} />
        <Txt style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.blue }}>Моя техника</Txt>
        <Txt style={{ fontSize: 12, fontWeight: '700', color: c.blue }}>{rows.length}</Txt>
      </View>
      {visible.map((row) => (
        <View key={row.unitId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: c.blue }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: c.ink }}>
              {row.itemName} · {row.inventoryNumber}
            </Txt>
            <Txt numberOfLines={1} style={{ marginTop: 3, fontSize: 11, color: row.problem ? c.red : c.inkMuted }}>
              {problemLabel(row.problem) || `Выдано ${formatEquipmentDate(row.issuedAt)}`}
            </Txt>
          </View>
          <Icon name="laptop" size={16} color={c.blue} />
        </View>
      ))}
      {rows.length > visible.length ? (
        <Txt style={{ fontSize: 12, fontWeight: '600', color: c.blue }}>И ещё {rows.length - visible.length}</Txt>
      ) : null}
    </View>
  );
}
