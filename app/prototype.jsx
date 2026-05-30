// Prototype shell — owns role state, screen stack, dark mode. Renders the
// active screen inside a TamosPhone with appropriate tabs.

function TamosApp({ role, dark, onSignOut, initial }) {
  return (
    <TamosAppStateProvider>
      <TamosAppInner role={role} dark={dark} onSignOut={onSignOut} initial={initial}/>
    </TamosAppStateProvider>
  );
}

function TamosAppInner({ role, dark, onSignOut, initial }) {
  // Stack-based navigation: [{ screen: string, payload?: any }, ...]
  const [stack, setStack] = React.useState([{ screen: initial || 'home' }]);
  const top = stack[stack.length - 1];

  // nav function passed to screens
  const nav = React.useCallback(function nav(screen, payload) {
    setStack(s => [...s, { screen, payload }]);
  }, []);
  nav.back = React.useCallback(() => {
    setStack(s => s.length > 1 ? s.slice(0, -1) : s);
  }, []);
  nav.reset = React.useCallback((screen) => {
    setStack([{ screen }]);
  }, []);

  // Reset stack when role changes
  const roleRef = React.useRef(role);
  React.useEffect(() => {
    if (roleRef.current !== role) {
      roleRef.current = role;
      setStack([{ screen: 'home' }]);
    }
  }, [role]);

  // Bottom tabs per role
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
  const tabs = tabsByRole[role] || tabsByRole.student;
  // Tabs hide on these "modal-like" screens
  const tabHiddenScreens = new Set([
    'lesson', 'checkout', 'subject', 'club', 'aitest', 'shop', 'scanner',
    'feedback', 'feedback-write', 'ai-upload', 'grade-entry', 'service',
    // Student sub-screens (accessed from Home hub, not via tabs)
    'schedule', 'diary', 'clubs', 'events', 'map', 'achievements',
  ]);
  const showTabs = !tabHiddenScreens.has(top.screen);
  const activeTab = tabs.find(t => t.id === top.screen)?.id || null;

  // Screen renderer
  const screen = renderScreen(role, top, nav, onSignOut);

  return (
    <>
      {screen}
      {showTabs && <BottomTabs items={tabs} active={activeTab} onChange={(id) => nav.reset(id)} dark={dark}/>}
    </>
  );
}

function renderScreen(role, { screen, payload }, nav, onSignOut) {
  if (role === 'student') {
    switch (screen) {
      case 'home':         return <StudentHome nav={nav}/>;
      case 'schedule':     return <StudentSchedule nav={nav}/>;
      case 'lesson':       return <StudentLesson nav={nav} payload={payload}/>;
      case 'checkout':     return <StudentCheckoutQR nav={nav}/>;
      case 'diary':        return <StudentDiary nav={nav}/>;
      case 'subject':      return <StudentSubject nav={nav} payload={payload}/>;
      case 'clubs':        return <StudentClubs nav={nav}/>;
      case 'club':         return <StudentClub nav={nav} payload={payload}/>;
      case 'test':         return <StudentTest nav={nav}/>;
      case 'aitest':       return <StudentAITest nav={nav}/>;
      case 'events':       return <StudentEvents nav={nav}/>;
      case 'achievements': return <StudentAchievements nav={nav}/>;
      case 'heroes':       return <StudentHeroes nav={nav}/>;
      case 'map':          return <StudentMap nav={nav}/>;
      case 'shop':         return <StudentShop nav={nav}/>;
      case 'profile':      return <StudentProfile nav={nav} onSignOut={onSignOut}/>;
      default:             return <StudentHome nav={nav}/>;
    }
  }
  if (role === 'parent') {
    switch (screen) {
      case 'home':       return <ParentHome nav={nav}/>;
      case 'attendance': return <ParentAttendance nav={nav}/>;
      case 'grades':     return <ParentGrades nav={nav}/>;
      case 'subject':    return <StudentSubject nav={nav} payload={payload}/>;
      case 'schedule':   return <StudentSchedule nav={nav}/>;
      case 'lesson':     return <StudentLesson nav={nav} payload={payload}/>;
      case 'clubs':      return <StudentClubs nav={nav}/>;
      case 'club':       return <StudentClub nav={nav} payload={payload}/>;
      case 'events':     return <StudentEvents nav={nav}/>;
      case 'feedback':   return <ParentFeedback nav={nav}/>;
      case 'service':    return <ParentService nav={nav}/>;
      case 'profile':    return <ParentProfile nav={nav} onSignOut={onSignOut}/>;
      default:           return <ParentHome nav={nav}/>;
    }
  }
  // teacher
  switch (screen) {
    case 'home':            return <TeacherHome nav={nav}/>;
    case 'class':           return <TeacherClass nav={nav}/>;
    case 'scanner':         return <TeacherScanner nav={nav}/>;
    case 'grade-entry':     return <TeacherGradeEntry nav={nav}/>;
    case 'ai-upload':       return <TeacherAIUpload nav={nav}/>;
    case 'feedback-write':  return <TeacherFeedbackWrite nav={nav}/>;
    case 'profile':         return <TeacherProfile nav={nav} onSignOut={onSignOut}/>;
    default:                return <TeacherHome nav={nav}/>;
  }
}

// ─── Top-level prototype: wraps in TamosPhone + handles auth flow ────────
function TamosPrototype({ role, dark }) {
  // We render either the auth flow or the app; can sign out to return to auth.
  // `stage`: 'auth' | 'app'
  const [stage, setStage] = React.useState('app');
  const [authStep, setAuthStep] = React.useState('welcome'); // welcome | signin | face | role
  const [activeRole, setActiveRole] = React.useState(role || 'student');

  // Sync external role tweak with internal state
  React.useEffect(() => {
    if (role && role !== activeRole) setActiveRole(role);
  }, [role]);

  const goAuth = () => { setStage('auth'); setAuthStep('welcome'); };

  return (
    <TamosPhone dark={dark}>
      {stage === 'auth' ? (
        authStep === 'welcome' ? (
          <AuthWelcome onContinue={() => setAuthStep('signin')}/>
        ) : authStep === 'signin' ? (
          <AuthSignIn onBack={() => setAuthStep('welcome')} onRole={() => setAuthStep('face')}/>
        ) : authStep === 'face' ? (
          <AuthFaceID onBack={() => setAuthStep('signin')} onSuccess={() => setAuthStep('role')}/>
        ) : (
          <AuthRolePicker onBack={() => setAuthStep('signin')} onPick={(r) => { setActiveRole(r); setStage('app'); }}/>
        )
      ) : (
        <TamosApp role={activeRole} dark={dark} onSignOut={goAuth}/>
      )}
    </TamosPhone>
  );
}

Object.assign(window, { TamosApp, TamosPrototype });
