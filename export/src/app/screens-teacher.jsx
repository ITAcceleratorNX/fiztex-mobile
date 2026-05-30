// Teacher screens — schedule, class roster + attendance, grade entry, AI test upload, feedback writing

const TEACHER = {
  name: 'Айгерим Болатовна',
  short: 'Айгерим',
  subject: 'Математика · Кл. рук. 4Б',
};

const CLASS_ROSTER = [
  { name: 'Айкоркем С.', avatar: 'green', present: true,  late: false,  grade: 5 },
  { name: 'Бахыт А.',     avatar: 'blue',  present: true,  late: true,   grade: 4 },
  { name: 'Виктория М.',  avatar: 'red',   present: true,  late: false,  grade: 5 },
  { name: 'Данияр К.',    avatar: 'gold',  present: false, late: false },
  { name: 'Ерболат Н.',   avatar: 'green', present: true,  late: false,  grade: 4 },
  { name: 'Жания Т.',     avatar: 'blue',  present: true,  late: false,  grade: 5 },
  { name: 'Камила О.',    avatar: 'red',   present: true,  late: false,  grade: 5 },
  { name: 'Лиза Р.',      avatar: 'green', present: false, late: false },
  { name: 'Мадияр Ж.',    avatar: 'blue',  present: true,  late: false,  grade: 4 },
  { name: 'Нурлан И.',    avatar: 'gold',  present: true,  late: false,  grade: 5 },
];

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER HOME
// ═══════════════════════════════════════════════════════════════════════════
function TeacherHome({ nav }) {
  return (
    <>
      <AppHeader
        greeting="Добрый день,"
        name={TEACHER.name}
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

      {/* Now teaching */}
      <Card style={{ margin: '0 16px 16px', padding: 18, background: 'linear-gradient(135deg, #2C4A9E 0%, #1F3A82 100%)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={28}/>
        <div style={{ position: 'relative' }}>
          <Pill style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>● Сейчас</Pill>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10, letterSpacing: -0.4 }}>Чтение · 4 «Б»</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Каб. 207 · 10:20–11:00</div>
          <div style={{ marginTop: 14, display: 'flex', gap: 14 }}>
            <div><div style={{ fontSize: 11, opacity: 0.7 }}>Присутствует</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>22 / 24</div></div>
            <div><div style={{ fontSize: 11, opacity: 0.7 }}>Опоздавших</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>1</div></div>
            <div style={{ flex: 1 }}/>
            <button onClick={() => nav('class')} style={{ background: 'rgba(255,255,255,0.20)', color: '#fff', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>Класс →</button>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 16px 18px' }}>
        <QuickAction icon="qr" color="green" label="Сканировать QR" onClick={() => nav('scanner')}/>
        <QuickAction icon="pencil" color="blue" label="Выставить оценки" onClick={() => nav('grade-entry')}/>
        <QuickAction icon="sparkle" color="red" label="AI-тест" onClick={() => nav('ai-upload')}/>
        <QuickAction icon="chat" color="gold" label="Фидбек" onClick={() => nav('feedback-write')}/>
      </div>

      {/* Today's classes */}
      <SectionTitle title="Расписание сегодня"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 16px 18px' }}>
        {[
          { time: '08:30', end: '09:10', subject: 'Математика · 4Б', room: 'каб. 204', status: 'done' },
          { time: '09:20', end: '10:00', subject: 'Математика · 4А', room: 'каб. 204', status: 'done' },
          { time: '10:20', end: '11:00', subject: 'Чтение · 4Б',     room: 'каб. 207', status: 'now', progress: 0.6 },
          { time: '12:30', end: '13:10', subject: 'Математика · 4В', room: 'каб. 204', status: 'upcoming' },
        ].map((l, i) => <LessonRow key={i} lesson={l} onClick={() => nav('class')}/>)}
      </div>

      {/* Pending feedback */}
      <SectionTitle title="Нужно сделать"/>
      <Card style={{ margin: '0 16px 100px', padding: 18 }} onClick={() => nav('feedback-write')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, position: 'relative' }}>
            <Hex size={44} fill="var(--tamos-gold-deep)"/>
            <Icon name="chat" size={20} color="#fff" style={{ position: 'absolute', inset: 12 }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Monthly feedback · 4 «Б»</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>До 31 мая · осталось 6 из 24 учеников</div>
            <div style={{ marginTop: 8, height: 5, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: '75%', height: '100%', background: 'var(--tamos-gold-deep)' }}/>
            </div>
          </div>
          <Icon name="chevronRight" size={18} color="var(--ink-3)"/>
        </div>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER CLASS ROSTER + ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════
function TeacherClass({ nav }) {
  const present = CLASS_ROSTER.filter(s => s.present).length;
  return (
    <>
      <ScreenHeader title="Чтение · 4 «Б»" back={() => nav.back()} right={
        <button style={{
          width: 38, height: 38, borderRadius: 999, background: 'var(--tamos-green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="qr" size={20} color="#fff"/>
        </button>
      }/>
      <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Присутствует</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--tamos-green)' }}>{present}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>/24</span></div>
        </Card>
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Опоздавших</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--tamos-gold-deep)' }}>1</div>
        </Card>
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Отсутствует</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'var(--tamos-red)' }}>2</div>
        </Card>
      </div>

      <SectionTitle title="Ученики"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 16px 100px' }}>
        {CLASS_ROSTER.map((s, i) => (
          <Card key={i} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={s.name} size={38} color={s.avatar}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                {s.present ? (s.late ? 'Опоздание · 10:24' : 'В классе · 10:18') : 'Отсутствует'}
              </div>
            </div>
            {s.present && !s.late && <Pill color="green"><Icon name="check" size={11}/></Pill>}
            {s.late && <Pill color="gold"><Icon name="clock" size={11}/></Pill>}
            {!s.present && <Pill color="red"><Icon name="x" size={11}/></Pill>}
          </Card>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER QR SCANNER (mock)
// ═══════════════════════════════════════════════════════════════════════════
function TeacherScanner({ nav }) {
  const appState = useAppState();
  const [scanned, setScanned] = React.useState(null);
  React.useEffect(() => {
    // Simulate a successful scan after 2.5s
    const t = setTimeout(() => setScanned({ name: 'Айкоркем С.', time: '11:00', subject: 'Чтение' }), 2500);
    return () => clearTimeout(t);
  }, []);

  if (scanned) {
    return (
      <div className="tamos-root" style={{ position: 'absolute', inset: 0, background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 120, height: 120, position: 'relative' }}>
          <Hex size={120} fill="var(--tamos-green)"/>
          <Icon name="check" size={56} color="#fff" strokeWidth={3} style={{ position: 'absolute', inset: 32 }}/>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 24, letterSpacing: -0.5 }}>Отмечено</h1>
        <div style={{ fontSize: 16, opacity: 0.9, marginTop: 8 }}>{scanned.name}</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{scanned.subject} · {scanned.time}</div>
        <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
          <button onClick={() => setScanned(null)} style={{ padding: '12px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 14 }}>Ещё ученик</button>
          <button onClick={() => { appState.toast('Класс отмечен'); nav.back(); }} style={{ padding: '12px 18px', borderRadius: 999, background: 'var(--tamos-green)', color: '#fff', fontWeight: 600, fontSize: 14 }}>Готово</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tamos-root" style={{ position: 'absolute', inset: 0, background: '#000', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, padding: '0 20px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => nav.back()} style={{ width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color="#fff"/>
        </button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Сканировать QR</div>
        <div style={{ width: 40 }}/>
      </div>

      {/* Scanner viewport */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 260, height: 260 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 32, border: '3px solid #fff', opacity: 0.35 }}/>
          {/* corner accents */}
          {['tl', 'tr', 'bl', 'br'].map((c, i) => {
            const styles = {
              tl: { top: -3, left: -3, borderTopLeftRadius: 32, borderTop: '4px solid var(--tamos-green)', borderLeft: '4px solid var(--tamos-green)' },
              tr: { top: -3, right: -3, borderTopRightRadius: 32, borderTop: '4px solid var(--tamos-green)', borderRight: '4px solid var(--tamos-green)' },
              bl: { bottom: -3, left: -3, borderBottomLeftRadius: 32, borderBottom: '4px solid var(--tamos-green)', borderLeft: '4px solid var(--tamos-green)' },
              br: { bottom: -3, right: -3, borderBottomRightRadius: 32, borderBottom: '4px solid var(--tamos-green)', borderRight: '4px solid var(--tamos-green)' },
            };
            return <div key={c} style={{ position: 'absolute', width: 48, height: 48, ...styles[c] }}/>;
          })}
          {/* scan line */}
          <div style={{ position: 'absolute', left: 8, right: 8, height: 3, background: 'var(--tamos-green)', borderRadius: 999, boxShadow: '0 0 24px var(--tamos-green)', animation: 'scanLine 2s ease-in-out infinite' }}/>
          <style>{`@keyframes scanLine { 0%, 100% { top: 0 } 50% { top: calc(100% - 3px) } }`}</style>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, padding: '0 20px', textAlign: 'center', zIndex: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Наведи на QR-код ученика</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>Чтобы отметить уход с урока</div>
        <button onClick={() => setScanned({ name: 'Бахыт А.', time: '11:01', subject: 'Чтение' })} style={{ marginTop: 18, padding: '12px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 14 }}>
          Отметить вручную
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER GRADE ENTRY
// ═══════════════════════════════════════════════════════════════════════════
function TeacherGradeEntry({ nav }) {
  const appState = useAppState();
  const [grades, setGrades] = React.useState({});
  const set = (name, g) => setGrades(p => ({ ...p, [name]: g }));
  const count = Object.keys(grades).length;
  return (
    <>
      <ScreenHeader title="Выставить оценки" back={() => nav.back()}/>
      <div style={{ padding: '0 16px 14px' }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Урок</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Чтение · 4 «Б»</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>26 мая · 10:20</div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 16px 140px' }}>
        {CLASS_ROSTER.slice(0, 8).map((s, i) => {
          const g = grades[s.name];
          return (
            <Card key={i} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={s.name} size={36} color={s.avatar}/>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{s.name}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[2, 3, 4, 5].map(n => {
                  const isOn = g === n;
                  return (
                    <button key={n} onClick={() => set(s.name, n)} style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: isOn ? (n >= 4 ? 'var(--tamos-green)' : n === 3 ? 'var(--tamos-gold-deep)' : 'var(--tamos-red)') : 'var(--bg-2)',
                      color: isOn ? '#fff' : 'var(--ink-2)',
                      fontWeight: 700, fontSize: 15,
                    }}>{n}</button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 38, left: 0, right: 0, padding: '0 16px', zIndex: 20 }}>
        <PrimaryButton color="green" disabled={count === 0} onClick={() => {
          appState.toast(`Сохранено · ${count} оценок`);
          setTimeout(() => nav.back(), 800);
        }}>{count === 0 ? 'Выставите оценки' : `Сохранить (${count})`}</PrimaryButton>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER AI TEST UPLOAD
// ═══════════════════════════════════════════════════════════════════════════
function TeacherAIUpload({ nav }) {
  const appState = useAppState();
  const [generating, setGenerating] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (done) {
    return (
      <>
        <ScreenHeader title="Тест готов" back={() => nav.back()}/>
        <div style={{ padding: '0 16px', textAlign: 'center' }}>
          <div style={{ margin: '24px auto 0', width: 110, height: 110, position: 'relative' }}>
            <Hex size={110} fill="var(--tamos-green)"/>
            <Icon name="check" size={50} color="#fff" strokeWidth={3} style={{ position: 'absolute', inset: 30 }}/>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 18, letterSpacing: -0.4 }}>5 вопросов готово</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>AI создал тест по материалам урока. Ученики увидят его сегодня.</p>
        </div>
        <Card style={{ margin: '24px 16px 0', padding: 16, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Превью</div>
          {AI_QUESTIONS.slice(0, 3).map((q, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--blue-soft)', color: 'var(--tamos-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{q.q}</div>
            </div>
          ))}
        </Card>
        <div style={{ padding: '24px 16px 100px', display: 'flex', gap: 8 }}>
          <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onClick={() => { setDone(false); }}>Изменить</PrimaryButton>
          <PrimaryButton color="green" full={false} style={{ flex: 1 }} onClick={() => { appState.toast('Тест отправлен классу'); nav.back(); }}>Отправить классу</PrimaryButton>
        </div>
      </>
    );
  }

  if (generating) {
    return (
      <>
        <ScreenHeader title="AI-тест" back={() => setGenerating(false)}/>
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ margin: '0 auto', width: 110, height: 110, position: 'relative' }}>
            <Hex size={110} fill="var(--tamos-red)" style={{ animation: 'spin 2s linear infinite' }}/>
            <Icon name="sparkle" size={48} color="#fff" style={{ position: 'absolute', inset: 31 }}/>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 20 }}>AI читает материалы…</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>Создаём 5 вопросов на основе сказки</p>
          <div style={{ marginTop: 28, height: 6, borderRadius: 999, background: 'var(--bg-2)', overflow: 'hidden', maxWidth: 240, margin: '28px auto 0' }}>
            <div style={{ width: '60%', height: '100%', background: 'var(--tamos-red)', animation: 'progress 2s ease-in-out forwards' }}/>
            <style>{`@keyframes progress { from { width: 5% } to { width: 100% } }`}</style>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="AI-тест" back={() => nav.back()}/>
      <div style={{ margin: '0 16px 16px', borderRadius: 26, padding: 22, background: 'linear-gradient(135deg, #D63030 0%, #B12626 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <HexPattern color="rgba(255,255,255,0.10)" size={28}/>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 56, height: 56, position: 'relative' }}>
            <Hex size={56} fill="rgba(255,255,255,0.20)"/>
            <Icon name="sparkle" size={28} color="#fff" style={{ position: 'absolute', inset: 14 }}/>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 14, letterSpacing: -0.4 }}>Сгенерировать тест</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Загрузите материалы — AI создаст тест</div>
        </div>
      </div>

      <SectionTitle title="Материалы урока"/>
      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green-soft)', color: 'var(--tamos-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="book" size={20}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Сказка «Алдар-Косе»</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>chteniye_4b_2.pdf · 1.2 МБ</div>
          </div>
          <Pill color="green"><Icon name="check" size={11}/></Pill>
        </div>
      </Card>
      <Card style={{ margin: '0 16px 12px', padding: 18, border: '2px dashed var(--border-strong)', cursor: 'pointer' }} onClick={() => appState.toast('Открываем файлы…')}>
        <div style={{ textAlign: 'center', padding: 8 }}>
          <Icon name="upload" size={28} color="var(--ink-3)"/>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Загрузить ещё материал</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>PDF, DOCX, изображения</div>
        </div>
      </Card>

      <SectionTitle title="Параметры теста"/>
      <Card style={{ margin: '0 16px 12px', padding: 0 }}>
        <ProfileRow icon="grid" title="Тип" value="С выбором ответа"/>
        <ProfileRow icon="target" title="Вопросов" value="5"/>
        <ProfileRow icon="clock" title="Время" value="5 мин"/>
        <ProfileRow icon="user" title="Класс" value="4 «Б»" last/>
      </Card>

      <div style={{ padding: '8px 16px 100px' }}>
        <PrimaryButton color="red" onClick={() => {
          setGenerating(true);
          setTimeout(() => { setGenerating(false); setDone(true); }, 2200);
        }}><Icon name="sparkle" size={18} color="#fff"/> Сгенерировать тест</PrimaryButton>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER FEEDBACK WRITING
// ═══════════════════════════════════════════════════════════════════════════
function TeacherFeedbackWrite({ nav }) {
  const [picked, setPicked] = React.useState(0);
  const student = CLASS_ROSTER[picked];
  const appState = useAppState();
  const [rating, setRating] = React.useState(5);
  const [strengths, setStrengths] = React.useState({ 'Активно работает': true, 'Помогает другим': true, 'Прогресс в чтении': true });

  return (
    <>
      <ScreenHeader title="Фидбек · Май" back={() => nav.back()}/>

      {/* Student picker */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, overflowX: 'auto' }} className="tamos-scroll">
        {CLASS_ROSTER.slice(0, 6).map((s, i) => {
          const isOn = i === picked;
          return (
            <button key={i} onClick={() => setPicked(i)} style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: 8, borderRadius: 16,
              background: isOn ? 'var(--green-soft)' : 'transparent',
              border: `1px solid ${isOn ? 'var(--tamos-green)' : 'transparent'}`,
            }}>
              <Avatar name={s.name} size={40} color={s.avatar}/>
              <span style={{ fontSize: 11, fontWeight: 600, color: isOn ? 'var(--tamos-green)' : 'var(--ink-3)' }}>{s.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={student.name} size={48} color={student.avatar}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{student.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>4 «Б» · посещаемость 96%</div>
          </div>
        </div>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Общая оценка</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <button key={i} onClick={() => setRating(i)} style={{ flex: 1, padding: 12, borderRadius: 14, background: i <= rating ? 'var(--gold-soft)' : 'var(--bg-2)' }}>
              <Icon name="star" size={22} color={i <= rating ? 'var(--tamos-gold)' : 'var(--ink-3)'}/>
            </button>
          ))}
        </div>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tamos-green)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Что радует</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {['Активно работает', 'Помогает другим', 'Прогресс в чтении', 'Точность', 'Любознательность', 'Лидерство'].map((s, i) => {
            const isOn = strengths[s];
            return (
              <button key={i} onClick={() => setStrengths(p => ({ ...p, [s]: !p[s] }))} style={{
                padding: '8px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: isOn ? 'var(--green-soft)' : 'var(--surface-2)',
                color: isOn ? 'var(--tamos-green)' : 'var(--ink-2)',
                border: `1px solid ${isOn ? 'var(--tamos-green)' : 'var(--border)'}`,
              }}>
                {isOn && <Icon name="check" size={11}/>} {s}
              </button>
            );
          })}
        </div>
      </Card>

      <Card style={{ margin: '0 16px 12px', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Комментарий</div>
          <Pill color="blue"><Icon name="sparkle" size={11}/> AI-черновик</Pill>
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink)', marginTop: 12, lineHeight: 1.6 }}>
          Айкоркем показала отличные результаты в этом месяце. Особенно радует прогресс в чтении — стала читать с выражением...
        </p>
        <button style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: 'var(--tamos-green)' }} onClick={() => appState.toast('Редактор откроется')}>Редактировать →</button>
      </Card>

      <div style={{ padding: '8px 16px 100px', display: 'flex', gap: 8 }}>
        <PrimaryButton color="ghost" full={false} style={{ flex: 1 }} onClick={() => { appState.toast('Черновик сохранён'); }}>Сохранить</PrimaryButton>
        <PrimaryButton color="green" full={false} style={{ flex: 1 }} onClick={() => {
          appState.markFeedbackSent(student.name);
          appState.toast(`Отправлено · ${student.name}`);
          // Auto-advance to next student
          if (picked + 1 < Math.min(6, CLASS_ROSTER.length)) setTimeout(() => setPicked(picked + 1), 600);
        }}>Отправить родителям</PrimaryButton>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEACHER PROFILE
// ═══════════════════════════════════════════════════════════════════════════
function TeacherProfile({ nav, onSignOut }) {
  return (
    <>
      <div style={{ padding: '14px 16px 8px', textAlign: 'center' }}>
        <Avatar name={TEACHER.name} size={86} color="red"/>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 12, letterSpacing: -0.3 }}>{TEACHER.name}</h1>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>{TEACHER.subject}</div>
      </div>

      <SectionTitle title="Мои классы"/>
      <Card style={{ margin: '0 16px 12px', padding: 0 }}>
        {[
          { c: '4 «Б»', sub: 'Кл. руководитель · 24 ученика', color: 'green' },
          { c: '4 «А»', sub: 'Математика · 22 ученика', color: 'blue' },
          { c: '4 «В»', sub: 'Математика · 21 ученик', color: 'red' },
        ].map((cl, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', gap: 12 }}>
            <div style={{ width: 40, height: 40, position: 'relative' }}>
              <Hex size={40} fill={`var(--tamos-${cl.color})`}/>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{cl.c}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{cl.c}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{cl.sub}</div>
            </div>
            <Icon name="chevronRight" size={14} color="var(--ink-3)"/>
          </div>
        ))}
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
  TEACHER, CLASS_ROSTER,
  TeacherHome, TeacherClass, TeacherScanner, TeacherGradeEntry, TeacherAIUpload, TeacherFeedbackWrite, TeacherProfile,
});
