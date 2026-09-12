import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Avatar } from '@shared/components/ui';
import { useMyProfile } from '@shared/hooks/useProfile';

/**
 * Главный (и единственный) экран психолога в мобильном приложении (PSYCHOLOGIST-001).
 *
 * Раздел «Психологические тесты» — только в веб-панели: создание и AI-генерация вопросов
 * там же, где у администратора «AI-тесты», и переносить этот конструктор на телефон эта
 * задача не просила. Мобильный вход психологу нужен ровно для одного — не потерять код
 * активации без входа вовсе (ту же роль сюда пускает `MOBILE_ROLES`); дальше — заглушка
 * с профилем и выходом, без учебных разделов, как у администратора/охраны в `StaffApp`,
 * только совсем без вкладок: делить с чем-либо эту роль пока не с чем.
 */
export function PsychologistHomeScreen({ onSignOut }) {
  const { c } = useTheme();
  const { displayName } = useMyProfile();

  return (
    <Screen>
      <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' }}>
        <Avatar name={displayName} size={86} color="blue" />
        <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 12, letterSpacing: -0.3 }}>
          {displayName}
        </Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 2 }}>Психолог</Txt>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: c.blueSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Icon name="clipboardCheck" size={28} color={c.blue} strokeWidth={2} />
        </View>
        <Txt style={{ fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
          Психологические тесты — в панели администратора
        </Txt>
        <Txt style={{ fontSize: 14, color: c.inkMuted, textAlign: 'center', marginTop: 6 }}>
          Создание и AI-генерация вопросов пока доступны только с компьютера.
        </Txt>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        <Pressable onPress={onSignOut} style={{ padding: 14, alignItems: 'center' }}>
          <Txt style={{ color: c.red, fontWeight: '600', fontSize: 14 }}>Выйти</Txt>
        </Pressable>
      </View>
    </Screen>
  );
}
