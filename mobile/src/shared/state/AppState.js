import React, { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { View, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { Txt } from '../components/Txt';
import { useTheme } from '../theme/ThemeContext';
import { CODES } from '../theme/tokens';

// Shared prototype state — homework done, club enrolment, event RSVPs, currency,
// AI test progress, notifications, toast. Port of web `app-state.jsx`.
const AppCtx = createContext(null);

export function useAppState() {
  const ctx = useContext(AppCtx);
  return (
    ctx || {
      homework: {},
      toggleHomework: () => {},
      clubs: {},
      toggleClub: () => {},
      events: {},
      toggleEvent: () => {},
      grades: {},
      setGrade: () => {},
      feedbackSent: {},
      markFeedbackSent: () => {},
      stars: 248,
      coins: 64,
      addStars: () => {},
      addCoins: () => {},
      aiAnswers: {},
      setAiAnswer: () => {},
      toast: () => {},
      notice: () => {},
      notifications: 3,
      clearNotifications: () => {},
    }
  );
}

export function PhysTechAppStateProvider({ children }) {
  const [homework, setHW] = useState({});
  const [clubs, setClubs] = useState({ 'Робототехника LEGO': true, 'Юный исследователь': true });
  const [events, setEvents] = useState({ 'Открытый урок: робототехника': true, 'Спортивный день': true });
  const [grades, setGrades] = useState({});
  const [feedbackSent, setFS] = useState({});
  const [stars, setStars] = useState(248);
  const [coins, setCoins] = useState(64);
  const [aiAnswers, setAi] = useState({});
  const [notifications, setNotifs] = useState(3);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);
  const [noticeMsg, setNoticeMsg] = useState(null);
  const noticeTimer = useRef(null);

  const api = useMemo(
    () => ({
      homework,
      toggleHomework: (k) => setHW((p) => ({ ...p, [k]: !p[k] })),
      clubs,
      toggleClub: (name) => setClubs((p) => ({ ...p, [name]: !p[name] })),
      events,
      toggleEvent: (name) => setEvents((p) => ({ ...p, [name]: !p[name] })),
      grades,
      setGrade: (k, g) => setGrades((p) => ({ ...p, [k]: g })),
      feedbackSent,
      markFeedbackSent: (k) => setFS((p) => ({ ...p, [k]: true })),
      stars,
      coins,
      addStars: (n) => setStars((s) => s + n),
      addCoins: (n) => setCoins((s) => Math.max(0, s + n)),
      aiAnswers,
      setAiAnswer: (q, a) => setAi((p) => ({ ...p, [q]: a })),
      notifications,
      clearNotifications: () => setNotifs(0),
      toast: (msg) => {
        setToastMsg(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMsg(null), 1600);
      },
      // Карточка-уведомление сверху (2460:4371 «Код скопирован»): заголовок, пояснение, крестик.
      // Отдельно от `toast`: та — короткая плашка внизу, эта говорит, что делать дальше.
      notice: ({ title, text }) => {
        setNoticeMsg({ title, text, at: Date.now() });
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNoticeMsg(null), 3000);
      },
    }),
    [homework, clubs, events, grades, feedbackSent, stars, coins, aiAnswers, notifications]
  );

  return (
    <AppCtx.Provider value={api}>
      {children}
      {toastMsg ? <AppToast msg={toastMsg} /> : null}
      {noticeMsg ? (
        <AppNotice
          key={noticeMsg.at}
          title={noticeMsg.title}
          text={noticeMsg.text}
          onClose={() => {
            if (noticeTimer.current) clearTimeout(noticeTimer.current);
            setNoticeMsg(null);
          }}
        />
      ) : null}
    </AppCtx.Provider>
  );
}

function AppToast({ msg }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [msg]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 110,
        left: 0,
        right: 0,
        alignItems: 'center',
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(20,17,13,0.92)',
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 999,
        }}
      >
        <Icon name="check" size={14} color="#A3E5A8" strokeWidth={2.4} />
        <Txt style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{msg}</Txt>
      </View>
    </Animated.View>
  );
}

function AppNotice({ title, text, onClose }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [anim]);
  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: insets.top + 5,
        left: 16,
        right: 16,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderRadius: CODES.noticeRadius,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          shadowColor: '#1B2333',
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }}
      >
        <View style={{ width: CODES.noticeIcon, height: CODES.noticeIcon, borderRadius: 999, backgroundColor: c.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={20} color={c.success} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Txt style={{ fontSize: 16, fontWeight: '700' }}>{title}</Txt>
          {text ? <Txt style={{ fontSize: 14, color: c.ink2 }}>{text}</Txt> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть уведомление"
          hitSlop={8}
          onPress={onClose}
          style={{ width: CODES.noticeClose, height: CODES.noticeClose, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="x" size={12} color={c.ink2} strokeWidth={2.4} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

