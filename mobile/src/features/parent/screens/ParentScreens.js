import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { HexBadge } from '@shared/components/Hex';
import { Card, Pill, Avatar, PrimaryButton, AppHeader, ScreenHeader, SectionTitle, CircleButton } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';
import { useAppState } from '@shared/state/AppState';
import { PARENT, ATTENDANCE_LOG, FEEDBACK, TODAY_SCHEDULE, SUBJECTS_DIARY } from '@shared/data/mock';
import { LessonRow, SubjectRow, ProfileRow, QuickAction, brandColor, softColor } from '@shared/ui/rows';

const chunk = (arr, n) => arr.reduce((rows, item, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(item);
  return rows;
}, []);

// ═══ HOME ═══
export function ParentHome({ nav }) {
  const { c } = useTheme();
  const [activeChild, setActiveChild] = useState(0);
  const child = PARENT.children[activeChild];
  const recent = [
    { s: 'Математика', g: 5, color: 'blue', d: 'сегодня' },
    { s: 'Чтение', g: 5, color: 'blue', d: 'вчера' },
    { s: 'Английский', g: 4, color: 'red', d: 'вчера' },
    { s: 'Естествозн.', g: 5, color: 'green', d: '23 мая' },
  ];
  return (
    <Screen>
      <AppHeader
        greeting="Здравствуйте,"
        name={PARENT.name}
        right={<CircleButton icon="bell" badge onPress={() => nav('notifications')} />}
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 8 }}>
        {PARENT.children.map((ch, i) => {
          const on = i === activeChild;
          return (
            <Pressable
              key={i}
              onPress={() => setActiveChild(i)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 18,
                backgroundColor: on ? c.surface : 'transparent',
                borderWidth: 1,
                borderColor: on ? c.green : c.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Avatar name={ch.name} size={36} color={ch.avatar} />
              <View style={{ minWidth: 0, flex: 1 }}>
                <Txt style={{ fontSize: 14, fontWeight: '700' }}>{ch.name}</Txt>
                <Txt style={{ fontSize: 11, color: c.ink3 }}>{ch.grade}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      <GradCard colors={GRAD.green} style={{ marginHorizontal: 16, marginBottom: 16 }} padding={18}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 12, opacity: 0.85, fontWeight: '500' }}>{child.name} сейчас</Txt>
            <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 2, letterSpacing: -0.4 }}>{child.status}</Txt>
            <Txt style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Зашла в школу в {child.lastSeen}</Txt>
          </View>
          <Pill style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#A3E5A8' }} />
            <Txt style={{ fontSize: 12, fontWeight: '600' }}> live</Txt>
          </Pill>
        </View>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
          <View>
            <Txt style={{ fontSize: 11, opacity: 0.7 }}>Сейчас</Txt>
            <Txt style={{ fontSize: 14, fontWeight: '700', marginTop: 2 }}>Чтение · каб. 207</Txt>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => nav('attendance')}>
            <Txt style={{ color: '#fff', fontSize: 13, fontWeight: '600', opacity: 0.95 }}>История →</Txt>
          </Pressable>
        </View>
      </GradCard>

      <SectionTitle
        title={`Расписание · ${child.name}`}
        right={
          <Pressable onPress={() => nav('schedule')}>
            <Txt style={{ color: c.green, fontSize: 14, fontWeight: '600' }}>Всё →</Txt>
          </Pressable>
        }
      />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 18 }}>
        {TODAY_SCHEDULE.slice(0, 3).map((l, i) => (
          <LessonRow key={i} lesson={l} onPress={() => nav('lesson', l)} />
        ))}
      </View>

      <SectionTitle
        title="Свежие оценки"
        right={
          <Pressable onPress={() => nav('grades')}>
            <Txt style={{ color: c.green, fontSize: 14, fontWeight: '600' }}>Дневник →</Txt>
          </Pressable>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18, gap: 8 }}>
        {recent.map((row, i) => (
          <Card key={i} style={{ padding: 14, minWidth: 130 }}>
            <HexBadge size={40} fill={brandColor(c, row.color)}>
              <Txt style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{row.g}</Txt>
            </HexBadge>
            <Txt style={{ fontSize: 13, fontWeight: '700', marginTop: 10 }}>{row.s}</Txt>
            <Txt style={{ fontSize: 11, color: c.ink3, marginTop: 2 }}>{row.d}</Txt>
          </Card>
        ))}
      </ScrollView>

      <GradCard colors={GRAD.gold} ink="#0F172A" patternColor="rgba(20,17,13,0.10)" patternSize={24} style={{ marginHorizontal: 16, marginBottom: 18 }} padding={18} onPress={() => nav('feedback')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <HexBadge size={52} fill="rgba(20,17,13,0.20)" icon="chat" iconColor="#0F172A" iconSize={24} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', opacity: 0.7 }}>Новый отзыв</Txt>
            <Txt style={{ fontSize: 17, fontWeight: '700', marginTop: 2 }}>Фидбек за май готов</Txt>
            <Txt style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>От {FEEDBACK.teacher}</Txt>
          </View>
          <Icon name="chevronRight" size={20} color="#0F172A" />
        </View>
      </GradCard>

      <SectionTitle title="Быстро" />
      <View style={{ marginHorizontal: 16, marginBottom: 100, gap: 8 }}>
        {chunk(
          [
            { icon: 'bag', color: 'green', label: 'Кружки', to: 'clubs' },
            { icon: 'calendar', color: 'blue', label: 'Ивенты', to: 'events' },
            { icon: 'chat', color: 'gold', label: 'Фидбек', to: 'feedback' },
            { icon: 'clean', color: 'red', label: 'Сервис', to: 'service' },
          ],
          2
        ).map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((q, i) => (
              <QuickAction key={i} icon={q.icon} color={q.color} label={q.label} onPress={() => nav(q.to)} />
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

// ═══ ATTENDANCE ═══
export function ParentAttendance() {
  const { c } = useTheme();
  const label = { in: 'Зашёл в школу', out: 'Вышел из школы' };
  return (
    <Screen>
      <ScreenHeader title="Посещаемость" large sub="Айкоркем · 4 «Б»" />

      <Card style={{ marginHorizontal: 16, marginBottom: 16, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: c.green }} />
          <Txt style={{ fontSize: 13, fontWeight: '600', color: c.green }}>В школе сейчас</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 14 }}>
          {[
            { l: 'Зашёл', v: '08:30' },
            { l: 'Уроков пройдено', v: '2 / 6' },
            { l: 'За месяц', v: '96%' },
          ].map((it, i) => (
            <View key={i}>
              <Txt style={{ fontSize: 11, color: c.ink3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 }}>{it.l}</Txt>
              <Txt style={{ fontSize: 16, fontWeight: '700', marginTop: 2 }}>{it.v}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="Журнал" />
      <View style={{ marginHorizontal: 16, marginBottom: 100 }}>
        {ATTENDANCE_LOG.map((row, i) => {
          const prevDay = i > 0 ? ATTENDANCE_LOG[i - 1].d : null;
          const tone = row.color === 'gold' ? 'goldDeep' : row.color;
          return (
            <View key={i}>
              {row.d !== prevDay ? (
                <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 6 }}>{row.d}</Txt>
              ) : null}
              <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: softColor(c, row.color) }}>
                  <Icon name={row.icon} size={18} color={brandColor(c, tone)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 14, fontWeight: '600' }}>
                    {row.kind === 'class' ? row.room : row.kind === 'late' ? `Опоздание · ${row.room}` : label[row.kind]}
                  </Txt>
                  {row.kind === 'in' || row.kind === 'out' ? (
                    <Txt style={{ fontSize: 12, color: c.ink3, marginTop: 1 }}>{row.room}</Txt>
                  ) : null}
                </View>
                <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink3 }}>{row.time}</Txt>
              </Card>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

// ═══ GRADES ═══
export function ParentGrades({ nav }) {
  const { c } = useTheme();
  const bars = [4.2, 4.3, 4.4, 4.5, 4.5, 4.6, 4.7];
  const months = ['Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар', 'Май'];
  return (
    <Screen>
      <ScreenHeader title="Дневник" large sub="Айкоркем · средний балл 4.6" />

      <Card style={{ marginHorizontal: 16, marginBottom: 16, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }}>
          {bars.map((v, i) => (
            <View key={i} style={{ flex: 1, justifyContent: 'flex-end', height: '100%' }}>
              <View style={{ width: '100%', height: `${((v - 3.5) / 1.6) * 100}%`, backgroundColor: i === 6 ? c.green : c.greenSoft, borderRadius: 6 }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          {months.map((m, i) => (
            <Txt key={i} style={{ fontSize: 11, color: c.ink3 }}>{m}</Txt>
          ))}
        </View>
        <View style={{ marginTop: 12, padding: 12, backgroundColor: c.greenSoft, borderRadius: 12 }}>
          <Txt style={{ fontSize: 13, color: c.greenDeep, fontWeight: '500' }}>↑ Прогресс за полугодие: +0.5 балла</Txt>
        </View>
      </Card>

      <SectionTitle title="Предметы" />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 100 }}>
        {SUBJECTS_DIARY.map((s, i) => (
          <SubjectRow key={i} subject={s} onPress={() => nav('subject', s)} />
        ))}
      </View>
    </Screen>
  );
}

// ═══ MONTHLY FEEDBACK ═══
export function ParentFeedback({ nav }) {
  const { c } = useTheme();
  const appState = useAppState();
  return (
    <Screen>
      <ScreenHeader title="Ежемесячный фидбек" back={() => nav.back()} />

      <GradCard colors={GRAD.gold} ink="#0F172A" patternColor="rgba(20,17,13,0.10)" patternSize={26} style={{ marginHorizontal: 16, marginBottom: 16 }} padding={22}>
        <Txt style={{ fontSize: 12, fontWeight: '600', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.4 }}>Фидбек за</Txt>
        <Txt style={{ fontSize: 28, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 }}>{FEEDBACK.month}</Txt>
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={FEEDBACK.teacher} size={36} color="green" />
          <View>
            <Txt style={{ fontSize: 12, opacity: 0.7, fontWeight: '500' }}>Классный руководитель</Txt>
            <Txt style={{ fontSize: 14, fontWeight: '700' }}>{FEEDBACK.teacher}</Txt>
          </View>
        </View>
      </GradCard>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="star" size={16} color={c.goldDeep} />
          <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>Общая оценка</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <Txt style={{ fontSize: 36, fontWeight: '800', color: c.goldDeep }}>{FEEDBACK.rating}</Txt>
          <Txt style={{ fontSize: 14, color: c.ink3 }}>/ 5.0</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Icon key={i} name="star" size={16} color={i <= 4.8 ? c.gold : c.bg2} />
          ))}
        </View>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <Txt style={{ fontSize: 11, fontWeight: '600', color: c.green, textTransform: 'uppercase', letterSpacing: 0.3 }}>Что радует</Txt>
        <View style={{ gap: 8, marginTop: 10 }}>
          {FEEDBACK.strengths.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={14} color={c.green} />
              </View>
              <Txt style={{ fontSize: 14, fontWeight: '500', flex: 1 }}>{s}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <Txt style={{ fontSize: 11, fontWeight: '600', color: c.goldDeep, textTransform: 'uppercase', letterSpacing: 0.3 }}>На что обратить внимание</Txt>
        <View style={{ gap: 8, marginTop: 10 }}>
          {FEEDBACK.improvements.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: c.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="target" size={14} color={c.goldDeep} />
              </View>
              <Txt style={{ fontSize: 14, fontWeight: '500', flex: 1 }}>{s}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 18 }}>
        <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3 }}>Комментарий</Txt>
        <Txt style={{ fontSize: 14, color: c.ink, marginTop: 10, lineHeight: 22 }}>{FEEDBACK.body}</Txt>
      </Card>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100, flexDirection: 'row', gap: 8 }}>
        <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onPress={() => appState.toast('Открываем чат с учителем')}>
          <Icon name="chat" size={16} color={c.ink} />
          <Txt style={{ fontSize: 16, fontWeight: '600', color: c.ink }}> Спросить</Txt>
        </PrimaryButton>
        <PrimaryButton color="green" full={false} style={{ flex: 1 }} onPress={() => { appState.toast('Отмечено как прочитанное'); setTimeout(() => nav.back(), 700); }}>
          <Icon name="check" size={16} color="#fff" />
          <Txt style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}> Прочитано</Txt>
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ═══ SERVICE ═══
export function ParentService({ nav }) {
  const { c } = useTheme();
  const [step, setStep] = useState('list');
  const requests = [
    { id: 1, kind: 'Клининг', sub: 'Каб. 204', status: 'В работе', color: 'gold', date: 'сегодня · 09:14' },
    { id: 2, kind: 'Клининг', sub: 'Главный вход', status: 'Готово', color: 'green', date: 'вчера' },
  ];

  if (step === 'new') {
    return (
      <Screen>
        <ScreenHeader title="Новая заявка" back={() => setStep('list')} />
        <View style={{ paddingHorizontal: 16 }}>
          <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 }}>Тип заявки</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Card style={{ flex: 1, padding: 14, borderWidth: 2, borderColor: c.green }}>
              <HexBadge size={40} fill={c.green} icon="clean" iconColor="#fff" iconSize={18} />
              <Txt style={{ fontSize: 14, fontWeight: '700', marginTop: 8 }}>Клининг</Txt>
              <Txt style={{ fontSize: 11, color: c.ink3 }}>Уборка кабинета</Txt>
            </Card>
            <Card style={{ flex: 1, padding: 14, opacity: 0.5 }}>
              <HexBadge size={40} fill={c.bg2} />
              <Txt style={{ fontSize: 14, fontWeight: '700', marginTop: 8 }}>Скоро</Txt>
              <Txt style={{ fontSize: 11, color: c.ink3 }}>Другие сервисы</Txt>
            </Card>
          </View>

          <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 16, marginBottom: 8 }}>Локация</Txt>
          <Card style={{ padding: 14 }}>
            <Txt style={{ fontSize: 14, fontWeight: '600' }}>Кабинет 204 · Математика</Txt>
            <Txt style={{ fontSize: 12, color: c.ink3 }}>2 этаж, главный корпус</Txt>
          </Card>

          <Txt style={{ fontSize: 11, fontWeight: '600', color: c.ink3, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 16, marginBottom: 8 }}>Комментарий</Txt>
          <Card style={{ padding: 14 }}>
            <Txt style={{ fontSize: 14, color: c.ink2 }}>Запачкали доску перед уроком · нужно протереть</Txt>
          </Card>

          <View style={{ paddingTop: 20, paddingBottom: 100 }}>
            <PrimaryButton color="green" onPress={() => setStep('sent')}>Отправить заявку</PrimaryButton>
          </View>
        </View>
      </Screen>
    );
  }

  if (step === 'sent') {
    return (
      <Screen>
        <ScreenHeader title="Готово" back={() => setStep('list')} />
        <View style={{ paddingHorizontal: 16, alignItems: 'center' }}>
          <HexBadge size={110} fill={c.green} icon="check" iconColor="#fff" iconSize={50} iconStrokeWidth={3} style={{ marginTop: 24 }} />
          <Txt style={{ fontSize: 24, fontWeight: '700', marginTop: 18, letterSpacing: -0.4 }}>Заявка отправлена</Txt>
          <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 6, textAlign: 'center' }}>Команда клининга получит уведомление и приступит к выполнению.</Txt>
          <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
            <PrimaryButton color="green" onPress={() => setStep('list')}>К списку заявок</PrimaryButton>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Сервис" large sub="Заявки и обращения" />
      <SectionTitle title="Мои заявки" />
      <View style={{ gap: 8, marginHorizontal: 16, marginBottom: 16 }}>
        {requests.map((r) => (
          <Card key={r.id} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <HexBadge size={44} fill={brandColor(c, r.color === 'gold' ? 'goldDeep' : r.color)} icon="clean" iconColor="#fff" iconSize={20} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, fontWeight: '700' }}>{r.kind} · {r.sub}</Txt>
              <Txt style={{ fontSize: 12, color: c.ink3, marginTop: 1 }}>{r.date}</Txt>
            </View>
            <Pill color={r.color}>{r.status}</Pill>
          </Card>
        ))}
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}>
        <PrimaryButton color="green" onPress={() => setStep('new')}>
          <Icon name="plus" size={18} color="#fff" />
          <Txt style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}> Новая заявка</Txt>
        </PrimaryButton>
      </View>
    </Screen>
  );
}

