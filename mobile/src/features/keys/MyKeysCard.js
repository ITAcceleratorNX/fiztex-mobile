import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { formatKeyDate, problemLabel } from './keyModel';

/** Compact, non-interactive teacher summary. The teacher API is intentionally read-only. */
export function MyKeysCard({ keys }) {
  const { c } = useTheme();
  if (!keys?.length) return null;
  const visible = keys.slice(0, 4);
  return (
    <View style={{ borderRadius: 16, padding: 15, gap: 10, backgroundColor: c.greenSoft, borderWidth: 1, borderColor: c.green }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="key" size={20} color={c.green} strokeWidth={2.2} />
        <Txt style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.greenDeep }}>Мои ключи</Txt>
        <Txt style={{ fontSize: 12, fontWeight: '700', color: c.greenDeep }}>{keys.length}</Txt>
      </View>
      {visible.map((key, index) => (
        <View key={key.unitId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: c.green }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: c.ink }}>{key.groupName} · {key.label}</Txt>
            <Txt numberOfLines={1} style={{ marginTop: 3, fontSize: 11, color: key.problem ? c.red : c.inkMuted }}>{problemLabel(key.problem) || `Выдан ${formatKeyDate(key.issuedAt)}`}</Txt>
          </View>
          <Icon name="key" size={16} color={c.green} />
        </View>
      ))}
      {keys.length > visible.length ? <Txt style={{ fontSize: 12, fontWeight: '600', color: c.greenDeep }}>И ещё {keys.length - visible.length}</Txt> : null}
    </View>
  );
}
