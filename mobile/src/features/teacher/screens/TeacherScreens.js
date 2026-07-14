import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt, Ink } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { HexBadge } from '@shared/components/Hex';
import { Card, Pill, Avatar, PrimaryButton, AppHeader, ScreenHeader, SectionTitle, CircleButton } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';
import { useAppState } from '@shared/state/AppState';
import { TEACHER, CLASS_ROSTER, AI_QUESTIONS } from '@shared/data/mock';
import { LessonRow, ProfileRow, QuickAction, brandColor } from '@shared/ui/rows';

const chunk = (arr, n) => arr.reduce((rows, item, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(item);
  return rows;
}, []);

// ═══ HOME ═══
export function TeacherHome({ nav }) {
  const { c } = useTheme();
  const todays = [
    { time: '08:30', end: '09:10', subject: 'Математика · 4Б', room: 'каб. 204', status: 'done' },
    { time: '09:20', end: '10:00', subject: 'Математика · 4А', room: 'каб. 204', status: 'done' },
    { time: '10:20', end: '11:00', subject: 'Чтение · 4Б', room: 'каб. 207', status: 'now', progress: 0.6 },
    { time: '12:30', end: '13:10', subject: 'Математика · 4В', room: 'каб. 204', status: 'upcoming' },
  ];
  const actions = [
    { icon: 'qr', color: 'green', label: 'Сканировать QR', to: 'scanner' },
    { icon: 'pencil', color: 'blue', label: 'Выставить оценки', to: 'grade-entry' },
    { icon: 'sparkle', color: 'red', label: 'AI-тест', to: 'ai-upload' },
    { icon: 'chat', color: 'gold', label: 'Фидбек', to: 'feedback-write' },
  ];
  return (
    <Screen>
      <AppHeader
        greeting="Добрый день,"
        name={TEACHER.name}
        right={<CircleButton icon="bell" badge onPress={() => nav('notifications')} />}
      />

      <GradCard colors={GRAD.blue} style={{ marginHorizontal: 16, marginBottom: 16 }} padding={18}>
        <Pill style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff' }}>● Сейчас</Pill>
        <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 10, letterSpacing: -0.4 }}>Чтение · 4 «Б»</Txt>
        <Txt style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Каб. 207 · 10:20–11:00</Txt>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 14, alignItems: 'flex-end' }}>
          <View>
            <Txt style={{ fontSize: 11, opacity: 0.7 }}>Присутствует</Txt>
            <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 2 }}>22 / 24</Txt>
          </View>
          <View>
            <Txt style={{ fontSize: 11, opacity: 0.7 }}>Опоздавших</Txt>
            <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 2 }}>1</Txt>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => nav('class')} style={{ backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
            <Txt style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Класс →</Txt>
          </Pressable>
        </View>
      </GradCard>

      <View style={{ marginHorizontal: 16, marginBottom: 18, gap: 8 }}>
        {chunk(actions, 2).map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((q, i) => (
              <QuickAction key={i} icon={q.icon} color={q.color} label={q.label} onPress={() => nav(q.to)} />
            ))}
          </View>
        ))}
      </View>

      <SectionTitle title="Расписание сегодня" />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 18 }}>
        {todays.map((l, i) => (
          <LessonRow key={i} lesson={l} onPress={() => nav('class')} />
        ))}
      </View>

      <SectionTitle title="Нужно сделать" />
      <Card style={{ marginHorizontal: 16, marginBottom: 100, padding: 18 }} onPress={() => nav('feedback-write')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <HexBadge size={44} fill={c.goldDeep} icon="chat" iconColor="#fff" iconSize={20} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 14, fontWeight: '700' }}>Monthly feedback · 4 «Б»</Txt>
            <Txt style={{ fontSize: 12, color: c.ink3, marginTop: 2 }}>До 31 мая · осталось 6 из 24 учеников</Txt>
            <View style={{ marginTop: 8, height: 5, backgroundColor: c.bg2, borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ width: '75%', height: '100%', backgroundColor: c.goldDeep }} />
            </View>
          </View>
          <Icon name="chevronRight" size={18} color={c.ink3} />
        </View>
      </Card>
    </Screen>
  );
}

