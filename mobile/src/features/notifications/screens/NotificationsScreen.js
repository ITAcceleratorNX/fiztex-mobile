import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { HexBadge } from '@shared/components/Hex';
import { Card, ScreenHeader } from '@shared/components/ui';
import { useAppState } from '@shared/state/AppState';

// Lightweight notifications placeholder (bell target for parent/teacher).
export function NotificationsScreen({ nav }) {
  const { c } = useTheme();
  const state = useAppState();
  const items = [
    { icon: 'star', color: c.goldDeep, title: 'Новая оценка по математике', sub: '5 · сегодня 10:12' },
    { icon: 'chat', color: c.green, title: 'Фидбек за май готов', sub: 'Айгерим Болатовна' },
    { icon: 'calendar', color: c.blue, title: 'Скоро: открытый урок', sub: '2 июня · 15:00' },
  ];
  return (
    <Screen>
      <ScreenHeader title="Уведомления" back={() => nav.back()} />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 100 }}>
        {items.map((it, i) => (
          <Card key={i} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <HexBadge size={40} fill={it.color} icon={it.icon} iconColor="#fff" iconSize={18} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, fontWeight: '600' }}>{it.title}</Txt>
              <Txt style={{ fontSize: 12, color: c.ink3, marginTop: 1 }}>{it.sub}</Txt>
            </View>
          </Card>
        ))}
        {state.notifications > 0 ? (
          <Txt style={{ textAlign: 'center', color: c.ink3, fontSize: 12, marginTop: 8 }}>Непрочитанных: {state.notifications}</Txt>
        ) : null}
      </View>
    </Screen>
  );
}
