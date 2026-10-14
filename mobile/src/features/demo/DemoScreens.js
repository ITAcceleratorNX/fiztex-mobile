import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/AuthContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { TextButton } from '@shared/components/TextButton';
import { Card, ConfirmDialog, OutlineButton, PickerSheet, ScreenHeader } from '@shared/components/ui';
import { DEMO } from '@shared/theme/tokens';
import { useTheme } from '@shared/theme/ThemeContext';
import { DEMO_ROLES } from '@shared/demo/session';

export function DemoRolesScreen({ navigation }) {
  const { c } = useTheme();
  const { startDemo } = useAuth();
  return (
    <Screen contentStyle={{ paddingBottom: DEMO.gutter }}>
      <ScreenHeader title="Попробовать демо" back={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: DEMO.gutter, gap: DEMO.gap }}>
        <Txt style={{ fontSize: DEMO.titleSize, fontWeight: '700' }}>Выберите роль</Txt>
        <Txt style={{ fontSize: DEMO.bodySize, lineHeight: DEMO.bodyLine, color: c.ink2 }}>
          Все данные вымышленные и остаются на этом устройстве. Интернет и аккаунт не нужны.
        </Txt>
        {DEMO_ROLES.map((role) => (
          <Card key={role.value} style={{ gap: DEMO.compactGap }}>
            <Txt style={{ fontSize: DEMO.roleSize, fontWeight: '700' }}>{role.label}</Txt>
            <Txt style={{ fontSize: DEMO.bodySize, color: c.ink2 }}>{role.hint}</Txt>
            <OutlineButton size="lg" onPress={() => startDemo(role.value, { reset: true })}>
              {`Открыть: ${role.label.toLowerCase()}`}
            </OutlineButton>
          </Card>
        ))}
        <Txt style={{ fontSize: DEMO.bodySize, lineHeight: DEMO.bodyLine, color: c.ink2 }}>
          Сдайте задание учеником, затем смените роль в панели «Демо» и проверьте работу учителем.
        </Txt>
      </View>
    </Screen>
  );
}

export function DemoToolbar() {
  const { role, startDemo, signOut } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState(false);
  const [reset, setReset] = useState(false);
  const label = DEMO_ROLES.find((item) => item.value === role)?.label;
  return (
    <View style={{ paddingTop: insets.top, paddingHorizontal: DEMO.compactGap,
      backgroundColor: c.blueSoft, borderBottomWidth: DEMO.borderWidth, borderColor: c.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextButton onPress={() => setPicker(true)} label={`Демо: ${label}. Сменить роль`}>
          {`Демо · ${label} ▾`}
        </TextButton>
        <View style={{ flexDirection: 'row' }}>
          <TextButton onPress={() => setReset(true)}>Заново</TextButton>
          <TextButton onPress={signOut} label="Выйти из демо">Выйти</TextButton>
        </View>
      </View>
      <PickerSheet visible={picker} title="Сменить роль в демо" options={DEMO_ROLES} value={role}
        onClose={() => setPicker(false)} onSelect={(value) => { setPicker(false); startDemo(value); }} />
      <ConfirmDialog visible={reset} title="Начать демо заново?"
        message="Ответы, оценки и отметки посещаемости будут восстановлены до начального состояния."
        confirmLabel="Начать заново" onCancel={() => setReset(false)}
        onConfirm={() => { setReset(false); startDemo(role, { reset: true }); }} />
    </View>
  );
}