// ═══ PROFILE ═══
export function ParentProfile({ onSignOut }) {
  const { c, dark, toggle } = useTheme();
  return (
    <Screen>
      <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' }}>
        <Avatar name={PARENT.name} size={86} color="blue" />
        <Txt style={{ fontSize: 22, fontWeight: '700', marginTop: 12, letterSpacing: -0.3 }}>{PARENT.name}</Txt>
        <Txt style={{ fontSize: 14, color: c.ink2, marginTop: 2 }}>Родитель · 2 ребёнка</Txt>
      </View>

      <SectionTitle title="Мои дети" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 0 }}>
        {PARENT.children.map((ch, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i < PARENT.children.length - 1 ? 1 : 0, borderBottomColor: c.border, gap: 12 }}
          >
            <Avatar name={ch.name} size={38} color={ch.avatar} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 14, fontWeight: '700' }}>{ch.name}</Txt>
              <Txt style={{ fontSize: 12, color: c.ink3 }}>{ch.grade}</Txt>
            </View>
            <Pill color="green">
              <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: c.green }} />
              <Txt style={{ fontSize: 12, fontWeight: '600' }}> в школе</Txt>
            </Pill>
          </View>
        ))}
      </Card>

      <SectionTitle title="Договор и оплата" />
      <Card style={{ marginHorizontal: 16, marginBottom: 12, padding: 0 }}>
        <ProfileRow icon="user" title="Договор" value="№ 2024-178" />
        <ProfileRow icon="coin" title="Оплата за месяц" value="Оплачено" />
        <ProfileRow icon="bag" title="Доп. услуги" value="2 кружка" last />
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