// ═══ CLASS ROSTER ═══
export function TeacherClass({ nav }) {
  const { c } = useTheme();
  const present = CLASS_ROSTER.filter((s) => s.present).length;
  const stats = [
    { l: 'Присутствует', v: `${present}`, unit: '/24', color: c.green },
    { l: 'Опоздавших', v: '1', color: c.goldDeep },
    { l: 'Отсутствует', v: '2', color: c.red },
  ];
  return (
    <Screen>
      <ScreenHeader
        title="Чтение · 4 «Б»"
        back={() => nav.back()}
        right={
          <Pressable style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center' }} onPress={() => nav('scanner')}>
            <Icon name="qr" size={20} color="#fff" />
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', gap: 8 }}>
        {stats.map((s, i) => (
          <Card key={i} style={{ flex: 1, padding: 12 }}>
            <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.l}</Txt>
            <Txt style={{ fontSize: 22, fontWeight: '800', marginTop: 4, color: s.color }}>
              {s.v}
              {s.unit ? <Txt style={{ fontSize: 12, color: c.ink3, fontWeight: '600' }}>{s.unit}</Txt> : null}
            </Txt>
          </Card>
        ))}
      </View>

      <SectionTitle title="Ученики" />
      <View style={{ gap: 6, marginHorizontal: 16, marginBottom: 100 }}>
        {CLASS_ROSTER.map((s, i) => (
          <Card key={i} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={s.name} size={38} color={s.avatar} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt style={{ fontSize: 14, fontWeight: '600' }}>{s.name}</Txt>
              <Txt style={{ fontSize: 11, color: c.ink3, marginTop: 1 }}>
                {s.present ? (s.late ? 'Опоздание · 10:24' : 'В классе · 10:18') : 'Отсутствует'}
              </Txt>
            </View>
            {s.present && !s.late ? <Pill color="green"><Icon name="check" size={11} /></Pill> : null}
            {s.late ? <Pill color="gold"><Icon name="clock" size={11} /></Pill> : null}
            {!s.present ? <Pill color="red"><Icon name="x" size={11} /></Pill> : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

// ═══ QR SCANNER ═══
export function TeacherScanner({ nav }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const appState = useAppState();
  const [scanned, setScanned] = useState(null);
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => setScanned({ name: 'Айкоркем С.', time: '11:00', subject: 'Чтение' }), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  if (scanned) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ink color="#fff">
          <HexBadge size={120} fill={c.green} icon="check" iconColor="#fff" iconSize={56} iconStrokeWidth={3} style={{ alignSelf: 'center' }} />
          <Txt style={{ fontSize: 26, fontWeight: '700', marginTop: 24, letterSpacing: -0.5, textAlign: 'center' }}>Отмечено</Txt>
          <Txt style={{ fontSize: 16, opacity: 0.9, marginTop: 8, textAlign: 'center' }}>{scanned.name}</Txt>
          <Txt style={{ fontSize: 13, opacity: 0.7, marginTop: 2, textAlign: 'center' }}>{scanned.subject} · {scanned.time}</Txt>
          <View style={{ marginTop: 28, flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
            <Pressable onPress={() => setScanned(null)} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Txt style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Ещё ученик</Txt>
            </Pressable>
            <Pressable onPress={() => { appState.toast('Класс отмечен'); nav.back(); }} style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, backgroundColor: c.green }}>
              <Txt style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Готово</Txt>
            </Pressable>
          </View>
        </Ink>
      </View>
    );
  }

  const corners = {
    tl: { top: -3, left: -3, borderTopLeftRadius: 32, borderTopWidth: 4, borderLeftWidth: 4 },
    tr: { top: -3, right: -3, borderTopRightRadius: 32, borderTopWidth: 4, borderRightWidth: 4 },
    bl: { bottom: -3, left: -3, borderBottomLeftRadius: 32, borderBottomWidth: 4, borderLeftWidth: 4 },
    br: { bottom: -3, right: -3, borderBottomRightRadius: 32, borderBottomWidth: 4, borderRightWidth: 4 },
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ position: 'absolute', top: insets.top + 16, left: 0, right: 0, paddingHorizontal: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => nav.back()} style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color="#fff" />
        </Pressable>
        <Txt style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Сканировать QR</Txt>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 260, height: 260 }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32, borderWidth: 3, borderColor: '#fff', opacity: 0.35 }} />
          {Object.keys(corners).map((k) => (
            <View key={k} style={[{ position: 'absolute', width: 48, height: 48, borderColor: c.green }, corners[k]]} />
          ))}
          <Animated.View
            style={{
              position: 'absolute',
              left: 8,
              right: 8,
              height: 3,
              backgroundColor: c.green,
              borderRadius: 999,
              transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [0, 257] }) }],
            }}
          />
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: insets.bottom + 40, left: 0, right: 0, paddingHorizontal: 20, alignItems: 'center', zIndex: 10 }}>
        <Txt style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Наведи на QR-код ученика</Txt>
        <Txt style={{ fontSize: 13, color: '#fff', opacity: 0.75, marginTop: 6 }}>Чтобы отметить уход с урока</Txt>
        <Pressable onPress={() => setScanned({ name: 'Бахыт А.', time: '11:01', subject: 'Чтение' })} style={{ marginTop: 18, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <Txt style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Отметить вручную</Txt>
        </Pressable>
      </View>
    </View>
  );
}

