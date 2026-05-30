import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen, shadowLg } from '@shared/components/Screen';
import { Txt, Ink } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Hex, HexBadge, TamosGlyph } from '@shared/components/Hex';
import { Card, Pill, Avatar, PrimaryButton, AppHeader, ScreenHeader, SectionTitle, CircleButton } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';
import { useAppState } from '@shared/state/AppState';
import {
  STUDENT,
  SUBJECT_COLORS,
  TODAY_SCHEDULE,
  SUBJECTS_DIARY,
  CLUBS,
  ACHIEVEMENTS,
  EVENTS,
  HOMEWORK,
  AI_TESTS_AVAILABLE,
  AI_TESTS_DONE,
  AI_QUESTIONS,
} from '@shared/data/mock';
import { LessonRow, SubjectRow, ProfileRow, QRMockup, brandColor } from '@shared/ui/rows';

const chunk = (arr, n) => arr.reduce((rows, item, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(item);
  return rows;
}, []);

// ═══ HOME ═══
export function StudentHome({ nav }) {
  const { c } = useTheme();
  const state = useAppState();
  const next = TODAY_SCHEDULE.find((l) => l.status === 'now' || l.status === 'next');

  const tiles = [
    { id: 'schedule', label: 'Расписание', sub: 'Дни и уроки', icon: 'calendar', color: 'blue' },
    { id: 'diary', label: 'Дневник', sub: 'Оценки', icon: 'book', color: 'green' },
    { id: 'events', label: 'Ивенты', sub: 'Школьные события', icon: 'star', color: 'red' },
    { id: 'checkout', label: 'QR', sub: 'Вход и уход', icon: 'qr', color: 'gold' },
    { id: 'map', label: 'Карта', sub: 'Найти кабинет', icon: 'map', color: 'green' },
    { id: 'clubs', label: 'Кружки', sub: 'Записаться', icon: 'bag', color: 'blue' },
  ];

  const stats = [
    { id: 'stars', label: 'Звёзды', icon: 'star', color: c.goldDeep, value: state.stars, to: 'profile' },
    { id: 'coins', label: 'Коины', icon: 'coin', color: c.red, value: state.coins, to: 'shop' },
    { id: 'streak', label: 'Серия', icon: 'flame', color: c.red, value: STUDENT.streak, to: 'profile', unit: 'дн.' },
  ];

  return (
    <Screen>
      <AppHeader
        greeting="Сәлем,"
        name={STUDENT.short}
        right={
          <CircleButton
            icon="bell"
            badge={state.notifications > 0}
            onPress={() => {
              state.clearNotifications();
              state.toast('Уведомления отмечены');
            }}
          />
        }
      />

      <GradCard colors={GRAD.greenDeep} style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 26 }} padding={20} patternSize={32}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 13, opacity: 0.85, fontWeight: '500' }}>Сейчас идёт урок</Txt>
            <Txt style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginTop: 2 }}>{next.subject}</Txt>
            <Txt style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{next.room} · {next.teacher}</Txt>
          </View>
          <Pill style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff' }}>{`${next.time}–${next.end}`}</Pill>
        </View>
        <View style={{ marginTop: 16, height: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ width: `${(next.progress || 0.6) * 100}%`, height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Txt style={{ fontSize: 11, opacity: 0.85 }}>осталось 17 мин</Txt>
          <Pressable onPress={() => nav('checkout')}>
            <Txt style={{ color: '#fff', fontWeight: '600', fontSize: 11, opacity: 0.95 }}>Показать QR →</Txt>
          </Pressable>
        </View>
      </GradCard>

      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 18 }}>
        {stats.map((s) => (
          <Card key={s.id} style={{ flex: 1, padding: 14 }} onPress={() => nav(s.to)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name={s.icon} size={18} color={s.color} />
              <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</Txt>
            </View>
            <Txt style={{ fontSize: 24, fontWeight: '700', marginTop: 6 }}>
              {s.value}
              {s.unit ? <Txt style={{ fontSize: 13, color: c.ink3, fontWeight: '500' }}> {s.unit}</Txt> : null}
            </Txt>
          </Card>
        ))}
      </View>

      <SectionTitle title="Что открыть" />
      <View style={{ marginHorizontal: 16, marginBottom: 18, gap: 8 }}>
        {chunk(tiles, 3).map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((t) => (
              <Card key={t.id} onPress={() => nav(t.id)} style={{ flex: 1, padding: 14, gap: 10 }}>
                <HexBadge size={44} fill={brandColor(c, t.color)} icon={t.icon} iconColor="#fff" iconSize={20} />
                <View>
                  <Txt style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.1 }}>{t.label}</Txt>
                  <Txt style={{ fontSize: 11, color: c.ink3, marginTop: 1 }}>{t.sub}</Txt>
                </View>
              </Card>
            ))}
          </View>
        ))}
      </View>

      <SectionTitle
        title="Сегодня"
        right={
          <Pressable onPress={() => nav('schedule')}>
            <Txt style={{ color: c.green, fontSize: 14, fontWeight: '600' }}>Всё расписание →</Txt>
          </Pressable>
        }
      />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 100 }}>
        {TODAY_SCHEDULE.slice(0, 3).map((l, i) => (
          <LessonRow key={i} lesson={l} onPress={() => nav('lesson', l)} />
        ))}
      </View>
    </Screen>
  );
}

