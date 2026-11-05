import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH, LAUNCH } from '@shared/theme/tokens';
import { PhysTechLogotype } from '@shared/components/Hex';
import { useAuth } from '@features/auth/AuthContext';
import { signInHero } from '@features/auth/signInHero';
import { DrawnLogotype, segment } from './DrawnLogotype';
import {
  INTRO, INTRO_DURATION, INTRO_EASING, LAUNCH_MODE, LOGO_VIEWBOX, PHI_SHIFT, STATIC, launchMode,
} from './launchModel';
import { readIntroSeen, rememberIntroSeen } from './launchStore';

/**
 * Занавес запуска: лежит поверх навигатора с первого кадра приложения и снимается сам.
 *
 * Пока неизвестно, первый ли это запуск и есть ли сессия, — пустой синий, как системный
 * сплэш под ним: знак, показанный заранее, при первом запуске пришлось бы стирать и рисовать
 * заново. Дальше одно из двух (`launchMode`):
 *
 * - первый запуск без сессии — анимация `INTRO`: знак рисуется, снизу выезжает лист, знак
 *   уезжает в шапку. Под занавесом в это время уже стоит настоящий M1, и в конце занавес просто
 *   гаснет — лист и знак совпадают с экраном точка в точку (`signInHero`);
 * - всё остальное — кадр «Повторный запуск»: знак по центру, `STATIC.hold`, и занавес гаснет.
 *
 * Отметка «первый запуск был» ставится, когда занавес снят в любом из режимов: вошедший
 * человек анимацию уже не увидит и после выхода.
 */
export function LaunchCurtain() {
  const { c } = useTheme();
  const { bootstrapping, token, isDemo } = useAuth();
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const [layout, setLayout] = useState(null);
  const [introSeen, setIntroSeen] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(null);
  const [done, setDone] = useState(false);
  const mode = useRef(null);
  const t = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;
    readIntroSeen().then((seen) => active && setIntroSeen(seen));
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => active && setReduceMotion(Boolean(on)))
      .catch(() => active && setReduceMotion(false));
    return () => {
      active = false;
    };
  }, []);

  const ready = introSeen !== null && reduceMotion !== null && !bootstrapping;
  // Режим решается один раз: вход посреди анимации не должен перескочить её на другой режим.
  if (ready && mode.current === null) {
    mode.current = launchMode({ introSeen, hasSession: Boolean(token) || isDemo, reduceMotion });
  }

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    let animation = null;
    const finish = ({ finished }) => {
      if (!finished || cancelled) return;
      rememberIntroSeen();
      setDone(true);
    };
    if (mode.current === LAUNCH_MODE.INTRO) {
      const start = () => {
        animation = Animated.timing(t, {
          toValue: INTRO_DURATION,
          duration: INTRO_DURATION,
          easing: Easing.linear,
          // Штрихи знака — свойства SVG, их ведёт только JS-драйвер.
          useNativeDriver: false,
        });
        animation.start(finish);
      };
      // Через два кадра: в первом под занавесом монтируется M1. Стартуй анимация сразу, её
      // первые кадры пропали бы, пока JS-поток занят экраном.
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(start);
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        animation?.stop();
      };
    }
    const timer = setTimeout(() => {
      animation = Animated.timing(fade, {
        toValue: 0,
        duration: STATIC.fade,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
      animation.start(finish);
    }, STATIC.hold);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [ready, t, fade]);

  const width = layout?.width ?? windowSize.width;
  const height = layout?.height ?? windowSize.height;
  const hero = signInHero(insets.top);
  const logoHeight = LAUNCH.logoHeight;
  const logoWidth = (logoHeight * LOGO_VIEWBOX.width) / LOGO_VIEWBOX.height;
  const intro = mode.current === LAUNCH_MODE.INTRO;

  const motion = useMemo(() => {
    const sheetTravel = height - hero.sheetTop;
    const move = segment(t, INTRO.move, INTRO_EASING.move);
    return {
      curtain: t.interpolate({ inputRange: INTRO.reveal, outputRange: [1, 0], extrapolate: 'clamp' }),
      sheet: segment(t, INTRO.sheet, INTRO_EASING.sheet).interpolate({
        inputRange: [0, 1],
        outputRange: [sheetTravel, 0],
      }),
      logo: [
        {
          translateX: segment(t, INTRO.shift, INTRO_EASING.shift).interpolate({
            inputRange: [0, 1],
            outputRange: [(PHI_SHIFT * logoHeight) / LOGO_VIEWBOX.height, 0],
          }),
        },
        { translateY: move.interpolate({ inputRange: [0, 1], outputRange: [0, hero.logoCenterY - height / 2] }) },
        { scale: move.interpolate({ inputRange: [0, 1], outputRange: [1, hero.logoHeight / logoHeight] }) },
      ],
    };
  }, [t, height, hero.sheetTop, hero.logoCenterY, hero.logoHeight, logoHeight]);

  if (done) return null;

  return (
    <Animated.View
      accessible
      accessibilityLabel="Физтех"
      onLayout={(e) => setLayout(e.nativeEvent.layout)}
      style={[StyleSheet.absoluteFill, { backgroundColor: c.heroBg, opacity: intro ? motion.curtain : fade }]}
    >
      <StatusBar style="light" />
      {intro ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: hero.sheetTop,
            height: height - hero.sheetTop,
            backgroundColor: c.bg,
            borderTopLeftRadius: AUTH.sheetRadius,
            borderTopRightRadius: AUTH.sheetRadius,
            transform: [{ translateY: motion.sheet }],
          }}
        />
      ) : null}
      {mode.current ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: (width - logoWidth) / 2,
            top: (height - logoHeight) / 2,
            width: logoWidth,
            height: logoHeight,
            transform: intro ? motion.logo : [],
          }}
        >
          {intro ? (
            <DrawnLogotype t={t} height={logoHeight} color={c.heroInk} />
          ) : (
            <PhysTechLogotype height={logoHeight} color={c.heroInk} />
          )}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
