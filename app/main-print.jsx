// Print entry — renders all screens as a static paged document.
// Each page = phone + label. Grouped by section.

const { useEffect: useEffectP } = React;

// No-op nav (clicks do nothing in print)
const NOOP_NAV = Object.assign(() => {}, { back: () => {}, reset: () => {} });

const PRINT_SECTIONS = [
  {
    title: 'Вход и роли',
    artboards: [
      { id: 'a1', label: '01 · Welcome',         render: (d) => <TamosPhone dark={d}><AuthWelcome onContinue={() => {}}/></TamosPhone> },
      { id: 'a2', label: '02 · Способ входа',    render: (d) => <TamosPhone dark={d}><AuthSignIn onBack={() => {}} onRole={() => {}}/></TamosPhone> },
      { id: 'a3', label: '03 · Face ID',         render: (d) => <TamosPhone dark={d}><AuthFaceID/></TamosPhone> },
      { id: 'a4', label: '04 · Выбор роли',      render: (d) => <TamosPhone dark={d}><AuthRolePicker onBack={() => {}} onPick={() => {}}/></TamosPhone> },
    ],
  },
  {
    title: 'Ученик',
    artboards: [
      { id: 's1',  label: 'Главная · хаб',         render: (d) => <PrintPhone dark={d} activeTab="home" role="student"><StudentHome nav={NOOP_NAV}/></PrintPhone> },
      { id: 's2',  label: 'Расписание дня',        render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentSchedule nav={NOOP_NAV}/></PrintPhone> },
      { id: 's3',  label: 'Урок · детали + ДЗ',    render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentLesson nav={NOOP_NAV} payload={TODAY_SCHEDULE[2]}/></PrintPhone> },
      { id: 's4',  label: 'QR ухода с урока',      render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentCheckoutQR nav={NOOP_NAV}/></PrintPhone> },
      { id: 's5',  label: 'Дневник',               render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentDiary nav={NOOP_NAV}/></PrintPhone> },
      { id: 's6',  label: 'Предмет · оценки',      render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentSubject nav={NOOP_NAV} payload={SUBJECTS_DIARY[0]}/></PrintPhone> },
      { id: 's7',  label: 'Ивенты',                render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentEvents nav={NOOP_NAV}/></PrintPhone> },
      { id: 's8',  label: 'Карта школы',           render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentMap nav={NOOP_NAV}/></PrintPhone> },
      { id: 's9',  label: 'Кружки · каталог',      render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentClubs nav={NOOP_NAV}/></PrintPhone> },
      { id: 's10', label: 'Кружок · запись',       render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentClub nav={NOOP_NAV} payload={CLUBS[1]}/></PrintPhone> },
      { id: 's11', label: 'Heroes · команда',      render: (d) => <PrintPhone dark={d} activeTab="heroes" role="student"><StudentHeroes nav={NOOP_NAV}/></PrintPhone> },
      { id: 's12', label: 'Учёба · ДЗ + тесты',    render: (d) => <PrintPhone dark={d} activeTab="test" role="student"><StudentTest nav={NOOP_NAV}/></PrintPhone> },
      { id: 's13', label: 'AI-тест · старт',       render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentAITest nav={NOOP_NAV}/></PrintPhone> },
      { id: 's14', label: 'Профиль',               render: (d) => <PrintPhone dark={d} activeTab="profile" role="student"><StudentProfile nav={NOOP_NAV} onSignOut={() => {}}/></PrintPhone> },
      { id: 's15', label: 'Профиль → Ачивки',      render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentAchievements nav={NOOP_NAV}/></PrintPhone> },
      { id: 's16', label: 'Магазин · валюта',      render: (d) => <PrintPhone dark={d} hideTabs role="student"><StudentShop nav={NOOP_NAV}/></PrintPhone> },
    ],
  },
  {
    title: 'Родитель',
    artboards: [
      { id: 'p1', label: 'Главная',           render: (d) => <PrintPhone dark={d} activeTab="home" role="parent"><ParentHome nav={NOOP_NAV}/></PrintPhone> },
      { id: 'p2', label: 'Журнал посещений',  render: (d) => <PrintPhone dark={d} activeTab="attendance" role="parent"><ParentAttendance nav={NOOP_NAV}/></PrintPhone> },
      { id: 'p3', label: 'Дневник ребёнка',   render: (d) => <PrintPhone dark={d} activeTab="grades" role="parent"><ParentGrades nav={NOOP_NAV}/></PrintPhone> },
      { id: 'p4', label: 'Monthly feedback',  render: (d) => <PrintPhone dark={d} hideTabs role="parent"><ParentFeedback nav={NOOP_NAV}/></PrintPhone> },
      { id: 'p5', label: 'Сервис · клининг',  render: (d) => <PrintPhone dark={d} hideTabs role="parent"><ParentService nav={NOOP_NAV}/></PrintPhone> },
      { id: 'p6', label: 'Профиль',           render: (d) => <PrintPhone dark={d} activeTab="profile" role="parent"><ParentProfile nav={NOOP_NAV} onSignOut={() => {}}/></PrintPhone> },
    ],
  },
  {
    title: 'Учитель',
    artboards: [
      { id: 't1', label: 'Сегодня',                render: (d) => <PrintPhone dark={d} activeTab="home" role="teacher"><TeacherHome nav={NOOP_NAV}/></PrintPhone> },
      { id: 't2', label: 'Класс · посещаемость',   render: (d) => <PrintPhone dark={d} activeTab="class" role="teacher"><TeacherClass nav={NOOP_NAV}/></PrintPhone> },
      { id: 't3', label: 'QR-сканер',              render: (d) => <PrintPhone dark={d} hideTabs role="teacher"><TeacherScanner nav={NOOP_NAV}/></PrintPhone> },
      { id: 't4', label: 'Выставление оценок',     render: (d) => <PrintPhone dark={d} hideTabs role="teacher"><TeacherGradeEntry nav={NOOP_NAV}/></PrintPhone> },
      { id: 't5', label: 'AI · загрузка',          render: (d) => <PrintPhone dark={d} hideTabs role="teacher"><TeacherAIUpload nav={NOOP_NAV}/></PrintPhone> },
      { id: 't6', label: 'Написать фидбек',        render: (d) => <PrintPhone dark={d} hideTabs role="teacher"><TeacherFeedbackWrite nav={NOOP_NAV}/></PrintPhone> },
      { id: 't7', label: 'Профиль',                render: (d) => <PrintPhone dark={d} activeTab="profile" role="teacher"><TeacherProfile nav={NOOP_NAV} onSignOut={() => {}}/></PrintPhone> },
    ],
  },
];

