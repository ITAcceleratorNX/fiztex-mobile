// Parent screens — dashboard, child summary, attendance, grades, feedback, service

const PARENT = {
  name: 'Болат С.',
  short: 'Болат',
  children: [
    { name: 'Айкоркем', grade: '4 «Б»', avatar: 'green', status: 'В школе', lastSeen: '08:30' },
    { name: 'Тимур',     grade: '2 «А»', avatar: 'blue',  status: 'В школе', lastSeen: '08:28' },
  ],
};

const ATTENDANCE_LOG = [
  { d: 'Сегодня', time: '08:30', kind: 'in',  room: 'Главный вход',   icon: 'arrowRight', color: 'green' },
  { d: 'Сегодня', time: '08:33', kind: 'class', room: 'Каб. 204 · Математика', icon: 'check', color: 'green' },
  { d: 'Сегодня', time: '10:00', kind: 'class', room: 'Каб. 312 · Английский', icon: 'check', color: 'green' },
  { d: 'Вчера',   time: '14:15', kind: 'out', room: 'Главный выход',  icon: 'arrowRight', color: 'blue' },
  { d: 'Вчера',   time: '14:00', kind: 'class', room: 'Каб. 207 · Чтение', icon: 'check', color: 'green' },
  { d: 'Вчера',   time: '12:30', kind: 'late', room: 'Каб. 110 · Музыка', icon: 'clock', color: 'gold' },
];

const FEEDBACK = {
  month: 'Май 2026',
  teacher: 'Айгерим Болатовна',
  rating: 4.8,
  strengths: ['Активно работает на уроке', 'Помогает одноклассникам', 'Прогресс в чтении'],
  improvements: ['Иногда забывает домашнее задание по математике'],
  body: 'Айкоркем показала отличные результаты в этом месяце. Особенно радует прогресс в чтении — стала читать с выражением и пересказывает прочитанное. На переменах остаётся доброжелательной, помогает другим. Прошу обратить внимание на регулярность выполнения домашних заданий по математике.',
};

