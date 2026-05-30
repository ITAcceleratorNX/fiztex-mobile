// Student screens — fully fleshed iOS-style screens for the student role.
// Each screen is a self-contained component that gets the `nav` and `state`
// props from the prototype shell.

// ─── Sample data ────────────────────────────────────────────────────────────
const STUDENT = {
  name: 'Айкоркем С.',
  short: 'Айкоркем',
  grade: '4 «Б»',
  stars: 248,
  coins: 64,
  streak: 12,
  level: 7,
  levelTitle: 'Юный исследователь',
  levelProgress: 0.62,
  attendance: 0.96,
  classTeacher: 'Айгерим Болатовна',
};

const SUBJECT_COLORS = {
  'Математика': { color: 'blue', emoji: '✦' },
  'Английский': { color: 'red',  emoji: '★' },
  'Казахский язык': { color: 'green', emoji: '◆' },
  'Русский язык': { color: 'gold', emoji: '◉' },
  'Естествознание': { color: 'green', emoji: '✺' },
  'Чтение': { color: 'blue', emoji: '◇' },
  'Физкультура': { color: 'red', emoji: '▲' },
  'Музыка': { color: 'gold', emoji: '♪' },
  'Изо': { color: 'blue', emoji: '✤' },
  'Робототехника': { color: 'red', emoji: '◈' },
};

const TODAY_SCHEDULE = [
  { time: '08:30', end: '09:10', subject: 'Математика', room: 'каб. 204', teacher: 'Айгерим Б.', status: 'done' },
  { time: '09:20', end: '10:00', subject: 'Английский', room: 'каб. 312', teacher: 'Ms. Linda', status: 'done' },
  { time: '10:20', end: '11:00', subject: 'Чтение', room: 'каб. 207', teacher: 'Алия Н.', status: 'now', progress: 0.6 },
  { time: '11:10', end: '11:50', subject: 'Естествознание', room: 'каб. 304', teacher: 'Дина К.', status: 'next' },
  { time: '12:30', end: '13:10', subject: 'Музыка', room: 'каб. 110', teacher: 'Серик Т.', status: 'upcoming' },
  { time: '13:20', end: '14:00', subject: 'Физкультура', room: 'спортзал', teacher: 'Тимур А.', status: 'upcoming' },
];

const SUBJECTS_DIARY = [
  { name: 'Математика', avg: 4.7, last: [5, 5, 4, 5, 5, 4], trend: 'up', hw: 1 },
  { name: 'Английский', avg: 4.5, last: [5, 4, 5, 4, 5], trend: 'flat', hw: 0 },
  { name: 'Казахский язык', avg: 4.3, last: [4, 4, 5, 4, 4], trend: 'flat', hw: 2 },
  { name: 'Русский язык', avg: 4.8, last: [5, 5, 5, 4, 5, 5], trend: 'up', hw: 0 },
  { name: 'Естествознание', avg: 4.6, last: [5, 4, 5, 5], trend: 'up', hw: 1 },
  { name: 'Чтение', avg: 5.0, last: [5, 5, 5, 5], trend: 'flat', hw: 0 },
];

const CLUBS = [
  { name: 'Робототехника LEGO',  teacher: 'Ержан А.',  schedule: 'Пн, Ср · 15:00', spots: 4, total: 12, color: 'red', enrolled: true,  tag: 'Tech' },
  { name: 'Шахматы',              teacher: 'Бахыт К.', schedule: 'Вт, Чт · 14:30', spots: 8, total: 16, color: 'blue', enrolled: false, tag: 'Логика' },
  { name: 'Театральная студия',   teacher: 'Алина М.', schedule: 'Сб · 11:00',     spots: 2, total: 14, color: 'gold', enrolled: false, tag: 'Творчество' },
  { name: 'Юный программист',     teacher: 'Дамир Т.', schedule: 'Пн · 16:00',     spots: 6, total: 10, color: 'green', enrolled: false, tag: 'Tech' },
  { name: 'Футбол',               teacher: 'Тимур А.', schedule: 'Ср, Пт · 17:00', spots: 0, total: 20, color: 'red', enrolled: false, tag: 'Спорт', waitlist: true },
  { name: 'Юный исследователь',   teacher: 'Дина К.',  schedule: 'Чт · 15:30',     spots: 5, total: 12, color: 'green', enrolled: true,  tag: 'Наука' },
];

const ACHIEVEMENTS = [
  { name: 'Без пропусков',     desc: '30 дней подряд',       icon: '★', color: 'gold', earned: true,  stars: 50 },
  { name: 'Отличник недели',   desc: 'Все пятёрки за неделю', icon: '◆', color: 'green', earned: true,  stars: 40 },
  { name: 'Книголюб',          desc: '10 книг прочитано',     icon: '◉', color: 'blue', earned: true,  stars: 30 },
  { name: 'Юный учёный',       desc: '5 тестов на отлично',  icon: '✺', color: 'red', earned: false, progress: 0.6, stars: 60 },
  { name: 'Командный игрок',   desc: 'Участие в 3 кружках',  icon: '▲', color: 'blue', earned: false, progress: 0.66, stars: 80 },
  { name: 'Полиглот',          desc: '4 языка на 5',          icon: '✦', color: 'gold', earned: false, progress: 0.5, stars: 100 },
];

const EVENTS = [
  { name: 'Открытый урок: робототехника', date: '2 июня', time: '15:00', tag: 'Учебный',  color: 'blue', going: true, vip: false },
  { name: 'Зимний концерт Tamos',          date: '14 июня', time: '18:00', tag: 'Концерт',  color: 'red', going: false, vip: false },
  { name: 'Гала-ужин для родителей',       date: '20 июня', time: '19:00', tag: 'VIP',      color: 'gold', going: false, vip: true },
  { name: 'Спортивный день',               date: '25 июня', time: '10:00', tag: 'Спорт',    color: 'green', going: true, vip: false },
];