// ═══ SCHEDULE ═══
export function StudentSchedule({ nav }) {
  const { c } = useTheme();
  const [day, setDay] = useState(2);
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
  const dates = [26, 27, 28, 29, 30];
  return (
    <Screen>
      <ScreenHeader title="Расписание" large sub="Май 2026 · 4 «Б»" />
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 }}>
        {days.map((d, i) => {
          const on = i === day;
          return (
            <Pressable
              key={d}
              onPress={() => setDay(i)}
              style={{
                flex: 1,
                height: 64,
                borderRadius: 18,
                backgroundColor: on ? c.green : c.surface,
                borderWidth: on ? 0 : 1,
                borderColor: c.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt style={{ fontSize: 11, opacity: 0.8, color: on ? '#fff' : c.ink, fontWeight: '600' }}>{d}</Txt>
              <Txt style={{ fontSize: 18, marginTop: 2, color: on ? '#fff' : c.ink, fontWeight: '600' }}>{dates[i]}</Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 10, marginHorizontal: 16, marginBottom: 100 }}>
        {TODAY_SCHEDULE.map((l, i) => (
          <LessonRow key={i} lesson={l} onPress={() => nav('lesson', l)} />
        ))}
      </View>
    </Screen>
  );
}

// ═══ LESSON DETAIL ═══
export function StudentLesson({ nav, payload }) {
  const { c } = useTheme();
  const state = useAppState();
  const lesson = payload || TODAY_SCHEDULE[2];
  const subInfo = SUBJECT_COLORS[lesson.subject] || { color: 'gray' };
  const color = brandColor(c, subInfo.color);
  const hwKey = `${lesson.subject}-${lesson.time}`;
  const isDone = state.homework[hwKey];
  return (
    <Screen>
      <ScreenHeader title={lesson.subject} back={() => nav.back()} />
      <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 24, overflow: 'hidden' }}>
        <View style={{ backgroundColor: color, padding: 22 }}>
          <Ink color="#fff">
            <Pill style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff' }}>{`${lesson.time}–${lesson.end}`}</Pill>
            <Txt style={{ fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 8 }}>{lesson.subject}</Txt>
            <Txt style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{lesson.room} · {lesson.teacher}</Txt>
          </Ink>
        </View>
      </View>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="book" size={14} color={c.ink3} />
          <Txt style={{ color: c.ink3, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>Сегодня изучаем</Txt>
        </View>
        <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 6 }}>Сказки народов Казахстана</Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8, lineHeight: 21 }}>
          Читаем сказку «Алдар-Косе и бай», разбираем главных героев и обсуждаем мораль. Дома — нарисовать любимого героя.
        </Txt>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="pencil" size={14} color={c.ink3} />
            <Txt style={{ color: c.ink3, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>Домашнее задание</Txt>
          </View>
          <Pill color="gold">до завтра</Pill>
        </View>
        <Txt style={{ fontSize: 16, fontWeight: '600', marginTop: 8 }}>Стр. 42–45 + рисунок героя</Txt>
        <Txt style={{ fontSize: 13, color: c.ink2, marginTop: 6, lineHeight: 20 }}>
          Прочитать, ответить устно на вопросы 1–3, нарисовать в альбоме любимого героя.
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PrimaryButton
            color={isDone ? 'ghost' : 'green'}
            full={false}
            style={{ height: 42, flex: 1 }}
            onPress={() => {
              if (!isDone) {
                state.toggleHomework(hwKey);
                state.addStars(5);
                state.toast('+5 ★ за домашнее задание');
              } else state.toggleHomework(hwKey);
            }}
          >
            {isDone ? (
              <>
                <Icon name="check" size={16} color={c.ink} />
                <Txt style={{ fontSize: 16, fontWeight: '600', color: c.ink }}> Готово</Txt>
              </>
            ) : (
              'Отметить готово'
            )}
          </PrimaryButton>
          <Pressable
            onPress={() => state.toast('Открываем камеру…')}
            style={{ height: 42, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt style={{ fontWeight: '600', fontSize: 14 }}>Прикрепить фото</Txt>
          </Pressable>
        </View>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 100, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="target" size={14} color={c.ink3} />
          <Txt style={{ color: c.ink3, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>После урока</Txt>
        </View>
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, backgroundColor: c.greenSoft, borderRadius: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="qr" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 14, fontWeight: '600' }}>Покажи QR учителю</Txt>
            <Txt style={{ fontSize: 12, color: c.ink2 }}>В конце урока, для отметки</Txt>
          </View>
          <Pressable onPress={() => nav('checkout')}>
            <Txt style={{ color: c.green, fontWeight: '600', fontSize: 14 }}>QR →</Txt>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}

// ═══ CHECKOUT QR ═══
export function StudentCheckoutQR({ nav }) {
  const { c } = useTheme();
  return (
    <Screen>
      <ScreenHeader title="Отметка ухода" back={() => nav.back()} />
      <View style={{ paddingHorizontal: 16, alignItems: 'center' }}>
        <Txt style={{ fontSize: 24, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' }}>Покажи QR учителю</Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 6, textAlign: 'center' }}>
          Учитель отсканирует код и отметит, что ты ушёл с урока вовремя.
        </Txt>

        <View style={[{ marginTop: 24, marginBottom: 16, width: 240, height: 240, padding: 18, backgroundColor: '#fff', borderRadius: 26, alignItems: 'center', justifyContent: 'center' }, shadowLg]}>
          <QRMockup size={204} />
          <View style={{ position: 'absolute', width: 48, height: 48 }}>
            <TamosGlyph size={48} />
          </View>
        </View>

        <Pill color="green">
          <Icon name="clock" size={12} />
          <Txt style={{ fontSize: 12, fontWeight: '600' }}> Действует ещё 4:32</Txt>
        </Pill>

        <Card style={{ marginTop: 28, padding: 16, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name="Алия Н." size={42} color="blue" />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>Урок чтения</Txt>
            <Txt style={{ fontSize: 15, fontWeight: '600' }}>Алия Нурлановна</Txt>
          </View>
          <Pill color="gray">каб. 207</Pill>
        </Card>

        <Pressable onPress={() => nav.back()} style={{ marginTop: 18 }}>
          <Txt style={{ color: c.ink2, fontSize: 14, fontWeight: '600' }}>Закрыть</Txt>
        </Pressable>
      </View>
    </Screen>
  );
}

// ═══ DIARY ═══
export function StudentDiary({ nav }) {
  const { c } = useTheme();
  return (
    <Screen>
      <ScreenHeader title="Дневник" large sub="Средний балл · 4.6" />
      <View style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 18 }}>
        <Card style={{ padding: 16, backgroundColor: c.surface2, borderStyle: 'dashed', borderColor: c.borderStrong }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <HexBadge size={40} fill={c.blue} icon="sparkle" iconColor="#fff" iconSize={18} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, fontWeight: '600' }}>Бета-версия дневника</Txt>
              <Txt style={{ fontSize: 12, color: c.ink2 }}>Скоро: расширенные оценки и аналитика</Txt>
            </View>
          </View>
        </Card>
      </View>

      <SectionTitle title="Предметы" />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 100 }}>
        {SUBJECTS_DIARY.map((s, i) => (
          <SubjectRow key={i} subject={s} onPress={() => nav('subject', s)} />
        ))}
      </View>
    </Screen>
  );
}

// ═══ SUBJECT DETAIL ═══
export function StudentSubject({ nav, payload }) {
  const { c } = useTheme();
  const s = payload || SUBJECTS_DIARY[0];
  const subInfo = SUBJECT_COLORS[s.name] || { color: 'gray', emoji: '◇' };
  const grades = [
    { d: '24 мая', g: 5, kind: 'Контрольная работа' },
    { d: '20 мая', g: 5, kind: 'Урок' },
    { d: '17 мая', g: 4, kind: 'Урок' },
    { d: '15 мая', g: 5, kind: 'Домашнее задание' },
  ];
  return (
    <Screen>
      <ScreenHeader title={s.name} back={() => nav.back()} />
      <GradCard colors={[brandColor(c, subInfo.color), brandColor(c, subInfo.color)]} withPattern style={{ marginHorizontal: 16, marginBottom: 18, borderRadius: 26 }} padding={22} patternSize={26}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Txt style={{ fontSize: 12, opacity: 0.85 }}>Средний балл</Txt>
            <Txt style={{ fontSize: 56, fontWeight: '800', marginTop: 4 }}>{s.avg}</Txt>
            <Txt style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>↑ +0.2 за месяц</Txt>
          </View>
          <HexBadge size={80} fill="rgba(255,255,255,0.18)">
            <Txt style={{ fontSize: 32, color: '#fff' }}>{subInfo.emoji}</Txt>
          </HexBadge>
        </View>
      </GradCard>

      <SectionTitle title="Последние оценки" />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 18 }}>
        {grades.map((row, i) => (
          <Card key={i} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: row.g === 5 ? c.greenSoft : c.goldSoft }}>
              <Txt style={{ fontSize: 20, fontWeight: '700', color: row.g === 5 ? c.green : c.goldDeep }}>{row.g}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, fontWeight: '600' }}>{row.kind}</Txt>
              <Txt style={{ fontSize: 12, color: c.ink3 }}>{row.d}</Txt>
            </View>
          </Card>
        ))}
      </View>

      <SectionTitle title="Домашние задания" />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 100 }}>
        <Card style={{ padding: 14 }}>
          <Pill color="gold">До завтра</Pill>
          <Txt style={{ fontSize: 15, fontWeight: '600', marginTop: 6 }}>№ 215, 217 на стр. 88</Txt>
          <Txt style={{ fontSize: 12, color: c.ink2, marginTop: 2 }}>Айгерим Болатовна</Txt>
        </Card>
      </View>
    </Screen>
  );
}