// ═══ GRADE ENTRY ═══
export function TeacherGradeEntry({ nav }) {
  const { c } = useTheme();
  const appState = useAppState();
  const [grades, setGrades] = useState({});
  const set = (name, g) => setGrades((p) => ({ ...p, [name]: g }));
  const count = Object.keys(grades).length;
  return (
    <Screen>
      <ScreenHeader title="Выставить оценки" back={() => nav.back()} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Card style={{ padding: 14 }}>
          <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>Урок</Txt>
          <Txt style={{ fontSize: 16, fontWeight: '700', marginTop: 2 }}>Чтение · 4 «Б»</Txt>
          <Txt style={{ fontSize: 12, color: c.ink3, marginTop: 2 }}>26 мая · 10:20</Txt>
        </Card>
      </View>

      <View style={{ gap: 6, marginHorizontal: 16, marginBottom: 18 }}>
        {CLASS_ROSTER.slice(0, 8).map((s, i) => {
          const g = grades[s.name];
          return (
            <Card key={i} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={s.name} size={36} color={s.avatar} />
              <Txt style={{ flex: 1, fontSize: 14, fontWeight: '600' }}>{s.name}</Txt>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {[2, 3, 4, 5].map((n) => {
                  const on = g === n;
                  const bg = on ? (n >= 4 ? c.green : n === 3 ? c.goldDeep : c.red) : c.bg2;
                  return (
                    <Pressable key={n} onPress={() => set(s.name, n)} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt style={{ fontWeight: '700', fontSize: 15, color: on ? '#fff' : c.ink2 }}>{n}</Txt>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        <PrimaryButton
          color="green"
          disabled={count === 0}
          onPress={() => {
            appState.toast(`Сохранено · ${count} оценок`);
            setTimeout(() => nav.back(), 800);
          }}
        >
          {count === 0 ? 'Выставите оценки' : `Сохранить (${count})`}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ═══ AI TEST UPLOAD ═══
export function TeacherAIUpload({ nav }) {
  const { c } = useTheme();
  const appState = useAppState();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!generating) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2000, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [generating]);

  if (done) {
    return (
      <Screen>
        <ScreenHeader title="Тест готов" back={() => nav.back()} />
        <View style={{ paddingHorizontal: 16, alignItems: 'center' }}>
          <HexBadge size={110} fill={c.green} icon="check" iconColor="#fff" iconSize={50} iconStrokeWidth={3} style={{ marginTop: 24 }} />
          <Txt style={{ fontSize: 24, fontWeight: '700', marginTop: 18, letterSpacing: -0.4 }}>5 вопросов готово</Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 6, textAlign: 'center' }}>AI создал тест по материалам урока. Ученики увидят его сегодня.</Txt>
        </View>
        <Card style={{ marginHorizontal: 16, marginTop: 24, padding: 16 }}>
          <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 }}>Превью</Txt>
          {AI_QUESTIONS.slice(0, 3).map((q, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: c.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ color: c.blue, fontSize: 11, fontWeight: '700' }}>{i + 1}</Txt>
              </View>
              <Txt style={{ flex: 1, fontSize: 13, fontWeight: '500' }}>{q.q}</Txt>
            </View>
          ))}
        </Card>
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100, flexDirection: 'row', gap: 8 }}>
          <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onPress={() => setDone(false)}>Изменить</PrimaryButton>
          <PrimaryButton color="green" full={false} style={{ flex: 1 }} onPress={() => { appState.toast('Тест отправлен классу'); nav.back(); }}>Отправить классу</PrimaryButton>
        </View>
      </Screen>
    );
  }

  if (generating) {
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
      <Screen>
        <ScreenHeader title="AI-тест" back={() => setGenerating(false)} />
        <View style={{ paddingHorizontal: 16, paddingTop: 40, alignItems: 'center' }}>
          <View style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', transform: [{ rotate }] }}>
              <View style={{ width: 110, height: 110, borderRadius: 34, backgroundColor: c.red }} />
            </Animated.View>
            <Icon name="sparkle" size={48} color="#fff" />
          </View>
          <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 20 }}>AI читает материалы…</Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 6, textAlign: 'center' }}>Создаём 5 вопросов на основе сказки</Txt>
          <View style={{ marginTop: 28, height: 6, borderRadius: 999, backgroundColor: c.bg2, overflow: 'hidden', width: 240 }}>
            <View style={{ width: '60%', height: '100%', backgroundColor: c.red }} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="AI-тест" back={() => nav.back()} />
      <GradCard colors={GRAD.red} style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 26 }} padding={22}>
        <HexBadge size={56} fill="rgba(255,255,255,0.20)" icon="sparkle" iconColor="#fff" iconSize={28} />
        <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 14, letterSpacing: -0.4 }}>Сгенерировать тест</Txt>
        <Txt style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Загрузите материалы — AI создаст тест</Txt>
      </GradCard>

      <SectionTitle title="Материалы урока" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="book" size={20} color={c.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 14, fontWeight: '600' }}>Сказка «Алдар-Косе»</Txt>
          <Txt style={{ fontSize: 12, color: c.ink3 }}>chteniye_4b_2.pdf · 1.2 МБ</Txt>
        </View>
        <Pill color="green"><Icon name="check" size={11} /></Pill>
      </Card>
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: c.borderStrong }} onPress={() => appState.toast('Открываем файлы…')}>
        <View style={{ alignItems: 'center', padding: 8 }}>
          <Icon name="upload" size={28} color={c.ink3} />
          <Txt style={{ fontSize: 13, fontWeight: '600', marginTop: 8 }}>Загрузить ещё материал</Txt>
          <Txt style={{ fontSize: 11, color: c.ink3, marginTop: 4 }}>PDF, DOCX, изображения</Txt>
        </View>
      </Card>

      <SectionTitle title="Параметры теста" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 0 }}>
        <ProfileRow icon="grid" title="Тип" value="С выбором ответа" />
        <ProfileRow icon="target" title="Вопросов" value="5" />
        <ProfileRow icon="clock" title="Время" value="5 мин" />
        <ProfileRow icon="user" title="Класс" value="4 «Б»" last />
      </Card>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}>
        <PrimaryButton
          color="red"
          onPress={() => {
            setGenerating(true);
            setTimeout(() => { setGenerating(false); setDone(true); }, 2200);
          }}
        >
          <Icon name="sparkle" size={18} color="#fff" />
          <Txt style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}> Сгенерировать тест</Txt>
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ═══ FEEDBACK WRITE ═══
export function TeacherFeedbackWrite({ nav }) {
  const { c } = useTheme();
  const appState = useAppState();
  const [picked, setPicked] = useState(0);
  const [rating, setRating] = useState(5);
  const [strengths, setStrengths] = useState({ 'Активно работает': true, 'Помогает другим': true, 'Прогресс в чтении': true });
  const student = CLASS_ROSTER[picked];
  const tags = ['Активно работает', 'Помогает другим', 'Прогресс в чтении', 'Точность', 'Любознательность', 'Лидерство'];
  return (
    <Screen>
      <ScreenHeader title="Фидбек · Май" back={() => nav.back()} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
        {CLASS_ROSTER.slice(0, 6).map((s, i) => {
          const on = i === picked;
          return (
            <Pressable
              key={i}
              onPress={() => setPicked(i)}
              style={{ alignItems: 'center', gap: 4, padding: 8, borderRadius: 16, backgroundColor: on ? c.greenSoft : 'transparent', borderWidth: 1, borderColor: on ? c.green : 'transparent' }}
            >
              <Avatar name={s.name} size={40} color={s.avatar} />
              <Txt style={{ fontSize: 11, fontWeight: '600', color: on ? c.green : c.ink3 }}>{s.name.split(' ')[0]}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={student.name} size={48} color={student.avatar} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 16, fontWeight: '700' }}>{student.name}</Txt>
          <Txt style={{ fontSize: 12, color: c.ink3 }}>4 «Б» · посещаемость 96%</Txt>
        </View>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>Общая оценка</Txt>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setRating(i)} style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: i <= rating ? c.goldSoft : c.bg2 }}>
              <Icon name="star" size={22} color={i <= rating ? c.gold : c.ink3} />
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <Txt style={{ fontSize: 11, fontWeight: '600', color: c.green, textTransform: 'uppercase', letterSpacing: 0.3 }}>Что радует</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {tags.map((s, i) => {
            const on = strengths[s];
            return (
              <Pressable
                key={i}
                onPress={() => setStrengths((p) => ({ ...p, [s]: !p[s] }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? c.greenSoft : c.surface2, borderWidth: 1, borderColor: on ? c.green : c.border }}
              >
                {on ? <Icon name="check" size={11} color={c.green} /> : null}
                <Txt style={{ fontSize: 13, fontWeight: '600', color: on ? c.green : c.ink2 }}>{s}</Txt>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>Комментарий</Txt>
          <Pill color="blue"><Icon name="sparkle" size={11} /><Txt style={{ fontSize: 12, fontWeight: '600' }}> AI-черновик</Txt></Pill>
        </View>
        <Txt style={{ fontSize: 14, color: c.ink, marginTop: 12, lineHeight: 22 }}>
          Айкоркем показала отличные результаты в этом месяце. Особенно радует прогресс в чтении — стала читать с выражением...
        </Txt>
        <Pressable onPress={() => appState.toast('Редактор откроется')} style={{ marginTop: 10 }}>
          <Txt style={{ fontSize: 13, fontWeight: '600', color: c.green }}>Редактировать →</Txt>
        </Pressable>
      </Card>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100, flexDirection: 'row', gap: 8 }}>
        <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onPress={() => appState.toast('Черновик сохранён')}>Сохранить</PrimaryButton>
        <PrimaryButton
          color="green"
          full={false}
          style={{ flex: 1 }}
          onPress={() => {
            appState.markFeedbackSent(student.name);
            appState.toast(`Отправлено · ${student.name}`);
            if (picked + 1 < Math.min(6, CLASS_ROSTER.length)) setTimeout(() => setPicked(picked + 1), 600);
          }}
        >
          Отправить родителям
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ═══ PROFILE ═══
export function TeacherProfile({ onSignOut }) {
  const { c, dark, toggle } = useTheme();
  const classes = [
    { c: '4 «Б»', sub: 'Кл. руководитель · 24 ученика', color: 'green' },
    { c: '4 «А»', sub: 'Математика · 22 ученика', color: 'blue' },
    { c: '4 «В»', sub: 'Математика · 21 ученик', color: 'red' },
  ];
  return (
    <Screen>
      <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' }}>
        <Avatar name={TEACHER.name} size={86} color="red" />
        <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 12, letterSpacing: -0.3 }}>{TEACHER.name}</Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 2 }}>{TEACHER.subject}</Txt>
      </View>

      <SectionTitle title="Мои классы" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 0 }}>
        {classes.map((cl, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i < classes.length - 1 ? 1 : 0, borderBottomColor: c.border, gap: 12 }}
          >
            <HexBadge size={40} fill={brandColor(c, cl.color)}>
              <Txt style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{cl.c}</Txt>
            </HexBadge>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, fontWeight: '600' }}>{cl.c}</Txt>
              <Txt style={{ fontSize: 12, color: c.ink3 }}>{cl.sub}</Txt>
            </View>
            <Icon name="chevronRight" size={14} color={c.ink3} />
          </View>
        ))}
      </Card>

      <SectionTitle title="Настройки" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 0 }}>
        <Pressable onPress={toggle}>
          <ProfileRow icon="settings" title="Тёмная тема" value={dark ? 'Вкл' : 'Выкл'} />
        </Pressable>
        <ProfileRow icon="bell" title="Уведомления" />
        <ProfileRow icon="face" title="Face ID" value="Включён" last />
      </Card>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}>
        <Pressable onPress={onSignOut} style={{ padding: 14, alignItems: 'center' }}>
          <Txt style={{ color: c.red, fontWeight: '600', fontSize: 14 }}>Выйти</Txt>
        </Pressable>
      </View>
    </Screen>
  );
}