// PrintPhone — like SnapshotPhone but always renders all tabs static
function PrintPhone({ children, dark = false, hideTabs = false, activeTab, role = 'student' }) {
  const tabsByRole = {
    student: [
      { id: 'home',    label: 'Главная', icon: 'home' },
      { id: 'heroes',  label: 'Heroes',  icon: 'heroes' },
      { id: 'test',    label: 'Учёба',   icon: 'sparkle' },
      { id: 'profile', label: 'Я',       icon: 'user' },
    ],
    parent: [
      { id: 'home',       label: 'Главная',    icon: 'home' },
      { id: 'attendance', label: 'Журнал',     icon: 'calendar' },
      { id: 'grades',     label: 'Дневник',    icon: 'book' },
      { id: 'service',    label: 'Сервис',     icon: 'clean' },
      { id: 'profile',    label: 'Я',          icon: 'user' },
    ],
    teacher: [
      { id: 'home',           label: 'Сегодня',    icon: 'home' },
      { id: 'class',          label: 'Класс',      icon: 'user' },
      { id: 'grade-entry',    label: 'Оценки',     icon: 'pencil' },
      { id: 'ai-upload',      label: 'AI-тест',    icon: 'sparkle' },
      { id: 'profile',        label: 'Я',          icon: 'user' },
    ],
  };
  const tabs = tabsByRole[role];
  return (
    <TamosPhone dark={dark} scroll={false}>
      {children}
      {!hideTabs && <BottomTabs items={tabs} active={activeTab} onChange={() => {}} dark={dark}/>}
    </TamosPhone>
  );
}

function PrintApp() {
  useEffectP(() => {
    document.body.style.background = '#fff';
  }, []);
  return (
    <div className="print-doc">
      {/* Cover */}
      <div className="page cover">
        <div className="cover-inner">
          <div className="cover-logo">
            <svg viewBox="0 0 200 200" width="120" height="120">
              <polygon points="100,18 175,60 175,140 100,182 25,140 25,60" fill="#2A8847"/>
              <polygon points="100,52 145,76 145,124 100,148 55,124 55,76" fill="#F2B73D"/>
              <text x="100" y="118" textAnchor="middle" fontFamily="Onest, system-ui, sans-serif" fontSize="60" fontWeight="800" fill="#2A8847">T</text>
            </svg>
          </div>
          <h1 className="cover-title">Tamos Education</h1>
          <div className="cover-sub">iOS-приложение · MVP</div>
          <div className="cover-meta">Май 2026 · Дизайн-обзор</div>
        </div>
        <div className="cover-foot">3 роли · {PRINT_SECTIONS.reduce((n, s) => n + s.artboards.length, 0)} экранов</div>
      </div>

      {PRINT_SECTIONS.map(sec => (
        <React.Fragment key={sec.title}>
          {/* Section divider */}
          <div className="page section-divider">
            <div className="section-divider-num">{String(PRINT_SECTIONS.indexOf(sec) + 1).padStart(2, '0')}</div>
            <h2 className="section-divider-title">{sec.title}</h2>
            <div className="section-divider-count">{sec.artboards.length} экран{sec.artboards.length === 1 ? '' : sec.artboards.length < 5 ? 'а' : 'ов'}</div>
          </div>

          {/* Pages: 2 phones per page */}
          {chunk(sec.artboards, 2).map((pair, i) => (
            <div key={i} className="page screen-page">
              <div className="page-header">
                <span className="page-header-title">{sec.title}</span>
                <span className="page-header-meta">Tamos Education · стр. {i + 1}/{chunk(sec.artboards, 2).length}</span>
              </div>
              <div className="phone-grid">
                {pair.map(ab => (
                  <div key={ab.id} className="phone-cell">
                    <div className="phone-frame">{ab.render(false)}</div>
                    <div className="phone-label">{ab.label}</div>
                  </div>
                ))}
                {pair.length === 1 && <div className="phone-cell phone-cell-empty"/>}
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const rootP = ReactDOM.createRoot(document.getElementById('root'));
rootP.render(<PrintApp/>);

// Auto-print once fonts + React render are settled.
(async () => {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
  await new Promise(r => setTimeout(r, 1200));
  window.print();
})();