// ═══ CLUBS ═══
function ClubCard({ club, onPress }) {
  const { c } = useTheme();
  const full = club.spots === 0;
  return (
    <Card onPress={onPress} style={{ padding: 14, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
      <HexBadge size={56} fill={brandColor(c, club.color)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Txt style={{ fontSize: 15, fontWeight: '700' }}>{club.name}</Txt>
          {club.enrolled ? (
            <Pill color="green">
              <Icon name="check" size={11} />
              <Txt style={{ fontSize: 12, fontWeight: '600' }}> Записан</Txt>
            </Pill>
          ) : null}
        </View>
        <Txt style={{ fontSize: 12, color: c.ink2, marginTop: 3 }}>{club.teacher} · {club.schedule}</Txt>
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 6, backgroundColor: c.bg2, borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ width: `${((club.total - club.spots) / club.total) * 100}%`, height: '100%', backgroundColor: full ? c.red : brandColor(c, club.color), borderRadius: 999 }} />
          </View>
          <Txt style={{ fontSize: 11, color: full ? c.red : c.ink3, fontWeight: '600' }}>{full ? 'Лист ожидания' : `${club.spots} мест`}</Txt>
        </View>
      </View>
    </Card>
  );
}

export function StudentClubs({ nav }) {
  const { c } = useTheme();
  const state = useAppState();
  const [filter, setFilter] = useState('Все');
  const filters = ['Все', 'Tech', 'Творчество', 'Спорт', 'Наука', 'Логика'];
  const list = CLUBS.map((club) => ({ ...club, enrolled: state.clubs[club.name] ?? club.enrolled }));
  const filtered = filter === 'Все' ? list : list.filter((club) => club.tag === filter);
  return (
    <Screen>
      <ScreenHeader title="Кружки" large sub="Дополнительные занятия и записи" />
      <View style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {filters.map((f) => {
          const on = f === filter;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: on ? c.green : c.surface,
                borderWidth: on ? 0 : 1,
                borderColor: c.border,
              }}
            >
              <Txt style={{ fontSize: 13, fontWeight: '600', color: on ? '#fff' : c.ink2 }}>{f}</Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 10, marginHorizontal: 16, marginBottom: 100 }}>
        {filtered.map((club, i) => (
          <ClubCard key={i} club={club} onPress={() => nav('club', club)} />
        ))}
      </View>
    </Screen>
  );
}

