import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/Screen';
import { Txt } from '../components/Txt';
import Icon from '../components/Icon';
import { Hex, HexBadge, TamosGlyph } from '../components/Hex';
import { Card, PrimaryButton, ScreenHeader } from '../components/ui';
import { GradCard, GRAD } from '../components/Grad';

// Decorative hex cluster for the welcome hero.
function HexCluster() {
  const { c } = useTheme();
  return (
    <View style={{ width: 280, height: 280 }}>
      <View style={{ position: 'absolute', top: 90, left: 90 }}>
        <Hex size={100} fill={c.green} />
      </View>
      <View style={{ position: 'absolute', top: 30, right: 50 }}>
        <Hex size={84} fill={c.red} />
      </View>
      <View style={{ position: 'absolute', top: 60, left: 10 }}>
        <Hex size={72} fill={c.blue} />
      </View>
      <View style={{ position: 'absolute', bottom: 30, left: 100 }}>
        <Hex size={64} fill={c.gold} />
      </View>
      <View style={{ position: 'absolute', bottom: 60, right: 30 }}>
        <Hex size={56} fill="transparent" stroke={c.borderStrong} strokeWidth={3} />
      </View>
    </View>
  );
}

export function AuthWelcome({ onContinue }) {
  const { c } = useTheme();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <TamosGlyph size={84} />
          <Txt style={{ marginTop: 22, fontSize: 38, fontWeight: '800', letterSpacing: -1, color: c.ink }}>Tamos</Txt>
          <Txt style={{ marginTop: 4, fontSize: 12, fontWeight: '600', letterSpacing: 4, color: c.ink3, textTransform: 'uppercase' }}>
            education · international
          </Txt>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <HexCluster />
        </View>

        <View style={{ paddingBottom: 24 }}>
          <Txt style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.7, lineHeight: 35 }}>Школа в твоём кармане</Txt>
          <Txt style={{ fontSize: 15, color: c.ink2, marginTop: 10, lineHeight: 22 }}>
            Расписание, оценки, кружки, достижения и связь с учителями — всё в одном месте.
          </Txt>
        </View>

        <View style={{ paddingBottom: 24 }}>
          <PrimaryButton color="green" onPress={onContinue}>Войти</PrimaryButton>
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
          <Hex size={180} fill={c.blue} style={{ position: 'absolute', opacity: 0.15 }} />
          <Hex size={120} fill={c.blue} style={{ position: 'absolute' }} />
          <Icon name="face" size={68} color="#fff" />
        </View>
        <Txt style={{ marginTop: 28, fontSize: 17, fontWeight: '700' }}>Смотри в камеру</Txt>
        <Txt style={{ fontSize: 13, color: c.ink2, marginTop: 4 }}>Идентификация…</Txt>
      </View>
    </Screen>
  );
}
