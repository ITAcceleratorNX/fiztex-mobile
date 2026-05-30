// Main Tamos app — entry point. Mounts the design canvas with the interactive
// prototype + screen overview.

const { useState, useEffect } = React;

// Tweakable defaults (persisted by host)
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "role": "student",
  "dark": false,
  "view": "prototype"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply dark mode to body BG
  useEffect(() => {
    document.body.style.background = t.dark ? '#0F0E0C' : '#F1EFE8';
  }, [t.dark]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TamosCanvasShell dark={t.dark} role={t.role}/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Роль (для прототипа)">
          <TweakRadio
            value={t.role}
            onChange={(v) => setTweak('role', v)}
            options={[
              { value: 'student', label: 'Ученик' },
              { value: 'parent',  label: 'Родитель' },
              { value: 'teacher', label: 'Учитель' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Тема">
          <TweakToggle
            label="Тёмная тема"
            value={t.dark}
            onChange={(v) => setTweak('dark', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Wraps the canvas — first section is the live prototype, subsequent sections
// show screen snapshots. Re-renders cleanly when role/dark change.
function TamosCanvasShell({ dark, role }) {
  // Force-remount the prototype if role or dark changes (so internal stack resets to home in new role)
  const protoKey = `${role}-${dark}`;
  return (
    <DesignCanvas>
      <DCSection id="prototype" title="Интерактивный прототип" subtitle="Кликайте по экрану — навигация работает. Переключите роль в Tweaks (правый нижний угол).">
        <DCArtboard id="proto" label={`Прототип · ${role === 'student' ? 'Ученик' : role === 'parent' ? 'Родитель' : 'Учитель'}`} width={402} height={874}>
          <TamosPrototype key={protoKey} role={role} dark={dark}/>
        </DCArtboard>
      </DCSection>
      {/* The rest of the canvas — pulled in from canvas.jsx */}
      <TamosCanvasInner dark={dark}/>
    </DesignCanvas>
  );
}

// Inner canvas content — extracted from TamosCanvas so we can share the outer DesignCanvas
function TamosCanvasInner({ dark }) {
  return (
    <>
      <DCSection id="auth" title="Вход и роли" subtitle="Запуск приложения, авторизация и выбор роли">
        <DCArtboard id="auth-welcome" label="01 · Welcome" width={402} height={874}>
          <TamosPhone dark={dark}><AuthWelcome onContinue={() => {}}/></TamosPhone>
        </DCArtboard>
        <DCArtboard id="auth-signin" label="02 · Способ входа" width={402} height={874}>
          <TamosPhone dark={dark}><AuthSignIn onBack={() => {}} onRole={() => {}}/></TamosPhone>
        </DCArtboard>
        <DCArtboard id="auth-face" label="03 · Face ID" width={402} height={874}>
          <TamosPhone dark={dark}><AuthFaceID/></TamosPhone>
        </DCArtboard>
        <DCArtboard id="auth-role" label="04 · Выбор роли" width={402} height={874}>
          <TamosPhone dark={dark}><AuthRolePicker onBack={() => {}} onPick={() => {}}/></TamosPhone>
        </DCArtboard>
      </DCSection>

      <DCSection id="student" title="Ученик" subtitle="Главный пользователь — 6-10 лет · 4 таба (Главная, Heroes, Учёба, Я)">
        <DCArtboard id="s-home" label="Главная · хаб" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="home"><StudentHome nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-schedule" label="Расписание дня" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentSchedule nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-lesson" label="Урок · детали + ДЗ" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentLesson nav={NOOP_NAV} payload={TODAY_SCHEDULE[2]}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-checkout" label="QR ухода с урока" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentCheckoutQR nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-diary" label="Дневник" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentDiary nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-subject" label="Предмет · оценки" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentSubject nav={NOOP_NAV} payload={SUBJECTS_DIARY[0]}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-events" label="Ивенты" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentEvents nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-map" label="Карта школы" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentMap nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-clubs" label="Кружки · каталог" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentClubs nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-club" label="Кружок · запись" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentClub nav={NOOP_NAV} payload={CLUBS[1]}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-heroes" label="Heroes · таб" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="heroes"><StudentHeroes nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-test" label="Учёба · ДЗ + тесты" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="test"><StudentTest nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-ai-intro" label="AI-тест · старт" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentAITest nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-profile" label="Профиль" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="profile"><StudentProfile nav={NOOP_NAV} onSignOut={() => {}}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-achievements" label="Профиль → Ачивки" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentAchievements nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="s-shop" label="Магазин · валюта" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs><StudentShop nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
      </DCSection>

      <DCSection id="parent" title="Родитель" subtitle="Контроль и связь со школой">
        <DCArtboard id="p-home" label="Главная" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="home" role="parent"><ParentHome nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-attendance" label="Журнал посещений" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="attendance" role="parent"><ParentAttendance nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-grades" label="Дневник ребёнка" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="grades" role="parent"><ParentGrades nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-feedback" label="Monthly feedback" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="parent"><ParentFeedback nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-service" label="Сервис · клининг" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="parent"><ParentService nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="p-profile" label="Профиль" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="profile" role="parent"><ParentProfile nav={NOOP_NAV} onSignOut={() => {}}/></SnapshotPhone>
        </DCArtboard>
      </DCSection>

      <DCSection id="teacher" title="Учитель" subtitle="Управление классом, оценки, AI-инструменты">
        <DCArtboard id="t-home" label="Сегодня" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="home" role="teacher"><TeacherHome nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-class" label="Класс · посещаемость" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="class" role="teacher"><TeacherClass nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-scanner" label="QR-сканер" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="teacher"><TeacherScanner nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-grade-entry" label="Выставление оценок" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="teacher"><TeacherGradeEntry nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-ai" label="AI · загрузка материала" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="teacher"><TeacherAIUpload nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-feedback" label="Написать фидбек" width={402} height={874}>
          <SnapshotPhone dark={dark} hideTabs role="teacher"><TeacherFeedbackWrite nav={NOOP_NAV}/></SnapshotPhone>
        </DCArtboard>
        <DCArtboard id="t-profile" label="Профиль" width={402} height={874}>
          <SnapshotPhone dark={dark} activeTab="profile" role="teacher"><TeacherProfile nav={NOOP_NAV} onSignOut={() => {}}/></SnapshotPhone>
        </DCArtboard>
      </DCSection>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