// ═══ CLUB DETAIL ═══
export function StudentClub({ nav, payload }) {
  const { c } = useTheme();
  const state = useAppState();
  const club = payload || CLUBS[1];
  const enrolled = state.clubs[club.name] ?? club.enrolled;
  const full = club.spots === 0 && !enrolled;
  return (
    <Screen>
      <ScreenHeader title="Кружок" back={() => nav.back()} />
      <GradCard colors={[brandColor(c, club.color), brandColor(c, club.color)]} style={{ marginHorizontal: 16, marginBottom: 18, borderRadius: 26 }} padding={22}>
        <Pill style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff' }}>{club.tag}</Pill>
        <Txt style={{ fontSize: 26, fontWeight: '700', marginTop: 8, lineHeight: 29, letterSpacing: -0.5 }}>{club.name}</Txt>
        <Txt style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>{club.teacher}</Txt>
      </GradCard>

      <View style={{ marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', gap: 8 }}>
        <Card style={{ flex: 1, padding: 14 }}>
          <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>Расписание</Txt>
          <Txt style={{ fontSize: 15, fontWeight: '700', marginTop: 4 }}>{club.schedule}</Txt>
        </Card>
        <Card style={{ flex: 1, padding: 14 }}>
          <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>Свободных мест</Txt>
          <Txt style={{ fontSize: 15, fontWeight: '700', marginTop: 4 }}>{club.spots} из {club.total}</Txt>
        </Card>
      </View>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, letterSpacing: 0.3, textTransform: 'uppercase' }}>О кружке</Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 8, lineHeight: 21 }}>
          Учимся играть в шахматы с нуля. Развиваем логику, стратегическое мышление и умение планировать ходы наперёд. В конце года — турнир и медали.
        </Txt>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={club.teacher} size={42} color={club.color} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>Преподаватель</Txt>
          <Txt style={{ fontSize: 15, fontWeight: '600' }}>{club.teacher}</Txt>
        </View>
      </Card>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}>
        {full ? (
          <PrimaryButton color="ghost" onPress={() => state.toast('Записан в лист ожидания')}>В лист ожидания</PrimaryButton>
        ) : enrolled ? (
          <PrimaryButton color="ghost" onPress={() => { state.toggleClub(club.name); state.toast('Запись отменена'); }}>Отменить запись</PrimaryButton>
        ) : (
          <PrimaryButton color="green" onPress={() => { state.toggleClub(club.name); state.toast(`Записан на «${club.name}»`); }}>Записаться</PrimaryButton>
        )}
      </View>
    </Screen>
  );
}

// ═══ TEST TAB ═══
function HomeworkRow({ hw, state }) {
  const { c } = useTheme();
  const key = `${hw.subject}-${hw.task}`;
  const isDone = state.homework[key];
  return (
    <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable
        onPress={() => {
          if (!isDone) {
            state.toggleHomework(key);
            state.addStars(5);
            state.toast('+5 ★ за домашнее задание');
          } else state.toggleHomework(key);
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          borderWidth: isDone ? 0 : 2,
          borderColor: c.borderStrong,
          backgroundColor: isDone ? c.green : c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDone ? <Icon name="check" size={16} color="#fff" strokeWidth={2.5} /> : null}
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Hex size={18} fill={brandColor(c, hw.color)} />
          <Txt style={{ fontSize: 12, fontWeight: '600', color: c.ink3 }}>{hw.subject}</Txt>
        </View>
        <Txt
          style={{
            fontSize: 14,
            fontWeight: '600',
            marginTop: 4,
            textDecorationLine: isDone ? 'line-through' : 'none',
            color: isDone ? c.ink3 : c.ink,
          }}
        >
          {hw.task}
        </Txt>
      </View>
      <Pill color={hw.urgent ? 'red' : 'gray'}>{hw.due}</Pill>
    </Card>
  );
}

function TestRow({ test, nav }) {
  const { c } = useTheme();
  const done = test.status === 'done';
  return (
    <Card onPress={() => !done && nav('aitest')} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: done ? 0.85 : 1 }}>
      <HexBadge size={44} fill={done ? c.bg2 : brandColor(c, test.color)} icon={done ? 'check' : 'sparkle'} iconColor={done ? c.green : '#fff'} iconSize={20} iconStrokeWidth={done ? 2.4 : 1.8} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>{test.subject}</Txt>
        <Txt style={{ fontSize: 14, fontWeight: '600', marginTop: 2 }}>{test.title}</Txt>
        <Txt style={{ fontSize: 11, color: c.ink3, marginTop: 2 }}>
          {test.qs} вопросов · {done ? `${test.date} · ${test.score}` : `+${test.reward} ★`}
        </Txt>
      </View>
      {!done ? <Icon name="chevronRight" size={18} color={c.ink3} /> : null}
    </Card>
  );
}

