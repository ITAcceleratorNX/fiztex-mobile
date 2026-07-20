import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { HexBadge, PhysTechMark } from '@shared/components/Hex';
import { Card, PrimaryButton, ScreenHeader, PhysTechWordmark } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';

// Clean branded emblem for the welcome hero (replaces the old colour-hex cluster).
function BrandEmblem() {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: c.blueSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 128,
          height: 128,
          borderRadius: 40,
          backgroundColor: c.blue,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PhysTechMark size={68} color="#fff" />
      </View>
    </View>
  );
}

export function AuthWelcome({ onContinue, onEntrance }) {
  const { c } = useTheme();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <PhysTechWordmark size={40} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BrandEmblem />
        </View>

        <View style={{ paddingBottom: 24 }}>
          <Txt style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.7, lineHeight: 35 }}>Школа в твоём кармане</Txt>
          <Txt style={{ fontSize: 15, color: c.ink2, marginTop: 10, lineHeight: 22 }}>
            Расписание, оценки, кружки, достижения и связь с учителями — всё в одном месте.
          </Txt>
        </View>

        <View style={{ paddingBottom: 24 }}>
          <PrimaryButton color="green" onPress={onContinue}>Войти</PrimaryButton>
          {onEntrance ? (
            <PrimaryButton color="blue" style={{ marginTop: 10 }} onPress={onEntrance}>
              Вступительный тест
            </PrimaryButton>
          ) : null}
          <Txt style={{ marginTop: 12, fontSize: 13, color: c.ink3, textAlign: 'center' }}>
            Нет аккаунта? <Txt style={{ color: c.green, fontWeight: '600' }}>Спросите у школы</Txt>
          </Txt>
        </View>
      </View>
    </Screen>
  );
}

export function AuthSignIn({ onRole, onBack }) {
  const { c } = useTheme();
  return (
    <Screen>
      <ScreenHeader title="Вход" back={onBack} />
      <View style={{ paddingHorizontal: 20 }}>
        <Txt style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 31, marginTop: 8 }}>Как ты заходишь?</Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8 }}>
          Выбери способ — приложение запомнит выбор для следующего раза.
        </Txt>

        <GradCard colors={GRAD.green} padding={22} radius={20} patternColor="rgba(255,255,255,0.10)" patternSize={26} style={{ marginTop: 24 }}>
          <HexBadge size={52} fill="rgba(255,255,255,0.20)" icon="qr" iconColor="#fff" iconSize={26} />
          <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 14 }}>Вход по QR-коду</Txt>
          <Txt style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Покажи QR на входе в школу</Txt>
          <View style={{ marginTop: 14, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' }}>
            <Txt style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Сгенерировать QR</Txt>
          </View>
        </GradCard>

        <Card style={{ marginTop: 12, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16 }} onPress={() => onRole('select')}>
          <HexBadge size={52} fill={c.blue} icon="face" iconColor="#fff" iconSize={26} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 18, fontWeight: '700' }}>Face ID</Txt>
            <Txt style={{ fontSize: 13, color: c.ink2, marginTop: 2 }}>Привязанный аккаунт</Txt>
          </View>
          <Icon name="chevronRight" size={20} color={c.ink3} />
        </Card>

        <View style={{ alignItems: 'center', marginTop: 28 }}>
          <Txt style={{ color: c.ink2, fontSize: 14, fontWeight: '600' }}>Войти по email и паролю</Txt>
        </View>
      </View>
    </Screen>
  );
}

export function AuthRolePicker({ onPick, onBack }) {
  const { c } = useTheme();
  const roles = [
    { id: 'student', name: 'Ученик', sub: 'Расписание, оценки, ачивки', color: 'green', icon: 'star' },
    { id: 'parent', name: 'Родитель', sub: 'Следить за ребёнком', color: 'blue', icon: 'user' },
    { id: 'teacher', name: 'Учитель', sub: 'Классы, оценки, фидбек', color: 'red', icon: 'pencil' },
  ];
  const fill = { green: c.green, blue: c.blue, red: c.red };
  return (
    <Screen>
      <ScreenHeader title="Роль" back={onBack} />
      <View style={{ paddingHorizontal: 20 }}>
        <Txt style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 31 }}>Я захожу как</Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8 }}>На демо можно переключить роль в настройках.</Txt>

        <View style={{ gap: 10, marginTop: 24 }}>
          {roles.map((r) => (
            <Card key={r.id} onPress={() => onPick(r.id)} style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <HexBadge size={56} fill={fill[r.color]} icon={r.icon} iconColor="#fff" iconSize={24} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 18, fontWeight: '700' }}>{r.name}</Txt>
                <Txt style={{ fontSize: 13, color: c.ink3 }}>{r.sub}</Txt>
              </View>
              <Icon name="chevronRight" size={20} color={c.ink3} />
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

export function AuthFaceID({ onSuccess, onBack }) {
  const { c } = useTheme();
  useEffect(() => {
    const t = setTimeout(() => onSuccess && onSuccess(), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen>
      <ScreenHeader title="Face ID" back={onBack} />
      <View style={{ paddingHorizontal: 24, alignItems: 'center' }}>
        <View style={{ marginTop: 40, width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: c.blueSoft }} />
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 999, backgroundColor: c.blue }} />
          <Icon name="face" size={68} color="#fff" />
        </View>
        <Txt style={{ marginTop: 28, fontSize: 17, fontWeight: '700' }}>Смотри в камеру</Txt>
        <Txt style={{ fontSize: 13, color: c.ink2, marginTop: 4 }}>Идентификация…</Txt>
      </View>
    </Screen>
  );
}