// ═══════════════════════════════════════════════════════════════════════════
// PARENT HOME
// ═══════════════════════════════════════════════════════════════════════════
function ParentHome({ nav }) {
  const [activeChild, setActiveChild] = React.useState(0);
  const child = PARENT.children[activeChild];

  return (
    <>
      <AppHeader
        greeting="Здравствуйте,"
        name={PARENT.name}
        right={
          <button onClick={() => nav('notifications')} style={{
            width: 44, height: 44, borderRadius: 999, background: 'var(--surface)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <Icon name="bell" size={20}/>
            <span style={{ position: 'absolute', top: 9, right: 11, width: 8, height: 8, borderRadius: 999, background: 'var(--tamos-red)' }}/>
          </button>
        }
      />

      {/* Child switcher */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
        {PARENT.children.map((c, i) => {
          const isOn = i === activeChild;
          return (
            <button key={i} onClick={() => setActiveChild(i)} style={{
              flex: 1, padding: 12, borderRadius: 18, textAlign: 'left',
              background: isOn ? 'var(--surface)' : 'transparent',
              border: `1px solid ${isOn ? 'var(--tamos-green)' : 'var(--border)'}`,
              boxShadow: isOn ? '0 0 0 3px var(--green-soft)' : 'none',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Avatar name={c.name} size={36} color={c.avatar}/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.grade}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status card */}
      <Card style={{ margin: '0 16px 16px', padding: 18, background: 'linear-gradient(135deg, #2A8847 0%, #1B6B36 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={28}/>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>{child.name} сейчас</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, letterSpacing: -0.4 }}>{child.status}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Зашла в школу в {child.lastSeen}</div>
            </div>
            <Pill style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}><span style={{ width: 6, height: 6, borderRadius: 999, background: '#A3E5A8' }}/> live</Pill>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Сейчас</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>Чтение · каб. 207</div>
            </div>
            <div style={{ flex: 1 }}/>
            <button onClick={() => nav('attendance')} style={{ color: '#fff', fontSize: 13, fontWeight: 600, opacity: 0.95 }}>История →</button>
          </div>
        </div>
      </Card>

      {/* Today */}
      <SectionTitle title={`Расписание · ${child.name}`} right={<button onClick={() => nav('schedule')} style={{ color: 'var(--tamos-green)', fontSize: 14, fontWeight: 600 }}>Всё →</button>}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 18px' }}>
        {TODAY_SCHEDULE.slice(0, 3).map((l, i) => <LessonRow key={i} lesson={l} onClick={() => nav('lesson', l)}/>)}
      </div>

      {/* Recent grades */}
      <SectionTitle title="Свежие оценки" right={<button onClick={() => nav('grades')} style={{ color: 'var(--tamos-green)', fontSize: 14, fontWeight: 600 }}>Дневник →</button>}/>
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 18px', overflowX: 'auto' }} className="tamos-scroll">
        {[
          { s: 'Математика', g: 5, color: 'blue', d: 'сегодня' },
          { s: 'Чтение',     g: 5, color: 'blue', d: 'вчера' },
          { s: 'Английский', g: 4, color: 'red',  d: 'вчера' },
          { s: 'Естествозн.', g: 5, color: 'green', d: '23 мая' },
        ].map((row, i) => (
          <Card key={i} style={{ padding: 14, minWidth: 130, flexShrink: 0 }}>
            <div style={{ position: 'relative', width: 40, height: 40 }}>
              <Hex size={40} fill={`var(--tamos-${row.color})`}/>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{row.g}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{row.s}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{row.d}</div>
          </Card>
        ))}
      </div>

      {/* Monthly feedback teaser */}
      <Card style={{ margin: '0 16px 18px', padding: 18, background: 'linear-gradient(115deg, #F2B73D 0%, #D69A1E 100%)', color: '#14110D', border: 'none', position: 'relative', overflow: 'hidden' }} onClick={() => nav('feedback')}>
        <HexPattern color="rgba(20,17,13,0.10)" size={24}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, position: 'relative' }}>
            <Hex size={52} fill="rgba(20,17,13,0.20)"/>
            <Icon name="chat" size={24} color="#14110D" style={{ position: 'absolute', inset: 14 }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', opacity: 0.7 }}>Новый отзыв</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>Фидбек за май готов</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>От {FEEDBACK.teacher}</div>
          </div>
          <Icon name="chevronRight" size={20}/>
        </div>
      </Card>

      {/* Quick actions */}
      <SectionTitle title="Быстро"/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 16px 100px' }}>
        <QuickAction icon="bag" color="green" label="Кружки" onClick={() => nav('clubs')}/>
        <QuickAction icon="calendar" color="blue" label="Ивенты" onClick={() => nav('events')}/>
        <QuickAction icon="chat" color="gold" label="Фидбек" onClick={() => nav('feedback')}/>
        <QuickAction icon="clean" color="red" label="Сервис" onClick={() => nav('service')}/>
      </div>
    </>
  );
}

function QuickAction({ icon, color, label, onClick }) {
  return (
    <Card onClick={onClick} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative', width: 40, height: 40 }}>
        <Hex size={40} fill={`var(--tamos-${color})`}/>
        <Icon name={icon} size={18} color="#fff" style={{ position: 'absolute', inset: 11 }}/>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PARENT ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════
function ParentAttendance({ nav }) {
  return (
    <>
      <ScreenHeader title="Посещаемость" large sub="Айкоркем · 4 «Б»"/>

      {/* Today summary */}
      <Card style={{ margin: '0 16px 16px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--tamos-green)' }}/>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tamos-green)' }}>В школе сейчас</div>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Зашёл</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>08:30</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Уроков пройдено</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>2 / 6</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>За месяц</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>96%</div>
          </div>
        </div>
      </Card>

      <SectionTitle title="Журнал"/>
      <div style={{ margin: '0 16px 100px' }}>
        {ATTENDANCE_LOG.map((row, i) => {
          const prevDay = i > 0 ? ATTENDANCE_LOG[i - 1].d : null;
          return (
            <React.Fragment key={i}>
              {row.d !== prevDay && (
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4, padding: '10px 4px 6px' }}>{row.d}</div>
              )}
              <Card style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: `var(--${row.color === 'gold' ? 'gold-soft' : row.color === 'green' ? 'green-soft' : 'blue-soft'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: `var(--tamos-${row.color === 'gold' ? 'gold-deep' : row.color})` }}>
                  <Icon name={row.icon} size={18}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {row.kind === 'in' && 'Зашёл в школу'}
                    {row.kind === 'out' && 'Вышел из школы'}
                    {row.kind === 'class' && row.room}
                    {row.kind === 'late' && `Опоздание · ${row.room}`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{row.kind === 'in' || row.kind === 'out' ? row.room : ''}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>{row.time}</div>
              </Card>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PARENT GRADES (uses StudentDiary content but reframed)
// ═══════════════════════════════════════════════════════════════════════════
function ParentGrades({ nav }) {
  return (
    <>
      <ScreenHeader title="Дневник" large sub="Айкоркем · средний балл 4.6"/>

      <Card style={{ margin: '0 16px 16px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
          {[4.2, 4.3, 4.4, 4.5, 4.5, 4.6, 4.7].map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', height: `${(v - 3.5) / 1.6 * 100}%`, background: i === 6 ? 'var(--tamos-green)' : 'var(--green-soft)', borderRadius: 6 }}/>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ink-3)' }}>
          <span>Окт</span><span>Ноя</span><span>Дек</span><span>Янв</span><span>Фев</span><span>Мар</span><span>Май</span>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: 'var(--green-soft)', borderRadius: 12, fontSize: 13, color: 'var(--tamos-green-deep)', fontWeight: 500 }}>
          ↑ Прогресс за полугодие: +0.5 балла
        </div>
      </Card>

      <SectionTitle title="Предметы"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 100px' }}>
        {SUBJECTS_DIARY.map((s, i) => <SubjectRow key={i} subject={s} onClick={() => nav('subject', s)}/>)}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════
function ParentFeedback({ nav }) {
  const appState = useAppState();
  return (
    <>
      <ScreenHeader title="Ежемесячный фидбек" back={() => nav.back()}/>

      <Card style={{ margin: '0 16px 16px', padding: 22, background: 'linear-gradient(135deg, #F2B73D 0%, #D69A1E 100%)', color: '#14110D', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <HexPattern color="rgba(20,17,13,0.10)" size={26}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.4 }}>Фидбек за</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>{FEEDBACK.month}</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={FEEDBACK.teacher} size={36} color="green"/>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 500 }}>Классный руководитель</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{FEEDBACK.teacher}</div>
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="star" size={16} color="var(--tamos-gold-deep)"/>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Общая оценка</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--tamos-gold-deep)' }}>{FEEDBACK.rating}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>/ 5.0</div>
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Icon key={i} name="star" size={16} color={i <= 4.8 ? 'var(--tamos-gold)' : 'var(--bg-2)'}/>
          ))}
        </div>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tamos-green)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Что радует</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {FEEDBACK.strengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--green-soft)', color: 'var(--tamos-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={14}/>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{s}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tamos-gold-deep)', textTransform: 'uppercase', letterSpacing: 0.3 }}>На что обратить внимание</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {FEEDBACK.improvements.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--gold-soft)', color: 'var(--tamos-gold-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="target" size={14}/>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{s}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Комментарий</div>
        <p style={{ fontSize: 14, color: 'var(--ink)', marginTop: 10, lineHeight: 1.6 }}>{FEEDBACK.body}</p>
      </Card>

      <div style={{ padding: '8px 16px 100px', display: 'flex', gap: 8 }}>
        <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onClick={() => appState.toast('Открываем чат с учителем')}><Icon name="chat" size={16}/> Спросить</PrimaryButton>
        <PrimaryButton color="green" full={false} style={{ flex: 1 }} onClick={() => { appState.toast('Отмечено как прочитанное'); setTimeout(() => nav.back(), 700); }}><Icon name="check" size={16} color="#fff"/> Прочитано</PrimaryButton>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE REQUEST (cleaning)
// ═══════════════════════════════════════════════════════════════════════════
function ParentService({ nav }) {
  const [step, setStep] = React.useState('list'); // list | new | sent
  const requests = [
    { id: 1, kind: 'Клининг', sub: 'Каб. 204', status: 'В работе', color: 'gold', date: 'сегодня · 09:14' },
    { id: 2, kind: 'Клининг', sub: 'Главный вход', status: 'Готово', color: 'green', date: 'вчера' },
  ];

  if (step === 'new') {
    return (
      <>
        <ScreenHeader title="Новая заявка" back={() => setStep('list')}/>
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 }}>Тип заявки</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Card style={{ padding: 14, border: '2px solid var(--tamos-green)' }}>
              <div style={{ width: 40, height: 40, position: 'relative' }}>
                <Hex size={40} fill="var(--tamos-green)"/>
                <Icon name="clean" size={18} color="#fff" style={{ position: 'absolute', inset: 11 }}/>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>Клининг</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Уборка кабинета</div>
            </Card>
            <Card style={{ padding: 14, opacity: 0.5 }}>
              <div style={{ width: 40, height: 40, position: 'relative' }}>
                <Hex size={40} fill="var(--bg-2)"/>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>Скоро</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Другие сервисы</div>
            </Card>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 16, marginBottom: 8 }}>Локация</div>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Кабинет 204 · Математика</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>2 этаж, главный корпус</div>
          </Card>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 16, marginBottom: 8 }}>Комментарий</div>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>Запачкали доску перед уроком · нужно протереть</div>
          </Card>

          <div style={{ padding: '20px 0 100px' }}>
            <PrimaryButton color="green" onClick={() => setStep('sent')}>Отправить заявку</PrimaryButton>
          </div>
        </div>
      </>
    );
  }

  if (step === 'sent') {
    return (
      <>
        <ScreenHeader title="Готово" back={() => setStep('list')}/>
        <div style={{ padding: '0 16px', textAlign: 'center' }}>
          <div style={{ margin: '24px auto 0', width: 110, height: 110, position: 'relative' }}>
            <Hex size={110} fill="var(--tamos-green)"/>
            <Icon name="check" size={50} color="#fff" strokeWidth={3} style={{ position: 'absolute', inset: 30 }}/>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 18, letterSpacing: -0.4 }}>Заявка отправлена</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>Команда клининга получит уведомление и приступит к выполнению.</p>
          <div style={{ marginTop: 24 }}>
            <PrimaryButton color="green" onClick={() => setStep('list')}>К списку заявок</PrimaryButton>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Сервис" large sub="Заявки и обращения"/>
      <SectionTitle title="Мои заявки"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 16px' }}>
        {requests.map(r => (
          <Card key={r.id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 44, height: 44 }}>
              <Hex size={44} fill={`var(--tamos-${r.color === 'gold' ? 'gold-deep' : r.color})`}/>
              <Icon name="clean" size={20} color="#fff" style={{ position: 'absolute', inset: 12 }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{r.kind} · {r.sub}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{r.date}</div>
            </div>
            <Pill color={r.color}>{r.status}</Pill>
          </Card>
        ))}
      </div>
      <div style={{ padding: '8px 16px 100px' }}>
        <PrimaryButton color="green" onClick={() => setStep('new')}><Icon name="plus" size={18} color="#fff"/> Новая заявка</PrimaryButton>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PARENT PROFILE
// ═══════════════════════════════════════════════════════════════════════════
function ParentProfile({ nav, onSignOut }) {
  return (
    <>
      <div style={{ padding: '14px 16px 8px', textAlign: 'center' }}>
        <Avatar name={PARENT.name} size={86} color="blue"/>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 12, letterSpacing: -0.3 }}>{PARENT.name}</h1>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>Родитель · 2 ребёнка</div>
      </div>

      <SectionTitle title="Мои дети"/>
      <Card style={{ margin: '0 16px 12px', padding: 0 }}>
        {PARENT.children.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < PARENT.children.length - 1 ? '1px solid var(--border)' : 'none', gap: 12 }}>
            <Avatar name={c.name} size={38} color={c.avatar}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.grade}</div>
            </div>
            <Pill color="green"><span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--tamos-green)' }}/> в школе</Pill>
          </div>
        ))}
      </Card>

      <SectionTitle title="Договор и оплата"/>
      <Card style={{ margin: '0 16px 12px', padding: 0 }}>
        <ProfileRow icon="user" title="Договор" value="№ 2024-178"/>
        <ProfileRow icon="coin" title="Оплата за месяц" value="Оплачено"/>
        <ProfileRow icon="bag" title="Доп. услуги" value="2 кружка" last/>
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

Object.assign(window, {
  PARENT, ATTENDANCE_LOG, FEEDBACK,
  ParentHome, ParentAttendance, ParentGrades, ParentFeedback, ParentService, ParentProfile,
  QuickAction,
});