export function StudentTest({ nav }) {
  const { c } = useTheme();
  const state = useAppState();
  const [tab, setTab] = useState('hw');
  const segs = [
    { id: 'hw', label: 'Домашка', count: HOMEWORK.length },
    { id: 'tests', label: 'AI-тесты', count: AI_TESTS_AVAILABLE.length },
  ];
  return (
    <Screen>
      <ScreenHeader title="Учёба" large sub="Домашние задания и AI-тесты" />

      <View style={{ flexDirection: 'row', gap: 4, backgroundColor: c.bg2, marginHorizontal: 16, marginBottom: 14, borderRadius: 16, padding: 4 }}>
        {segs.map((t) => {
          const on = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: on ? c.surface : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Txt style={{ fontWeight: '600', fontSize: 14, color: on ? c.ink : c.ink3 }}>{t.label}</Txt>
              <View style={{ backgroundColor: on ? c.green : c.ink3, borderRadius: 999, paddingVertical: 1, paddingHorizontal: 7 }}>
                <Txt style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{t.count}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      {tab === 'hw' ? (
        <>
          <SectionTitle title="К завтра" right={<Pill color="red">{`${HOMEWORK.filter((h) => h.urgent).length}`}</Pill>} />
          <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 18 }}>
            {HOMEWORK.filter((h) => h.urgent).map((h, i) => (
              <HomeworkRow key={i} hw={h} state={state} />
            ))}
          </View>
          <SectionTitle title="На неделю" />
          <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 100 }}>
            {HOMEWORK.filter((h) => !h.urgent).map((h, i) => (
              <HomeworkRow key={i} hw={h} state={state} />
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <GradCard colors={GRAD.blue} padding={18} radius={20} onPress={() => nav('aitest')} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <HexBadge size={56} fill="rgba(255,255,255,0.20)" icon="sparkle" iconColor="#fff" iconSize={28} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.85 }}>Сегодня</Txt>
                <Txt style={{ fontSize: 17, fontWeight: '700', marginTop: 2 }}>Тест по чтению</Txt>
                <Txt style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>5 вопросов · +20 звёзд</Txt>
              </View>
              <Icon name="arrowRight" size={22} color="#fff" />
            </GradCard>
          </View>

          <SectionTitle title="Доступные тесты" />
          <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 18 }}>
            {AI_TESTS_AVAILABLE.map((t, i) => (
              <TestRow key={i} test={t} nav={nav} />
            ))}
          </View>

          <SectionTitle title="История" />
          <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 100 }}>
            {AI_TESTS_DONE.map((t, i) => (
              <TestRow key={i} test={t} nav={nav} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

// ═══ AI TEST ═══
export function StudentAITest({ nav }) {
  const { c } = useTheme();
  const state = useAppState();
  const [step, setStep] = useState('intro');
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);

  const total = AI_QUESTIONS.length;
  const correctCount = answers.reduce((n, a, i) => n + (a === AI_QUESTIONS[i].correct ? 1 : 0), 0);
  const reward = correctCount * 4;

  if (step === 'intro') {
    return (
      <Screen>
        <ScreenHeader title="AI-тест" back={() => nav.back()} />
        <View style={{ paddingHorizontal: 16 }}>
          <GradCard colors={GRAD.blue} padding={24} radius={26} patternSize={30}>
            <HexBadge size={64} fill="rgba(255,255,255,0.18)" icon="sparkle" iconColor="#fff" iconSize={32} />
            <Txt style={{ fontSize: 24, fontWeight: '700', marginTop: 16, letterSpacing: -0.5 }}>Чтение · 4 класс</Txt>
            <Txt style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Сказка «Алдар-Косе и бай»</Txt>
            <View style={{ marginTop: 18, flexDirection: 'row', gap: 16 }}>
              <View>
                <Txt style={{ fontSize: 11, opacity: 0.7 }}>Вопросов</Txt>
                <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 2 }}>{total}</Txt>
              </View>
              <View>
                <Txt style={{ fontSize: 11, opacity: 0.7 }}>Время</Txt>
                <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 2 }}>5 мин</Txt>
              </View>
              <View>
                <Txt style={{ fontSize: 11, opacity: 0.7 }}>Награда</Txt>
                <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 2 }}>+20 ★</Txt>
              </View>
            </View>
          </GradCard>

          <Card style={{ marginTop: 14, padding: 16, backgroundColor: c.surface2, borderStyle: 'dashed', borderColor: c.borderStrong }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Icon name="sparkle" size={18} color={c.blue} />
              <Txt style={{ fontSize: 13, color: c.ink2, flex: 1 }}>Тест сгенерирован AI на основе материалов урока, загруженных учителем.</Txt>
            </View>
          </Card>

          <View style={{ marginTop: 18 }}>
            <PrimaryButton color="blue" onPress={() => { setStep('q'); setQIdx(0); setAnswers([]); setSelected(null); }}>
              <Icon name="play" size={16} color="#fff" />
              <Txt style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}> Начать</Txt>
            </PrimaryButton>
          </View>
        </View>
      </Screen>
    );
  }

  if (step === 'q') {
    const cur = AI_QUESTIONS[qIdx];
    return (
      <Screen>
        <ScreenHeader title={`Вопрос ${qIdx + 1} из ${total}`} back={() => nav.back()} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 18 }}>
            {AI_QUESTIONS.map((_, i) => (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: i <= qIdx ? c.blue : c.bg2 }} />
            ))}
          </View>
          <Txt style={{ fontSize: 13, color: c.ink3, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>Вопрос</Txt>
          <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 6, letterSpacing: -0.3, lineHeight: 29 }}>{cur.q}</Txt>

          <View style={{ gap: 10, marginTop: 18 }}>
            {cur.options.map((o) => {
              const on = selected === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setSelected(o.id)}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    backgroundColor: on ? c.blueSoft : c.surface,
                    borderWidth: 2,
                    borderColor: on ? c.blue : c.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: on ? c.blue : c.bg2, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ color: on ? '#fff' : c.ink3, fontWeight: '700', fontSize: 14, textTransform: 'uppercase' }}>{o.id}</Txt>
                  </View>
                  <Txt style={{ fontSize: 14, fontWeight: '500', flex: 1 }}>{o.t}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}>
          <PrimaryButton
            color="blue"
            disabled={!selected}
            onPress={() => {
              const newAns = [...answers, selected];
              setAnswers(newAns);
              setSelected(null);
              if (qIdx + 1 < total) {
                setQIdx(qIdx + 1);
              } else {
                const correct = newAns.reduce((n, a, i) => n + (a === AI_QUESTIONS[i].correct ? 1 : 0), 0);
                const r = correct * 4;
                state.addStars(r);
                state.toast(`+${r} ★ за тест`);
                setStep('result');
              }
            }}
          >
            {qIdx + 1 === total ? 'Завершить' : 'Ответить'}
          </PrimaryButton>
        </View>
      </Screen>
    );
  }

  const passed = correctCount >= 3;
  return (
    <Screen>
      <ScreenHeader title="Готово!" back={() => nav.back()} />
      <View style={{ paddingHorizontal: 16, alignItems: 'center' }}>
        <HexBadge size={120} fill={passed ? c.green : c.goldDeep} icon={passed ? 'check' : 'star'} iconColor="#fff" iconSize={56} iconStrokeWidth={3} style={{ marginTop: 24 }} />
        <Txt style={{ fontSize: 28, fontWeight: '700', marginTop: 20, letterSpacing: -0.5 }}>{passed ? 'Отлично!' : 'Хорошая попытка!'}</Txt>
        <Txt style={{ fontSize: 15, color: c.ink2, marginTop: 6 }}>{correctCount} из {total} правильных ответов</Txt>

        <Card style={{ marginTop: 24, padding: 20, alignSelf: 'stretch', backgroundColor: c.goldSoft, borderColor: c.goldDeep }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <HexBadge size={48} fill={c.goldDeep} icon="star" iconColor="#fff" iconSize={24} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 13, color: c.goldDeep, fontWeight: '600' }}>+{reward} звёзд</Txt>
              <Txt style={{ fontSize: 14, color: c.ink2 }}>В копилку достижений</Txt>
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: 12, padding: 16, alignSelf: 'stretch' }}>
          <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 }}>Разбор</Txt>
          {AI_QUESTIONS.map((q, i) => {
            const ok = answers[i] === q.correct;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <View style={{ width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? c.greenSoft : c.redSoft }}>
                  <Icon name={ok ? 'check' : 'x'} size={12} color={ok ? c.green : c.red} strokeWidth={2.4} />
                </View>
                <Txt style={{ flex: 1, fontSize: 13, color: ok ? c.ink : c.ink2 }}>{q.q}</Txt>
              </View>
            );
          })}
        </Card>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100, flexDirection: 'row', gap: 8 }}>
        <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onPress={() => { setStep('intro'); setAnswers([]); }}>Ещё раз</PrimaryButton>
        <PrimaryButton color="green" full={false} style={{ flex: 1 }} onPress={() => nav.back()}>Готово</PrimaryButton>
      </View>
    </Screen>
  );
}

