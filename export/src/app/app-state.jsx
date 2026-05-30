// Shared app state for the live prototype — homework done, club enrollment,
// event RSVPs, currency, AI test progress, etc. Held by TamosApp, exposed
// through TamosAppCtx so any screen can read/mutate.

const TamosAppCtx = React.createContext(null);

function useAppState() {
  const ctx = React.useContext(TamosAppCtx);
  // Fallback for screens rendered outside the prototype shell (canvas
  // snapshots) — returns no-op stubs so call sites don't have to null-guard.
  return ctx || {
    homework: {}, toggleHomework: () => {},
    clubs: {}, toggleClub: () => {},
    events: {}, toggleEvent: () => {},
    grades: {}, setGrade: () => {},
    feedbackSent: {}, markFeedbackSent: () => {},
    stars: 248, coins: 64, addStars: () => {}, addCoins: () => {},
    aiAnswers: {}, setAiAnswer: () => {},
    toast: () => {},
    notifications: 3, clearNotifications: () => {},
  };
}

function TamosAppStateProvider({ children }) {
  const [homework, setHW] = React.useState({}); // { lessonKey: true }
  const [clubs, setClubs] = React.useState({ 'Робототехника LEGO': true, 'Юный исследователь': true });
  const [events, setEvents] = React.useState({ 'Открытый урок: робототехника': true, 'Спортивный день': true });
  const [grades, setGrades] = React.useState({});
  const [feedbackSent, setFS] = React.useState({});
  const [stars, setStars] = React.useState(248);
  const [coins, setCoins] = React.useState(64);
  const [aiAnswers, setAi] = React.useState({});
  const [notifications, setNotifs] = React.useState(3);
  const [toastMsg, setToastMsg] = React.useState(null);

  const api = React.useMemo(() => ({
    homework,
    toggleHomework: (k) => setHW(p => ({ ...p, [k]: !p[k] })),
    clubs,
    toggleClub: (name) => setClubs(p => ({ ...p, [name]: !p[name] })),
    events,
    toggleEvent: (name) => setEvents(p => ({ ...p, [name]: !p[name] })),
    grades,
    setGrade: (k, g) => setGrades(p => ({ ...p, [k]: g })),
    feedbackSent,
    markFeedbackSent: (k) => setFS(p => ({ ...p, [k]: true })),
    stars, coins,
    addStars: (n) => setStars(s => s + n),
    addCoins: (n) => setCoins(s => Math.max(0, s + n)),
    aiAnswers,
    setAiAnswer: (q, a) => setAi(p => ({ ...p, [q]: a })),
    notifications,
    clearNotifications: () => setNotifs(0),
    toast: (msg) => {
      setToastMsg(msg);
      clearTimeout(api._toastT);
      api._toastT = setTimeout(() => setToastMsg(null), 1600);
    },
    _toastT: null,
  }), [homework, clubs, events, grades, feedbackSent, stars, coins, aiAnswers, notifications]);

  return (
    <TamosAppCtx.Provider value={api}>
      {children}
      {toastMsg && <AppToast msg={toastMsg}/>}
    </TamosAppCtx.Provider>
  );
}

// Tiny toast that floats at the bottom of the phone (above tab bar)
function AppToast({ msg }) {
  return (
    <div style={{
      position: 'absolute', bottom: 110, left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20,17,13,0.92)', color: '#fff',
      padding: '12px 18px', borderRadius: 999,
      fontSize: 13, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      zIndex: 300, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'toastIn 0.2s ease-out',
      whiteSpace: 'nowrap',
    }}>
      <Icon name="check" size={14} color="#A3E5A8" strokeWidth={2.4}/>
      {msg}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px) } to { opacity: 1; transform: translate(-50%, 0) } }`}</style>
    </div>
  );
}

Object.assign(window, { TamosAppCtx, useAppState, TamosAppStateProvider });
