// Canvas overview — Design canvas with all screens organized by role + flow.
// Each artboard renders one screen state inside a TamosPhone.

// A "static phone" — locks scroll so the artboard is a clean snapshot, but
// the bottom tabs render correctly.
function SnapshotPhone({ children, dark = false, hideTabs = false, activeTab, role = 'student' }) {
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
    <TamosPhone dark={dark} scroll={true}>
      {children}
      {!hideTabs && <BottomTabs items={tabs} active={activeTab} onChange={() => {}} dark={dark}/>}
    </TamosPhone>
  );
}

// A no-op nav used for static snapshots (clicks do nothing).
const NOOP_NAV = Object.assign(() => {}, { back: () => {}, reset: () => {} });

function TamosCanvas({ dark = false }) {
  return (
    <DesignCanvas>
      {/* AUTH FLOW */}
      <DCSection id="auth" title="Вход и роли" subtitle="Запуск приложения, авторизация и выбор роли">
        <DCArtboard id="auth-welcome" label="01 · Welcome" width={402} height={874}>
          <TamosPhone dark={dark}>
            <AuthWelcome onContinue={() => {}}/>
          </TamosPhone>
        </DCArtboard>
        <DCArtboard id="auth-signin" label="02 · Способ входа" width={402} height={874}>
          <TamosPhone dark={dark}>
            <AuthSignIn onBack={() => {}} onRole={() => {}}/>
          </TamosPhone>
        </DCArtboard>
        <DCArtboard id="auth-face" label="03 · Face ID" width={402} height={874}>
          <TamosPhone dark={dark}>
            <AuthFaceID/>
          </TamosPhone>
        </DCArtboard>
        <DCArtboard id="auth-role" label="04 · Выбор роли" width={402} height={874}>
          <TamosPhone dark={dark}>
            <AuthRolePicker onBack={() => {}} onPick={() => {}}/>
          </TamosPhone>
        </DCArtboard>
      </DCSection>

      {/* STUDENT */}
      <DCSection id="student" title="Ученик" subtitle="Главный пользователь — 6-10 лет">
        <DCArtboard id="s-home" label="Главная" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="home">
            <StudentHome nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-schedule" label="Расписание дня" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="schedule">
            <StudentSchedule nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-lesson" label="Урок · детали + ДЗ" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentLesson nav={NOOP_NAV} payload={TODAY_SCHEDULE[2]}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-checkout" label="QR ухода с урока" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentCheckoutQR nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-diary" label="Дневник" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="diary">
            <StudentDiary nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-subject" label="Предмет · оценки" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentSubject nav={NOOP_NAV} payload={SUBJECTS_DIARY[0]}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-clubs" label="Кружки · каталог" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentClubs nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-club" label="Кружок · запись" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentClub nav={NOOP_NAV} payload={CLUBS[1]}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-ai-intro" label="AI-тест · старт" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentAITest nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-achievements" label="Ачивки и уровни" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="achievements">
            <StudentAchievements nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-heroes" label="Heroes · команда" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentHeroes nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-map" label="Карта школы" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentMap nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-events" label="Ивенты" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentEvents nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-shop" label="Магазин · валюта" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs>
            <StudentShop nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-profile" label="Профиль" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="profile">
            <StudentProfile nav={NOOP_NAV} onSignOut={() => {}}/>
          </SnapshotPhone>
        </DCArtboard>
      </DCSection>

      {/* PARENT */}
      <DCSection id="parent" title="Родитель" subtitle="Контроль и связь со школой">
        <DCArtboard id="p-home" label="Главная" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="home" role="parent">
            <ParentHome nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-attendance" label="Журнал посещений" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="attendance" role="parent">
            <ParentAttendance nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-grades" label="Дневник ребёнка" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="grades" role="parent">
            <ParentGrades nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-feedback" label="Monthly feedback" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="parent">
            <ParentFeedback nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-service" label="Сервис · клининг" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="parent">
            <ParentService nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-profile" label="Профиль" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="profile" role="parent">
            <ParentProfile nav={NOOP_NAV} onSignOut={() => {}}/>
          </SnapshotPhone>
        </DCArtboard>
      </DCSection>

      {/* TEACHER */}
      <DCSection id="teacher" title="Учитель" subtitle="Управление классом, оценки, AI-инструменты">
        <DCArtboard id="t-home" label="Сегодня" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="home" role="teacher">
            <TeacherHome nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-class" label="Класс · посещаемость" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="class" role="teacher">
            <TeacherClass nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-scanner" label="QR-сканер" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="teacher">
            <TeacherScanner nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-grade-entry" label="Выставление оценок" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="teacher">
            <TeacherGradeEntry nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-ai" label="AI · загрузка материала" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="teacher">
            <TeacherAIUpload nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-feedback" label="Написать фидбек" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="teacher">
            <TeacherFeedbackWrite nav={NOOP_NAV}/>
          </SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-profile" label="Профиль" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="profile" role="teacher">
            <TeacherProfile nav={NOOP_NAV} onSignOut={() => {}}/>
          </SnapshotPhone>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

Object.assign(window, { TamosCanvas, SnapshotPhone, NOOP_NAV });
