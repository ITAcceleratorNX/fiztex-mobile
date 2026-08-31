import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { Avatar, Card, SectionTitle } from '@shared/components/ui';
import { ProfileRow } from '@shared/ui/rows';
import { useAuth } from '@features/auth/AuthContext';
import { useMyProfile } from '@shared/hooks/useProfile';

const ROLE_LABEL = {
  ADMIN: 'Администратор школы',
  SECURITY: 'Охрана',
};

/**
 * Экран «Я» администратора и охраны.
 *
 * Отдельно от учительского, а не он же с пустыми блоками: школьного профиля у этих ролей
 * нет вовсе — ни классов, ни предметов, ни детей, — и «Мои классы» с подписью «классов
 * пока не назначили» обещали бы им раздел, которого не будет.
 */
export function StaffProfileScreen({ nav, onSignOut }) {
  const { c, dark, toggle } = useTheme();
  const { biometricsEnabled, biometricMeta, enableBiometrics, disableBiometrics } = useAuth();
  const { displayName, role } = useMyProfile();

  const toggleBio = async () => {
    if (biometricsEnabled) await disableBiometrics();
    else if (biometricMeta.available) await enableBiometrics();
  };

  return (
    <Screen>
      <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' }}>
        <Avatar name={displayName} size={86} color="blue" />
        <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 12, letterSpacing: -0.3 }}>
          {displayName}
        </Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 2 }}>
          {ROLE_LABEL[role] || 'Сотрудник школы'}
        </Txt>
      </View>

      <SectionTitle title="Сервис" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 0 }}>
        <Pressable onPress={() => nav('service-requests')}>
          <ProfileRow icon="wrench" title="Сервисные заявки" last />
        </Pressable>
      </Card>

      <SectionTitle title="Настройки" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 0 }}>
        <Pressable onPress={toggle}>
          <ProfileRow icon="settings" title="Тёмная тема" value={dark ? 'Вкл' : 'Выкл'} />
        </Pressable>
        <Pressable onPress={toggleBio}>
          <ProfileRow
            icon="face"
            title={biometricMeta.label || 'Face ID'}
            value={biometricsEnabled ? 'Вкл' : biometricMeta.available ? 'Выкл' : 'Нет'}
            last
          />
        </Pressable>
      </Card>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}>
        <Pressable onPress={onSignOut} style={{ padding: 14, alignItems: 'center' }}>
          <Txt style={{ color: c.red, fontWeight: '600', fontSize: 14 }}>Выйти</Txt>
        </Pressable>
      </View>
    </Screen>
  );
}