// ═══════════════════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════════════════
function StudentHome({ nav }) {
  const next = TODAY_SCHEDULE.find(l => l.status === 'now' || l.status === 'next');
  const state = useAppState();

  // 6 hub tiles per the navigation schema
  const tiles = [
    { id: 'schedule', label: 'Расписание', sub: 'Дни и уроки',     icon: 'calendar', color: 'blue' },
    { id: 'diary',    label: 'Дневник',    sub: 'Оценки',          icon: 'book',     color: 'green' },
    { id: 'events',   label: 'Ивенты',     sub: 'Школьные события', icon: 'star',    color: 'red' },
    { id: 'checkout', label: 'QR',         sub: 'Вход и уход',     icon: 'qr',       color: 'gold' },
    { id: 'map',      label: 'Карта',      sub: 'Найти кабинет',   icon: 'map',      color: 'green' },
    { id: 'clubs',    label: 'Кружки',     sub: 'Записаться',      icon: 'bag',      color: 'blue' },
  ];

  return (
    <>
      <AppHeader
        greeting="Сәлем,"
        name={STUDENT.short}
        right={
          <button onClick={() => { state.clearNotifications(); state.toast('Уведомления отмечены'); }} style={{
            width: 44, height: 44, borderRadius: 999, background: 'var(--surface)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <Icon name="bell" size={20}/>
            {state.notifications > 0 && <span style={{ position: 'absolute', top: 9, right: 11, width: 8, height: 8, borderRadius: 999, background: 'var(--tamos-red)' }}/>}
          </button>
        }
      />

      {/* Hero — gradient with Tamos hexes + stats */}
      <div style={{ margin: '0 16px 14px', borderRadius: 26, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #2A8847 0%, #1B6B36 60%, #155028 100%)',
        color: '#fff', padding: 20,
      }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={32}/>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 500 }}>Сейчас идёт урок</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 2 }}>{next.subject}</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{next.room} · {next.teacher}</div>
            </div>
            <Pill color="gold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>{next.time}–{next.end}</Pill>
          </div>
          <div style={{ marginTop: 16, height: 6, background: 'rgba(255,255,255,0.18)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${(next.progress || 0.6) * 100}%`, height: '100%', background: 'rgba(255,255,255,0.85)', borderRadius: 999 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, opacity: 0.85 }}>
            <span>осталось 17 мин</span>
            <button onClick={() => nav('checkout')} style={{ color: '#fff', fontWeight: 600, opacity: 0.95 }}>Показать QR →</button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '0 16px 18px' }}>
        <Card style={{ padding: 14 }} onClick={() => nav('profile')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tamos-gold-deep)' }}>
            <Icon name="star" size={18}/>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Звёзды</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{state.stars}</div>
        </Card>
        <Card style={{ padding: 14 }} onClick={() => nav('shop')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tamos-red)' }}>
            <Icon name="coin" size={18}/>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Коины</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{state.coins}</div>
        </Card>
        <Card style={{ padding: 14 }} onClick={() => nav('profile')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tamos-red)' }}>
            <Icon name="flame" size={18}/>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Серия</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{STUDENT.streak}<span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500, marginLeft: 3 }}>дн.</span></div>
        </Card>
      </div>

      {/* 6-tile navigation hub */}
      <SectionTitle title="Что открыть"/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '0 16px 18px' }}>
        {tiles.map(t => (
          <Card key={t.id} onClick={() => nav(t.id)} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative', width: 44, height: 44 }}>
              <Hex size={44} fill={`var(--tamos-${t.color})`}/>
              <Icon name={t.icon} size={20} color="#fff" style={{ position: 'absolute', inset: 12 }}/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.1 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{t.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Today's schedule preview */}
      <SectionTitle title="Сегодня" right={<button onClick={() => nav('schedule')} style={{ color: 'var(--tamos-green)', fontSize: 14, fontWeight: 600 }}>Всё расписание →</button>}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 100px' }}>
        {TODAY_SCHEDULE.slice(0, 3).map((l, i) => <LessonRow key={i} lesson={l} onClick={() => nav('lesson', l)}/>)}
      </div>
    </>
  );
}

function SectionTitle({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 10px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{title}</h2>
      {right}
    </div>
  );
}

function LessonRow({ lesson, onClick }) {
  const subInfo = SUBJECT_COLORS[lesson.subject] || { color: 'gray', emoji: '◇' };
  const statusBadge = {
    done: <Pill color="green"><Icon name="check" size={12}/> Был</Pill>,
    now: <Pill color="red" style={{ background: 'var(--tamos-red)', color: '#fff' }}>● Сейчас</Pill>,
    next: <Pill color="gold">Следующий</Pill>,
    upcoming: <Pill color="gray">{lesson.time}</Pill>,
  }[lesson.status];

  return (
    <Card onClick={onClick} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: `var(--tamos-${subInfo.color})` }}/>
      <div style={{ minWidth: 54 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>{lesson.time}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{lesson.end}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{lesson.subject}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{lesson.room} · {lesson.teacher}</div>
      </div>
      {statusBadge}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════
function StudentSchedule({ nav }) {
  const [day, setDay] = React.useState(2); // Wednesday active
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
  const dates = [26, 27, 28, 29, 30];

  return (
    <>
      <ScreenHeader title="Расписание" large sub="Май 2026 · 4 «Б»"/>
      {/* Day picker */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 16px 14px' }}>
        {days.map((d, i) => {
          const isOn = i === day;
          return (
            <button key={d} onClick={() => setDay(i)} style={{
              flex: 1, height: 64, borderRadius: 18,
              background: isOn ? 'var(--tamos-green)' : 'var(--surface)',
              color: isOn ? '#fff' : 'var(--ink)',
              border: isOn ? 'none' : '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600,
            }}>
              <span style={{ fontSize: 11, opacity: 0.8 }}>{d}</span>
              <span style={{ fontSize: 18, marginTop: 2 }}>{dates[i]}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 16px 100px' }}>
        {TODAY_SCHEDULE.map((l, i) => <LessonRow key={i} lesson={l} onClick={() => nav('lesson', l)}/>)}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON DETAIL
// ═══════════════════════════════════════════════════════════════════════════
function StudentLesson({ nav, payload }) {
  const lesson = payload || TODAY_SCHEDULE[2];
  const subInfo = SUBJECT_COLORS[lesson.subject] || { color: 'gray' };
  const color = `var(--tamos-${subInfo.color})`;
  const state = useAppState();
  const hwKey = `${lesson.subject}-${lesson.time}`;
  const isDone = state.homework[hwKey];
  return (
    <>
      <ScreenHeader title={lesson.subject} back={() => nav.back()}/>
      <div style={{ margin: '0 16px 16px', borderRadius: 24, overflow: 'hidden',
        background: color, color: '#fff', padding: 22, position: 'relative',
      }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={28}/>
        <div style={{ position: 'relative' }}>
          <Pill style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>{lesson.time}–{lesson.end}</Pill>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginTop: 8 }}>{lesson.subject}</div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{lesson.room} · {lesson.teacher}</div>
        </div>
      </div>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          <Icon name="book" size={14}/>
          Сегодня изучаем
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>Сказки народов Казахстана</div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>
          Читаем сказку «Алдар-Косе и бай», разбираем главных героев и обсуждаем мораль. Дома — нарисовать любимого героя.
        </p>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            <Icon name="pencil" size={14}/>
            Домашнее задание
          </div>
          <Pill color="gold">до завтра</Pill>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>Стр. 42–45 + рисунок героя</div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>
          Прочитать, ответить устно на вопросы 1–3, нарисовать в альбоме любимого героя.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <PrimaryButton
            color={isDone ? 'ghost' : 'green'}
            full={false}
            style={{ height: 42, flex: 1 }}
            onClick={() => {
              if (!isDone) {
                state.toggleHomework(hwKey);
                state.addStars(5);
                state.toast('+5 ★ за домашнее задание');
              } else {
                state.toggleHomework(hwKey);
              }
            }}>
            {isDone ? <><Icon name="check" size={16}/> Готово</> : 'Отметить готово'}
          </PrimaryButton>
          <button style={{ height: 42, padding: '0 16px', borderRadius: 999, background: 'var(--surface-2)', fontWeight: 600, fontSize: 14 }} onClick={() => state.toast('Открываем камеру…')}>Прикрепить фото</button>
        </div>
      </Card>

      <Card style={{ margin: '0 16px 100px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          <Icon name="target" size={14}/>
          После урока
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', padding: 12, background: 'var(--green-soft)', borderRadius: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--tamos-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="qr" size={22} color="#fff"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Покажи QR учителю</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>В конце урока, для отметки</div>
          </div>
          <button onClick={() => nav('checkout')} style={{ color: 'var(--tamos-green)', fontWeight: 600, fontSize: 14 }}>QR →</button>
        </div>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT QR (end-of-lesson)
// ═══════════════════════════════════════════════════════════════════════════
function StudentCheckoutQR({ nav }) {
  return (
    <>
      <ScreenHeader title="Отметка ухода" back={() => nav.back()}/>
      <div style={{ padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Покажи QR учителю</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>
          Учитель отсканирует код и отметит, что ты ушёл с урока вовремя.
        </p>

        {/* QR code mockup */}
        <div style={{ margin: '24px auto 16px', width: 240, height: 240, padding: 18, background: '#fff', borderRadius: 26, boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
          <QRMockup size={204}/>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 48, height: 48 }}>
            <TamosGlyph size={48}/>
          </div>
        </div>

        <Pill color="green"><Icon name="clock" size={12}/> Действует ещё 4:32</Pill>

        <Card style={{ margin: '28px 0 0', padding: 16, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name="Алия Н." size={42} color="blue"/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Урок чтения</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Алия Нурлановна</div>
            </div>
            <Pill color="gray">каб. 207</Pill>
          </div>
        </Card>

        <button onClick={() => nav.back()} style={{ marginTop: 18, color: 'var(--ink-2)', fontSize: 14, fontWeight: 600 }}>Закрыть</button>
      </div>
    </>
  );
}

// Simple QR-style square mockup (decorative, not a real QR)
function QRMockup({ size = 200 }) {
  const grid = 17;
  const cell = size / grid;
  // pseudo-random pattern (deterministic)
  const pattern = [];
  const rng = (n) => ((n * 9301 + 49297) % 233280) / 233280;
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const on = rng(x * 100 + y) > 0.5;
      pattern.push({ x, y, on });
    }
  }
  // corners
  const corner = (cx, cy) => (
    <g>
      <rect x={cx} y={cy} width={7 * cell} height={7 * cell} fill="#14110D" rx={cell * 0.6}/>
      <rect x={cx + cell} y={cy + cell} width={5 * cell} height={5 * cell} fill="#fff" rx={cell * 0.4}/>
      <rect x={cx + cell * 2} y={cy + cell * 2} width={3 * cell} height={3 * cell} fill="#14110D" rx={cell * 0.3}/>
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {pattern.map((p, i) => {
        // skip corners
        if ((p.x < 8 && p.y < 8) || (p.x > 8 && p.y < 8) || (p.x < 8 && p.y > 8)) return null;
        if (!p.on) return null;
        return <rect key={i} x={p.x * cell} y={p.y * cell} width={cell * 0.9} height={cell * 0.9} fill="#14110D" rx={cell * 0.2}/>;
      })}
      {corner(0, 0)}
      {corner(size - 7 * cell, 0)}
      {corner(0, size - 7 * cell)}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DIARY (subjects list)
// ═══════════════════════════════════════════════════════════════════════════
function StudentDiary({ nav }) {
  return (
    <>
      <ScreenHeader title="Дневник" large sub={`Средний балл · 4.6`}/>
      <div style={{ margin: '4px 16px 18px' }}>
        <Card style={{ padding: 16, background: 'var(--surface-2)', border: '1px dashed var(--border-strong)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, position: 'relative' }}>
              <Hex size={40} fill="var(--tamos-blue)"/>
              <Icon name="sparkle" size={18} color="#fff" style={{ position: 'absolute', inset: 11 }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Бета-версия дневника</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Скоро: расширенные оценки и аналитика</div>
            </div>
          </div>
        </Card>
      </div>

      <SectionTitle title="Предметы"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 100px' }}>
        {SUBJECTS_DIARY.map((s, i) => <SubjectRow key={i} subject={s} onClick={() => nav('subject', s)}/>)}
      </div>
    </>
  );
}

function SubjectRow({ subject, onClick }) {
  const subInfo = SUBJECT_COLORS[subject.name] || { color: 'gray' };
  const grade = subject.avg;
  return (
    <Card onClick={onClick} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <Hex size={44} fill={`var(--tamos-${subInfo.color})`}/>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 17 }}>{grade}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{subject.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {subject.last.map((g, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 700, width: 18, height: 18, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: g === 5 ? 'var(--green-soft)' : g === 4 ? 'var(--gold-soft)' : 'var(--red-soft)',
              color: g === 5 ? 'var(--tamos-green)' : g === 4 ? 'var(--tamos-gold-deep)' : 'var(--tamos-red)',
            }}>{g}</span>
          ))}
        </div>
      </div>
      {subject.hw > 0 && <Pill color="red">{subject.hw} ДЗ</Pill>}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBJECT DETAIL
// ═══════════════════════════════════════════════════════════════════════════
function StudentSubject({ nav, payload }) {
  const s = payload || SUBJECTS_DIARY[0];
  const subInfo = SUBJECT_COLORS[s.name] || { color: 'gray' };
  return (
    <>
      <ScreenHeader title={s.name} back={() => nav.back()}/>
      <div style={{ margin: '0 16px 18px', borderRadius: 26, padding: 22, background: `var(--tamos-${subInfo.color})`, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={26}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Средний балл</div>
            <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, marginTop: 4 }}>{s.avg}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>↑ +0.2 за месяц</div>
          </div>
          <div style={{ position: 'relative' }}>
            <Hex size={80} fill="rgba(255,255,255,0.18)"/>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{subInfo.emoji}</div>
          </div>
        </div>
      </div>

      <SectionTitle title="Последние оценки"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 18px' }}>
        {[
          { d: '24 мая', g: 5, kind: 'Контрольная работа' },
          { d: '20 мая', g: 5, kind: 'Урок' },
          { d: '17 мая', g: 4, kind: 'Урок' },
          { d: '15 мая', g: 5, kind: 'Домашнее задание' },
        ].map((row, i) => (
          <Card key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12,
              background: row.g === 5 ? 'var(--green-soft)' : 'var(--gold-soft)',
              color: row.g === 5 ? 'var(--tamos-green)' : 'var(--tamos-gold-deep)',
              fontSize: 20, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{row.g}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{row.kind}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{row.d}</div>
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle title="Домашние задания"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 100px' }}>
        <Card style={{ padding: 14 }}>
          <Pill color="gold">До завтра</Pill>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>№ 215, 217 на стр. 88</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>Айгерим Болатовна</div>
        </Card>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CLUBS
// ═══════════════════════════════════════════════════════════════════════════
function StudentClubs({ nav }) {
  const [filter, setFilter] = React.useState('Все');
  const filters = ['Все', 'Tech', 'Творчество', 'Спорт', 'Наука', 'Логика'];
  const state = useAppState();
  // Merge app-state enrollment over the static CLUBS list
  const list = CLUBS.map(c => ({ ...c, enrolled: state.clubs[c.name] ?? c.enrolled }));
  const filtered = filter === 'Все' ? list : list.filter(c => c.tag === filter);

  return (
    <>
      <ScreenHeader title="Кружки" large sub="Дополнительные занятия и записи"/>
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }} className="tamos-scroll">
        {filters.map(f => {
          const isOn = f === filter;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 999,
              background: isOn ? 'var(--tamos-green)' : 'var(--surface)',
              color: isOn ? '#fff' : 'var(--ink-2)',
              border: isOn ? 'none' : '1px solid var(--border)',
              fontSize: 13, fontWeight: 600,
            }}>{f}</button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 16px 100px' }}>
        {filtered.map((c, i) => <ClubCard key={i} club={c} onClick={() => nav('club', c)}/>)}
      </div>
    </>
  );
}

function ClubCard({ club, onClick }) {
  const full = club.spots === 0;
  return (
    <Card onClick={onClick} style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
          <Hex size={56} fill={`var(--tamos-${club.color})`}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{club.name}</span>
            {club.enrolled && <Pill color="green"><Icon name="check" size={11}/> Записан</Pill>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 3 }}>{club.teacher} · {club.schedule}</div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${((club.total - club.spots) / club.total) * 100}%`, height: '100%', background: full ? 'var(--tamos-red)' : `var(--tamos-${club.color})`, borderRadius: 999 }}/>
            </div>
            <span style={{ fontSize: 11, color: full ? 'var(--tamos-red)' : 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {full ? 'Лист ожидания' : `${club.spots} мест`}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CLUB DETAIL
// ═══════════════════════════════════════════════════════════════════════════
function StudentClub({ nav, payload }) {
  const c = payload || CLUBS[1];
  const state = useAppState();
  const enrolled = state.clubs[c.name] ?? c.enrolled;
  const full = c.spots === 0 && !enrolled;
  return (
    <>
      <ScreenHeader title="Кружок" back={() => nav.back()}/>
      <div style={{ margin: '0 16px 18px', borderRadius: 26, padding: 22, background: `var(--tamos-${c.color})`, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={28}/>
        <div style={{ position: 'relative' }}>
          <Pill style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>{c.tag}</Pill>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, lineHeight: 1.1, letterSpacing: -0.5 }}>{c.name}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>{c.teacher}</div>
        </div>
      </div>

      <div style={{ margin: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Расписание</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{c.schedule}</div>
        </Card>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Свободных мест</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{c.spots} из {c.total}</div>
        </Card>
      </div>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: 0.3, textTransform: 'uppercase' }}>О кружке</div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>
          Учимся играть в шахматы с нуля. Развиваем логику, стратегическое мышление и умение планировать ходы наперёд. В конце года — турнир и медали.
        </p>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={c.teacher} size={42} color={c.color}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Преподаватель</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{c.teacher}</div>
          </div>
        </div>
      </Card>

      <div style={{ padding: '8px 16px 100px' }}>
        {full ? (
          <PrimaryButton color="ghost" onClick={() => state.toast('Записан в лист ожидания')}>В лист ожидания</PrimaryButton>
        ) : enrolled ? (
          <PrimaryButton color="ghost" onClick={() => { state.toggleClub(c.name); state.toast('Запись отменена'); }}>Отменить запись</PrimaryButton>
        ) : (
          <PrimaryButton color="green" onClick={() => { state.toggleClub(c.name); state.toast(`Записан на «${c.name}»`); }}>Записаться</PrimaryButton>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST TAB — Homework + AI-tests hub
// ═══════════════════════════════════════════════════════════════════════════
const HOMEWORK = [
  { subject: 'Математика', task: '№ 215, 217 на стр. 88', due: 'до завтра', urgent: true,  color: 'blue' },
  { subject: 'Чтение',     task: 'Стр. 42–45 + рисунок героя', due: 'до завтра', urgent: true, color: 'blue' },
  { subject: 'Английский', task: 'Учить слова: animals', due: 'до пятницы', urgent: false, color: 'red' },
  { subject: 'Казахский',  task: 'Упр. 12 устно', due: 'до пн.', urgent: false, color: 'green' },
  { subject: 'Естествозн.',task: 'Принести листик дерева', due: 'до чт.', urgent: false, color: 'green' },
];

const AI_TESTS_AVAILABLE = [
  { subject: 'Чтение',     title: 'Сказка «Алдар-Косе и бай»', qs: 5, reward: 20, color: 'blue',  status: 'new' },
  { subject: 'Математика', title: 'Умножение на 7',            qs: 6, reward: 24, color: 'blue', status: 'new' },
  { subject: 'Английский', title: 'Past Simple — глаголы',    qs: 5, reward: 20, color: 'red', status: 'new' },
];
const AI_TESTS_DONE = [
  { subject: 'Чтение',     title: 'Стихи Абая',                qs: 5, score: '5/5', color: 'blue', status: 'done', date: '23 мая' },
  { subject: 'Математика', title: 'Деление в столбик',         qs: 6, score: '5/6', color: 'blue', status: 'done', date: '20 мая' },
];

function StudentTest({ nav }) {
  const [tab, setTab] = React.useState('hw');
  const state = useAppState();

  return (
    <>
      <ScreenHeader title="Учёба" large sub="Домашние задания и AI-тесты"/>

      {/* Segmented tab control */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', margin: '0 16px 14px', borderRadius: 16, padding: 4 }}>
        {[
          { id: 'hw',    label: 'Домашка',  count: HOMEWORK.length },
          { id: 'tests', label: 'AI-тесты', count: AI_TESTS_AVAILABLE.length },
        ].map(t => {
          const isOn = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              background: isOn ? 'var(--surface)' : 'transparent',
              color: isOn ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: 600, fontSize: 14,
              boxShadow: isOn ? '0 1px 3px rgba(20,17,13,0.08)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {t.label}
              <span style={{
                background: isOn ? 'var(--tamos-green)' : 'var(--ink-3)',
                color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '1px 7px', borderRadius: 999,
              }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {tab === 'hw' && (
        <>
          <SectionTitle title="К завтра" right={<Pill color="red">{HOMEWORK.filter(h => h.urgent).length}</Pill>}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 18px' }}>
            {HOMEWORK.filter(h => h.urgent).map((h, i) => <HomeworkRow key={i} hw={h} nav={nav} state={state}/>)}
          </div>
          <SectionTitle title="На неделю"/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 100px' }}>
            {HOMEWORK.filter(h => !h.urgent).map((h, i) => <HomeworkRow key={i} hw={h} nav={nav} state={state}/>)}
          </div>
        </>
      )}

      {tab === 'tests' && (
        <>
          {/* Featured AI-test card */}
          <Card style={{ margin: '0 16px 16px', padding: 18, background: 'linear-gradient(115deg, #2C4A9E 0%, #1F3A82 100%)', color: '#fff', position: 'relative', overflow: 'hidden', border: 'none' }} onClick={() => nav('aitest')}>
            <HexPattern color="rgba(255,255,255,0.10)" size={28}/>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, position: 'relative', flexShrink: 0 }}>
                <Hex size={56} fill="rgba(255,255,255,0.20)"/>
                <Icon name="sparkle" size={28} color="#fff" style={{ position: 'absolute', inset: 14 }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.85 }}>Сегодня</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>Тест по чтению</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>5 вопросов · +20 звёзд</div>
              </div>
              <Icon name="arrowRight" size={22} color="#fff"/>
            </div>
          </Card>

          <SectionTitle title="Доступные тесты"/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 18px' }}>
            {AI_TESTS_AVAILABLE.map((t, i) => <TestRow key={i} test={t} nav={nav}/>)}
          </div>

          <SectionTitle title="История"/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 100px' }}>
            {AI_TESTS_DONE.map((t, i) => <TestRow key={i} test={t} nav={nav}/>)}
          </div>
        </>
      )}
    </>
  );
}

function HomeworkRow({ hw, nav, state }) {
  const key = `${hw.subject}-${hw.task}`;
  const isDone = state.homework[key];
  return (
    <Card style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={() => {
          if (!isDone) {
            state.toggleHomework(key);
            state.addStars(5);
            state.toast('+5 ★ за домашнее задание');
          } else state.toggleHomework(key);
        }}
        style={{
          width: 28, height: 28, borderRadius: 999, flexShrink: 0,
          border: isDone ? 'none' : '2px solid var(--border-strong)',
          background: isDone ? 'var(--tamos-green)' : 'var(--surface)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {isDone && <Icon name="check" size={16} strokeWidth={2.5}/>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative', width: 18, height: 18 }}>
            <Hex size={18} fill={`var(--tamos-${hw.color})`}/>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{hw.subject}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--ink-3)' : 'var(--ink)' }}>{hw.task}</div>
      </div>
      <Pill color={hw.urgent ? 'red' : 'gray'}>{hw.due}</Pill>
    </Card>
  );
}

function TestRow({ test, nav }) {
  const done = test.status === 'done';
  return (
    <Card onClick={() => !done && nav('aitest')} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, opacity: done ? 0.85 : 1 }}>
      <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
        <Hex size={44} fill={done ? 'var(--bg-2)' : `var(--tamos-${test.color})`}/>
        <Icon name={done ? 'check' : 'sparkle'} size={20} color={done ? 'var(--tamos-green)' : '#fff'} style={{ position: 'absolute', inset: 12 }} strokeWidth={done ? 2.4 : 1.8}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{test.subject}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{test.title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
          {test.qs} вопросов · {done ? `${test.date} · ${test.score}` : `+${test.reward} ★`}
        </div>
      </div>
      {!done && <Icon name="chevronRight" size={18} color="var(--ink-3)"/>}
    </Card>
  );
}
const AI_QUESTIONS = [
  {
    q: 'Кто главный герой сказки?',
    options: [
      { id: 'a', t: 'Алдар-Косе' },
      { id: 'b', t: 'Бай' },
      { id: 'c', t: 'Купец' },
      { id: 'd', t: 'Пастух' },
    ],
    correct: 'a',
  },
  {
    q: 'Что Алдар-Косе обещал баю взамен на шубу?',
    options: [
      { id: 'a', t: 'Деньги' },
      { id: 'b', t: 'Волшебное кольцо' },
      { id: 'c', t: 'Барана' },
      { id: 'd', t: 'Лошадь' },
    ],
    correct: 'b',
  },
  {
    q: 'Почему бай согласился отдать Алдар-Косе свою шубу?',
    options: [
      { id: 'a', t: 'Потому что он был щедрым' },
      { id: 'b', t: 'Потому что Алдар-Косе его обманул' },
      { id: 'c', t: 'Потому что наступил мороз' },
      { id: 'd', t: 'Потому что это был подарок' },
    ],
    correct: 'b',
  },
  {
    q: 'Какая главная черта характера Алдар-Косе?',
    options: [
      { id: 'a', t: 'Хитрость и смекалка' },
      { id: 'b', t: 'Жадность' },
      { id: 'c', t: 'Лень' },
      { id: 'd', t: 'Трусость' },
    ],
    correct: 'a',
  },
  {
    q: 'Чему учит эта сказка?',
    options: [
      { id: 'a', t: 'Богатые всегда правы' },
      { id: 'b', t: 'Жадность наказуема' },
      { id: 'c', t: 'Лучше молчать' },
      { id: 'd', t: 'Не доверять никому' },
    ],
    correct: 'b',
  },
];

function StudentAITest({ nav }) {
  const [step, setStep] = React.useState('intro'); // intro | q | result
  const [qIdx, setQIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState([]); // array of selected option ids
  const [selected, setSelected] = React.useState(null);
  const state = useAppState();

  const total = AI_QUESTIONS.length;
  const correctCount = answers.reduce((n, a, i) => n + (a === AI_QUESTIONS[i].correct ? 1 : 0), 0);
  const reward = correctCount * 4; // up to 20 stars

  if (step === 'intro') {
    return (
      <>
        <ScreenHeader title="AI-тест" back={() => nav.back()}/>
        <div style={{ padding: '0 16px' }}>
          <div style={{ borderRadius: 26, padding: 24, background: 'linear-gradient(135deg, #2C4A9E 0%, #1F3A82 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <HexPattern color="rgba(255,255,255,0.10)" size={30}/>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 64, height: 64, position: 'relative' }}>
                <Hex size={64} fill="rgba(255,255,255,0.18)"/>
                <Icon name="sparkle" size={32} color="#fff" style={{ position: 'absolute', inset: 16 }}/>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 16, letterSpacing: -0.5 }}>Чтение · 4 класс</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Сказка «Алдар-Косе и бай»</div>
              <div style={{ marginTop: 18, display: 'flex', gap: 16 }}>
                <div><div style={{ fontSize: 11, opacity: 0.7 }}>Вопросов</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{total}</div></div>
                <div><div style={{ fontSize: 11, opacity: 0.7 }}>Время</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>5 мин</div></div>
                <div><div style={{ fontSize: 11, opacity: 0.7 }}>Награда</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>+20 ★</div></div>
              </div>
            </div>
          </div>

          <Card style={{ marginTop: 14, padding: 16, background: 'var(--surface-2)', border: '1px dashed var(--border-strong)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Icon name="sparkle" size={18} color="var(--tamos-blue)"/>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Тест сгенерирован AI на основе материалов урока, загруженных учителем.</div>
            </div>
          </Card>

          <div style={{ marginTop: 18 }}>
            <PrimaryButton color="blue" onClick={() => { setStep('q'); setQIdx(0); setAnswers([]); setSelected(null); }}><Icon name="play" size={16} color="#fff"/> Начать</PrimaryButton>
          </div>
        </div>
      </>
    );
  }

  if (step === 'q') {
    const cur = AI_QUESTIONS[qIdx];
    return (
      <>
        <ScreenHeader title={`Вопрос ${qIdx + 1} из ${total}`} back={() => nav.back()}/>
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
            {AI_QUESTIONS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i <= qIdx ? 'var(--tamos-blue)' : 'var(--bg-2)' }}/>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Вопрос</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: -0.3, lineHeight: 1.3 }}>{cur.q}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            {cur.options.map(o => {
              const isOn = selected === o.id;
              return (
                <button key={o.id} onClick={() => setSelected(o.id)} style={{
                  padding: '16px 16px', borderRadius: 18, textAlign: 'left',
                  background: isOn ? 'var(--blue-soft)' : 'var(--surface)',
                  border: `2px solid ${isOn ? 'var(--tamos-blue)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: isOn ? 'var(--tamos-blue)' : 'var(--bg-2)',
                    color: isOn ? '#fff' : 'var(--ink-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14, textTransform: 'uppercase',
                  }}>{o.id}</div>
                  <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{o.t}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '8px 16px 100px' }}>
          <PrimaryButton color="blue" disabled={!selected} onClick={() => {
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
          }}>{qIdx + 1 === total ? 'Завершить' : 'Ответить'}</PrimaryButton>
        </div>
      </>
    );
  }

  // result
  const passed = correctCount >= 3;
  return (
    <>
      <ScreenHeader title="Готово!" back={() => nav.back()}/>
      <div style={{ padding: '0 16px', textAlign: 'center' }}>
        <div style={{ margin: '24px auto 0', width: 120, height: 120, position: 'relative' }}>
          <Hex size={120} fill={passed ? 'var(--tamos-green)' : 'var(--tamos-gold-deep)'}/>
          <Icon name={passed ? 'check' : 'star'} size={56} color="#fff" strokeWidth={3} style={{ position: 'absolute', inset: 32 }}/>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 20, letterSpacing: -0.5 }}>{passed ? 'Отлично!' : 'Хорошая попытка!'}</h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 6 }}>{correctCount} из {total} правильных ответов</p>

        <Card style={{ marginTop: 24, padding: 20, background: 'var(--gold-soft)', border: '1px solid var(--tamos-gold-deep)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, position: 'relative' }}>
              <Hex size={48} fill="var(--tamos-gold-deep)"/>
              <Icon name="star" size={24} color="#fff" style={{ position: 'absolute', inset: 12 }}/>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: 'var(--tamos-gold-deep)', fontWeight: 600 }}>+{reward} звёзд</div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>В копилку достижений</div>
            </div>
          </div>
        </Card>

        <Card style={{ marginTop: 12, padding: 16, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Разбор</div>
          {AI_QUESTIONS.map((q, i) => {
            const ok = answers[i] === q.correct;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 13 }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: ok ? 'var(--green-soft)' : 'var(--red-soft)', color: ok ? 'var(--tamos-green)' : 'var(--tamos-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={ok ? 'check' : 'x'} size={12} strokeWidth={2.4}/>
                </div>
                <div style={{ flex: 1, color: ok ? 'var(--ink)' : 'var(--ink-2)' }}>{q.q}</div>
              </div>
            );
          })}
        </Card>
      </div>
      <div style={{ padding: '24px 16px 100px', display: 'flex', gap: 8 }}>
        <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onClick={() => { setStep('intro'); setAnswers([]); }}>Ещё раз</PrimaryButton>
        <PrimaryButton color="green" full={false} style={{ flex: 1 }} onClick={() => nav.back()}>Готово</PrimaryButton>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════
function StudentEvents({ nav }) {
  const state = useAppState();
  return (
    <>
      <ScreenHeader title="Ивенты" large sub="Школьные события и записи"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 16px 100px' }}>
        {EVENTS.map((e, i) => {
          const going = state.events[e.name] ?? e.going;
          return (
            <Card key={i} style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 88, position: 'relative', background: `var(--tamos-${e.color})`, padding: 16, color: '#fff' }}>
                <HexPattern color="rgba(255,255,255,0.10)" size={22}/>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Pill style={{ background: 'rgba(255,255,255,0.20)', color: '#fff' }}>
                      {e.vip && <Icon name="star" size={10}/>}
                      {e.tag}
                    </Pill>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 10, lineHeight: 1.2 }}>{e.name}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Когда</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{e.date} · {e.time}</div>
                </div>
                <div style={{ flex: 1 }}/>
                {going ? (
                  <button onClick={() => { state.toggleEvent(e.name); state.toast('Запись отменена'); }}
                    style={{ padding: '8px 14px', borderRadius: 999, background: 'var(--green-soft)', color: 'var(--tamos-green)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="check" size={11}/> Иду
                  </button>
                ) : (
                  <button onClick={() => { state.toggleEvent(e.name); state.toast(e.vip ? 'Запрос отправлен' : `Записан · ${e.name}`); }}
                    style={{ padding: '8px 14px', borderRadius: 999, background: 'var(--tamos-green)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                    {e.vip ? 'Запросить' : 'Записаться'}
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════════════════════
function StudentAchievements({ nav }) {
  return (
    <>
      <ScreenHeader title="Достижения" large sub={`Уровень ${STUDENT.level} · ${STUDENT.levelTitle}`}/>
      {/* Level progress */}
      <Card style={{ margin: '4px 16px 18px', padding: 18, background: 'linear-gradient(135deg, var(--tamos-gold) 0%, var(--tamos-gold-deep) 100%)', color: '#14110D', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <HexPattern color="rgba(20,17,13,0.10)" size={24}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <Hex size={64} fill="rgba(20,17,13,0.18)"/>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>{STUDENT.level}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', opacity: 0.7 }}>Твой уровень</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{STUDENT.levelTitle}</div>
            <div style={{ marginTop: 8, height: 8, background: 'rgba(20,17,13,0.15)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${STUDENT.levelProgress * 100}%`, height: '100%', background: '#14110D' }}/>
            </div>
            <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600 }}>120 ★ до уровня 8</div>
          </div>
        </div>
      </Card>

      <SectionTitle title="Ачивки"/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 16px 100px' }}>
        {ACHIEVEMENTS.map((a, i) => <AchievementCard key={i} a={a}/>)}
      </div>
    </>
  );
}

function AchievementCard({ a }) {
  return (
    <Card style={{ padding: 14, opacity: a.earned ? 1 : 0.7 }}>
      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <Hex size={60} fill={a.earned ? `var(--tamos-${a.color})` : 'var(--bg-2)'}/>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.earned ? '#fff' : 'var(--ink-3)', fontSize: 26, fontWeight: 700 }}>{a.icon}</div>
        {!a.earned && (
          <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 999, background: 'var(--surface)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12 }}>🔒</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10 }}>{a.name}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{a.desc}</div>
      {a.earned ? (
        <Pill color="gold" style={{ marginTop: 8 }}><Icon name="star" size={10}/> +{a.stars}</Pill>
      ) : (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 5, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${a.progress * 100}%`, height: '100%', background: `var(--tamos-${a.color})` }}/>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, fontWeight: 600 }}>{Math.round(a.progress * 100)}%</div>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HEROES — engagement module
// ═══════════════════════════════════════════════════════════════════════════
function StudentHeroes({ nav }) {
  const heroes = [
    { name: 'Алия', color: 'red',   tag: 'Лидер', level: 5, hp: 0.8, progress: 0.7 },
    { name: 'Бату', color: 'green', tag: 'Учёный',     level: 4, hp: 0.95, progress: 0.4 },
    { name: 'Дана', color: 'blue',  tag: 'Творец',     level: 3, hp: 0.6, progress: 0.2 },
  ];
  return (
    <>
      <ScreenHeader title="Heroes" large sub="Твоя команда героев Tamos"/>

      {/* Hero scene */}
      <div style={{ margin: '0 16px 18px', borderRadius: 26, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(180deg, #2C4A9E 0%, #1F3A82 60%, #14110D 100%)',
        color: '#fff', height: 220, padding: 18,
      }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={28}/>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
          <Pill style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>Команда · Сезон 3</Pill>
          <Pill style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}><Icon name="star" size={11}/> 248</Pill>
        </div>
        {/* hexes for heroes */}
        <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: -8 }}>
          {heroes.map((h, i) => (
            <div key={i} style={{ position: 'relative', marginLeft: i ? -12 : 0, transform: i === 1 ? 'translateY(-12px)' : 'none' }}>
              <Hex size={86} fill={`var(--tamos-${h.color})`}/>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 26 }}>{h.name[0]}</div>
              <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', background: 'var(--tamos-gold)', color: '#14110D', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 999 }}>LVL {h.level}</div>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle title="Твои герои"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 18px' }}>
        {heroes.map((h, i) => (
          <Card key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', width: 52, height: 52 }}>
              <Hex size={52} fill={`var(--tamos-${h.color})`}/>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>{h.name[0]}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{h.name}</span>
                <Pill color={h.color}>{h.tag}</Pill>
              </div>
              <div style={{ marginTop: 8, height: 5, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${h.progress * 100}%`, height: '100%', background: `var(--tamos-${h.color})` }}/>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>До уровня {h.level + 1} · {Math.round((1 - h.progress) * 100)}%</div>
            </div>
            <Icon name="chevronRight" size={18} color="var(--ink-3)"/>
          </Card>
        ))}
      </div>

      <SectionTitle title="Сезонные квесты"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 100px' }}>
        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 44, height: 44, position: 'relative' }}>
              <Hex size={44} fill="var(--tamos-gold-deep)"/>
              <Icon name="target" size={20} color="#fff" style={{ position: 'absolute', inset: 12 }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Без пропусков 5 дней</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>Награда: герой получит +1 уровень</div>
              <div style={{ marginTop: 8, height: 5, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', background: 'var(--tamos-gold-deep)' }}/>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>3 / 5 дней</div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL MAP
// ═══════════════════════════════════════════════════════════════════════════
function StudentMap({ nav }) {
  const rooms = [
    { id: '204', subject: 'Математика', x: 80,  y: 120, color: 'blue', size: 70 },
    { id: '312', subject: 'Английский', x: 200, y: 80,  color: 'red',  size: 70 },
    { id: '207', subject: 'Чтение',     x: 180, y: 200, color: 'green', size: 78, active: true },
    { id: '304', subject: 'Естествозн.', x: 90,  y: 250, color: 'green', size: 64 },
    { id: '110', subject: 'Музыка',     x: 240, y: 320, color: 'gold', size: 64 },
    { id: 'СЗ',  subject: 'Спортзал',   x: 90,  y: 360, color: 'red',  size: 72 },
  ];
  return (
    <>
      <ScreenHeader title="Карта школы" large sub="2 этаж · Главный корпус"/>
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 14px' }}>
        {['1 этаж', '2 этаж', '3 этаж'].map((f, i) => (
          <button key={i} style={{
            flex: 1, height: 40, borderRadius: 14,
            background: i === 1 ? 'var(--tamos-green)' : 'var(--surface)',
            color: i === 1 ? '#fff' : 'var(--ink-2)',
            border: i === 1 ? 'none' : '1px solid var(--border)',
            fontWeight: 600, fontSize: 13,
          }}>{f}</button>
        ))}
      </div>

      <div style={{ margin: '0 16px 18px', position: 'relative', height: 460, borderRadius: 26, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <HexPattern color="var(--bg-2)" size={32}/>
        {/* hallway path */}
        <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%">
          <path d="M 130 80 L 130 380 M 130 380 L 280 380 M 130 200 L 250 200" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="6 4" fill="none"/>
        </svg>
        {rooms.map(r => (
          <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.size, height: r.size }}>
            <Hex size={r.size} fill={r.active ? `var(--tamos-${r.color})` : 'var(--surface-2)'} stroke={r.active ? 'transparent' : `var(--tamos-${r.color})`} strokeWidth={r.active ? 0 : 3}/>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: r.active ? '#fff' : `var(--tamos-${r.color})` }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{r.id}</div>
              <div style={{ fontSize: 8, fontWeight: 600, opacity: 0.8 }}>{r.subject}</div>
            </div>
          </div>
        ))}
        {/* you-are-here marker */}
        <div style={{ position: 'absolute', left: 200, top: 230, width: 16, height: 16, borderRadius: 999, background: 'var(--tamos-red)', border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}/>
      </div>

      <SectionTitle title="Сейчас идёт"/>
      <Card style={{ margin: '0 16px 100px', padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', width: 44, height: 44 }}>
          <Hex size={44} fill="var(--tamos-green)"/>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>207</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Чтение</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Кабинет 207 · 2 этаж</div>
        </div>
        <Pill color="green">Тут ты сейчас</Pill>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOP / CURRENCY
// ═══════════════════════════════════════════════════════════════════════════
function StudentShop({ nav }) {
  const state = useAppState();
  const [owned, setOwned] = React.useState({ 'Золотая рамка': true });
  const items = [
    { name: 'Радужный ник',   price: 30,  color: 'red',  cat: 'Профиль', kind: 'ник' },
    { name: 'Золотая рамка',  price: 50,  color: 'gold', cat: 'Профиль', kind: 'рамка' },
    { name: 'Аватар: Сова',   price: 25,  color: 'blue', cat: 'Аватары', kind: 'аватар' },
    { name: 'Аватар: Лиса',   price: 25,  color: 'red',  cat: 'Аватары', kind: 'аватар' },
    { name: 'Аватар: Тигр',   price: 40,  color: 'gold', cat: 'Аватары', kind: 'аватар' },
    { name: 'Зелёный значок', price: 15,  color: 'green', cat: 'Значки',  kind: 'значок' },
  ];

  const buy = (it) => {
    if (owned[it.name]) return;
    if (state.coins < it.price) {
      state.toast('Не хватает тамо-коинов');
      return;
    }
    state.addCoins(-it.price);
    setOwned(p => ({ ...p, [it.name]: true }));
    state.toast(`Куплено · «${it.name}»`);
  };

  return (
    <>
      <ScreenHeader title="Магазин" back={() => nav.back()}/>
      <Card style={{ margin: '0 16px 16px', padding: 16, background: 'linear-gradient(115deg, #D63030 0%, #B12626 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={24}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, position: 'relative' }}>
            <Hex size={48} fill="rgba(255,255,255,0.20)"/>
            <Icon name="coin" size={24} color="#fff" style={{ position: 'absolute', inset: 12 }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Твой баланс</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.4 }}>{state.coins} <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.9 }}>тамо-коинов</span></div>
          </div>
        </div>
      </Card>

      <SectionTitle title="Что купить"/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 16px 100px' }}>
        {items.map((it, i) => {
          const isOwned = owned[it.name];
          const tooExpensive = !isOwned && state.coins < it.price;
          return (
            <Card key={i} style={{ padding: 14, position: 'relative', opacity: tooExpensive ? 0.6 : 1, cursor: 'pointer' }} onClick={() => buy(it)}>
              <div style={{ width: 56, height: 56, position: 'relative', margin: '0 auto' }}>
                <Hex size={56} fill={`var(--tamos-${it.color})`}/>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>
                  {it.kind === 'аватар' ? '◉' : it.kind === 'рамка' ? '◇' : it.kind === 'значок' ? '✦' : '◈'}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10, textAlign: 'center' }}>{it.name}</div>
              {isOwned ? (
                <div style={{ marginTop: 6, textAlign: 'center', color: 'var(--tamos-green)', fontSize: 12, fontWeight: 700 }}>
                  <Icon name="check" size={12}/> Куплено
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6, color: 'var(--tamos-red)', fontWeight: 700, fontSize: 13 }}>
                  <Icon name="coin" size={13}/> {it.price}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════
function StudentProfile({ nav, onSignOut }) {
  const state = useAppState();
  return (
    <>
      <div style={{ padding: '14px 16px 8px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', position: 'relative' }}>
          <Avatar name={STUDENT.name} size={86} color="green"/>
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 999, background: 'var(--tamos-gold)', color: '#14110D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, border: '3px solid var(--bg)' }}>{STUDENT.level}</div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 12, letterSpacing: -0.3 }}>{STUDENT.name}</h1>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>{STUDENT.grade} · {STUDENT.levelTitle}</div>
        <div style={{ marginTop: 10, display: 'inline-flex', gap: 6 }}>
          <Pill color="gold"><Icon name="star" size={11}/> {state.stars}</Pill>
          <Pill color="red"><Icon name="coin" size={11}/> {state.coins}</Pill>
          <Pill color="green"><Icon name="flame" size={11}/> {STUDENT.streak}</Pill>
        </div>
      </div>

      {/* Achievements teaser card */}
      <Card style={{ margin: '12px 16px 12px', padding: 18, background: 'linear-gradient(135deg, var(--tamos-gold) 0%, var(--tamos-gold-deep) 100%)', color: '#14110D', border: 'none', position: 'relative', overflow: 'hidden' }} onClick={() => nav('achievements')}>
        <HexPattern color="rgba(20,17,13,0.10)" size={24}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 52, height: 52 }}>
            <Hex size={52} fill="rgba(20,17,13,0.18)"/>
            <Icon name="trophy" size={24} color="#14110D" style={{ position: 'absolute', inset: 14 }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', opacity: 0.7 }}>Достижения</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>Уровень {STUDENT.level} · {ACHIEVEMENTS.filter(a => a.earned).length} ачивок</div>
            <div style={{ marginTop: 8, height: 6, background: 'rgba(20,17,13,0.18)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${STUDENT.levelProgress * 100}%`, height: '100%', background: '#14110D' }}/>
            </div>
          </div>
          <Icon name="chevronRight" size={20}/>
        </div>
      </Card>

      <SectionTitle title="О тебе"/>
      <Card style={{ margin: '0 16px 12px', padding: 0 }}>
        <ProfileRow icon="user" title="Классный руководитель" value={STUDENT.classTeacher}/>
        <ProfileRow icon="calendar" title="Посещаемость" value="96%"/>
        <ProfileRow icon="book" title="Средний балл" value="4.6"/>
        <ProfileRow icon="bag" title="Кружков" value="2" last/>
      </Card>

      <SectionTitle title="Настройки"/>
      <Card style={{ margin: '0 16px 12px', padding: 0 }}>
        <ProfileRow icon="bell" title="Уведомления"/>
        <ProfileRow icon="settings" title="Язык" value="Русский"/>
        <ProfileRow icon="face" title="Face ID" value="Включён" last/>
      </Card>

      <div style={{ padding: '8px 16px 100px' }}>
        <button onClick={onSignOut} style={{ color: 'var(--tamos-red)', fontWeight: 600, fontSize: 14, width: '100%', textAlign: 'center', padding: 14 }}>Выйти</button>
      </div>
    </>
  );
}

function ProfileRow({ icon, title, value, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Icon name={icon} size={16} color="var(--ink-2)"/>
      </div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{title}</div>
      {value && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginRight: 6 }}>{value}</div>}
      <Icon name="chevronRight" size={14} color="var(--ink-3)"/>
    </div>
  );
}

Object.assign(window, {
  STUDENT, TODAY_SCHEDULE, SUBJECTS_DIARY, CLUBS, ACHIEVEMENTS, EVENTS, SUBJECT_COLORS,
  HOMEWORK, AI_TESTS_AVAILABLE, AI_TESTS_DONE,
  StudentHome, StudentSchedule, StudentLesson, StudentCheckoutQR,
  StudentDiary, StudentSubject, StudentTest,
  StudentClubs, StudentClub, StudentAITest, StudentEvents,
  StudentAchievements, StudentHeroes, StudentMap, StudentShop, StudentProfile,
  LessonRow, SectionTitle, QRMockup, SubjectRow, ClubCard, AchievementCard, ProfileRow,
  HomeworkRow, TestRow,
});