// ═══ EVENTS ═══
export function StudentEvents({ nav }) {
  const { c } = useTheme();
  const state = useAppState();
  return (
    <Screen>
      <ScreenHeader title="Ивенты" large sub="Школьные события и записи" />
      <View style={{ gap: 10, marginHorizontal: 16, marginBottom: 100 }}>
        {EVENTS.map((e, i) => {
          const going = state.events[e.name] ?? e.going;
          return (
            <Card key={i} style={{ padding: 0, overflow: 'hidden' }}>
              <View style={{ height: 88, overflow: 'hidden' }}>
                <View style={{ flex: 1, backgroundColor: brandColor(c, e.color), padding: 16 }}>
                  <Ink color="#fff">
                    <Pill style={{ backgroundColor: 'rgba(255,255,255,0.20)', color: '#fff' }}>
                      {e.vip ? <Icon name="star" size={10} /> : null}
                      <Txt style={{ fontSize: 12, fontWeight: '600' }}>{e.vip ? ' ' : ''}{e.tag}</Txt>
                    </Pill>
                    <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 10, lineHeight: 22 }}>{e.name}</Txt>
                  </Ink>
                </View>
              </View>
              <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View>
                  <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }}>Когда</Txt>
                  <Txt style={{ fontSize: 14, fontWeight: '600', marginTop: 2 }}>{e.date} · {e.time}</Txt>
                </View>
                <View style={{ flex: 1 }} />
                {going ? (
                  <Pressable
                    onPress={() => { state.toggleEvent(e.name); state.toast('Запись отменена'); }}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.greenSoft, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Icon name="check" size={11} color={c.green} />
                    <Txt style={{ color: c.green, fontSize: 13, fontWeight: '600' }}>Иду</Txt>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => { state.toggleEvent(e.name); state.toast(e.vip ? 'Запрос отправлен' : `Записан · ${e.name}`); }}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.green }}
                  >
                    <Txt style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{e.vip ? 'Запросить' : 'Записаться'}</Txt>
                  </Pressable>
                )}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

// ═══ ACHIEVEMENTS ═══
function AchievementCard({ a }) {
  const { c } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14, opacity: a.earned ? 1 : 0.7 }}>
      <View style={{ width: 60, height: 60 }}>
        <HexBadge size={60} fill={a.earned ? brandColor(c, a.color) : c.bg2}>
          <Txt style={{ color: a.earned ? '#fff' : c.ink3, fontSize: 26, fontWeight: '700' }}>{a.icon}</Txt>
        </HexBadge>
        {!a.earned ? (
          <View style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 999, backgroundColor: c.surface, borderWidth: 2, borderColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 12 }}>🔒</Txt>
          </View>
        ) : null}
      </View>
      <Txt style={{ fontSize: 14, fontWeight: '700', marginTop: 10 }}>{a.name}</Txt>
      <Txt style={{ fontSize: 12, color: c.ink2, marginTop: 2 }}>{a.desc}</Txt>
      {a.earned ? (
        <Pill color="gold" style={{ marginTop: 8 }}>
          <Icon name="star" size={10} />
          <Txt style={{ fontSize: 12, fontWeight: '600' }}> +{a.stars}</Txt>
        </Pill>
      ) : (
        <View style={{ marginTop: 8 }}>
          <View style={{ height: 5, backgroundColor: c.bg2, borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ width: `${a.progress * 100}%`, height: '100%', backgroundColor: brandColor(c, a.color) }} />
          </View>
          <Txt style={{ fontSize: 11, color: c.ink3, marginTop: 4, fontWeight: '600' }}>{Math.round(a.progress * 100)}%</Txt>
        </View>
      )}
    </Card>
  );
}

export function StudentAchievements() {
  const { c } = useTheme();
  return (
    <Screen>
      <ScreenHeader title="Достижения" large sub={`Уровень ${STUDENT.level} · ${STUDENT.levelTitle}`} />
      <GradCard colors={GRAD.gold} ink="#14110D" patternColor="rgba(20,17,13,0.10)" patternSize={24} style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 18 }} padding={18}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <HexBadge size={64} fill="rgba(20,17,13,0.18)">
            <Txt style={{ fontSize: 26, fontWeight: '800', color: '#14110D' }}>{STUDENT.level}</Txt>
          </HexBadge>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', opacity: 0.7 }}>Твой уровень</Txt>
            <Txt style={{ fontSize: 18, fontWeight: '700', marginTop: 2 }}>{STUDENT.levelTitle}</Txt>
            <View style={{ marginTop: 8, height: 8, backgroundColor: 'rgba(20,17,13,0.15)', borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ width: `${STUDENT.levelProgress * 100}%`, height: '100%', backgroundColor: '#14110D' }} />
            </View>
            <Txt style={{ fontSize: 11, marginTop: 4, fontWeight: '600' }}>120 ★ до уровня 8</Txt>
          </View>
        </View>
      </GradCard>

      <SectionTitle title="Ачивки" />
      <View style={{ marginHorizontal: 16, marginBottom: 100, gap: 8 }}>
        {chunk(ACHIEVEMENTS, 2).map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((a, i) => (
              <AchievementCard key={i} a={a} />
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

// ═══ SCHOOL MAP ═══
export function StudentMap() {
  const { c } = useTheme();
  const rooms = [
    { id: '204', subject: 'Математика', x: 80, y: 120, color: 'blue', size: 70 },
    { id: '312', subject: 'Английский', x: 200, y: 80, color: 'red', size: 70 },
    { id: '207', subject: 'Чтение', x: 180, y: 200, color: 'green', size: 78, active: true },
    { id: '304', subject: 'Естествозн.', x: 90, y: 250, color: 'green', size: 64 },
    { id: '110', subject: 'Музыка', x: 240, y: 320, color: 'gold', size: 64 },
    { id: 'СЗ', subject: 'Спортзал', x: 90, y: 360, color: 'red', size: 72 },
  ];
  return (
    <Screen>
      <ScreenHeader title="Карта школы" large sub="2 этаж · Главный корпус" />
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 14 }}>
        {['1 этаж', '2 этаж', '3 этаж'].map((f, i) => (
          <Pressable
            key={i}
            style={{ flex: 1, height: 40, borderRadius: 14, backgroundColor: i === 1 ? c.green : c.surface, borderWidth: i === 1 ? 0 : 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt style={{ fontWeight: '600', fontSize: 13, color: i === 1 ? '#fff' : c.ink2 }}>{f}</Txt>
          </Pressable>
        ))}
      </View>

      <View style={{ marginHorizontal: 16, marginBottom: 18, height: 460, borderRadius: 26, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
          <Path d="M 130 80 L 130 380 M 130 380 L 280 380 M 130 200 L 250 200" stroke={c.borderStrong} strokeWidth="2" strokeDasharray="6 4" fill="none" />
        </Svg>
        {rooms.map((r) => (
          <View key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.size, height: r.size, alignItems: 'center', justifyContent: 'center' }}>
            <Hex size={r.size} fill={r.active ? brandColor(c, r.color) : c.surface2} stroke={r.active ? 'transparent' : brandColor(c, r.color)} strokeWidth={r.active ? 0 : 3} style={{ position: 'absolute' }} />
            <Txt style={{ fontSize: 16, fontWeight: '800', color: r.active ? '#fff' : brandColor(c, r.color) }}>{r.id}</Txt>
            <Txt style={{ fontSize: 8, fontWeight: '600', opacity: 0.8, color: r.active ? '#fff' : brandColor(c, r.color) }}>{r.subject}</Txt>
          </View>
        ))}
        <View style={[{ position: 'absolute', left: 200, top: 230, width: 16, height: 16, borderRadius: 999, backgroundColor: c.red, borderWidth: 3, borderColor: '#fff' }, shadowLg]} />
      </View>

      <SectionTitle title="Сейчас идёт" />
      <Card style={{ marginHorizontal: 16, marginBottom: 100, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <HexBadge size={44} fill={c.green}>
          <Txt style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>207</Txt>
        </HexBadge>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 14, fontWeight: '600' }}>Чтение</Txt>
          <Txt style={{ fontSize: 12, color: c.ink3 }}>Кабинет 207 · 2 этаж</Txt>
        </View>
        <Pill color="green">Тут ты сейчас</Pill>
      </Card>
    </Screen>
  );
}

// ═══ SHOP ═══
export function StudentShop({ nav }) {
  const { c } = useTheme();
  const state = useAppState();
  const [owned, setOwned] = useState({ 'Золотая рамка': true });
  const items = [
    { name: 'Радужный ник', price: 30, color: 'red', cat: 'Профиль', kind: 'ник' },
    { name: 'Золотая рамка', price: 50, color: 'gold', cat: 'Профиль', kind: 'рамка' },
    { name: 'Аватар: Сова', price: 25, color: 'blue', cat: 'Аватары', kind: 'аватар' },
    { name: 'Аватар: Лиса', price: 25, color: 'red', cat: 'Аватары', kind: 'аватар' },
    { name: 'Аватар: Тигр', price: 40, color: 'gold', cat: 'Аватары', kind: 'аватар' },
    { name: 'Зелёный значок', price: 15, color: 'green', cat: 'Значки', kind: 'значок' },
  ];
  const glyphFor = (kind) => (kind === 'аватар' ? '◉' : kind === 'рамка' ? '◇' : kind === 'значок' ? '✦' : '◈');
  const buy = (it) => {
    if (owned[it.name]) return;
    if (state.coins < it.price) {
      state.toast('Не хватает тамо-коинов');
      return;
    }
    state.addCoins(-it.price);
    setOwned((p) => ({ ...p, [it.name]: true }));
    state.toast(`Куплено · «${it.name}»`);
  };
  return (
    <Screen>
      <ScreenHeader title="Магазин" back={() => nav.back()} />
      <GradCard colors={GRAD.red} style={{ marginHorizontal: 16, marginBottom: 16 }} padding={16} patternSize={24}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <HexBadge size={48} fill="rgba(255,255,255,0.20)" icon="coin" iconColor="#fff" iconSize={24} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 12, opacity: 0.85 }}>Твой баланс</Txt>
            <Txt style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.4 }}>
              {state.coins} <Txt style={{ fontSize: 14, fontWeight: '600', opacity: 0.9 }}>тамо-коинов</Txt>
            </Txt>
          </View>
        </View>
      </GradCard>

      <SectionTitle title="Что купить" />
      <View style={{ marginHorizontal: 16, marginBottom: 100, gap: 8 }}>
        {chunk(items, 2).map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((it, i) => {
              const isOwned = owned[it.name];
              const tooExpensive = !isOwned && state.coins < it.price;
              return (
                <Card key={i} style={{ flex: 1, padding: 14, opacity: tooExpensive ? 0.6 : 1 }} onPress={() => buy(it)}>
                  <HexBadge size={56} fill={brandColor(c, it.color)} style={{ alignSelf: 'center' }}>
                    <Txt style={{ color: '#fff', fontSize: 22 }}>{glyphFor(it.kind)}</Txt>
                  </HexBadge>
                  <Txt style={{ fontSize: 13, fontWeight: '700', marginTop: 10, textAlign: 'center' }}>{it.name}</Txt>
                  {isOwned ? (
                    <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Icon name="check" size={12} color={c.green} />
                      <Txt style={{ color: c.green, fontSize: 12, fontWeight: '700' }}>Куплено</Txt>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
                      <Icon name="coin" size={13} color={c.red} />
                      <Txt style={{ color: c.red, fontWeight: '700', fontSize: 13 }}>{it.price}</Txt>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        ))}
      </View>
    </Screen>
  );
}

// ═══ PROFILE ═══
export function StudentProfile({ nav, onSignOut }) {
  const { c, dark, toggle } = useTheme();
  const state = useAppState();
  return (
    <Screen>
      <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' }}>
        <View>
          <Avatar name={STUDENT.name} size={86} color="green" />
          <View style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 999, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.bg }}>
            <Txt style={{ color: '#14110D', fontWeight: '800', fontSize: 12 }}>{STUDENT.level}</Txt>
          </View>
        </View>
        <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 12, letterSpacing: -0.3 }}>{STUDENT.name}</Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 2 }}>{STUDENT.grade} · {STUDENT.levelTitle}</Txt>
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 6 }}>
          <Pill color="gold"><Icon name="star" size={11} /><Txt style={{ fontSize: 12, fontWeight: '600' }}> {state.stars}</Txt></Pill>
          <Pill color="red"><Icon name="coin" size={11} /><Txt style={{ fontSize: 12, fontWeight: '600' }}> {state.coins}</Txt></Pill>
          <Pill color="green"><Icon name="flame" size={11} /><Txt style={{ fontSize: 12, fontWeight: '600' }}> {STUDENT.streak}</Txt></Pill>
        </View>
      </View>

      <GradCard colors={GRAD.gold} ink="#14110D" patternColor="rgba(20,17,13,0.10)" patternSize={24} style={{ marginHorizontal: 16, marginVertical: 12 }} padding={18} onPress={() => nav('achievements')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <HexBadge size={52} fill="rgba(20,17,13,0.18)" icon="trophy" iconColor="#14110D" iconSize={24} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', opacity: 0.7 }}>Достижения</Txt>
            <Txt style={{ fontSize: 17, fontWeight: '700', marginTop: 2 }}>Уровень {STUDENT.level} · {ACHIEVEMENTS.filter((a) => a.earned).length} ачивок</Txt>
            <View style={{ marginTop: 8, height: 6, backgroundColor: 'rgba(20,17,13,0.18)', borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ width: `${STUDENT.levelProgress * 100}%`, height: '100%', backgroundColor: '#14110D' }} />
            </View>
          </View>
          <Icon name="chevronRight" size={20} color="#14110D" />
        </View>
      </GradCard>

      <SectionTitle title="О тебе" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 0 }}>
        <ProfileRow icon="user" title="Классный руководитель" value={STUDENT.classTeacher} />
        <ProfileRow icon="calendar" title="Посещаемость" value="96%" />
        <ProfileRow icon="book" title="Средний балл" value="4.6" />
        <ProfileRow icon="bag" title="Кружков" value="2" last />
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
