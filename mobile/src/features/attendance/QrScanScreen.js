import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { FilledButton, OutlineButton } from '@shared/components/ui';
import { useAuth } from '@features/auth/AuthContext';
import { attendanceQrApi } from '@shared/api/attendanceQrApi';
import { SCAN_ACTION, scanErrorState, scanSuccessState } from '@shared/api/attendanceQrMap';

/**
 * Встроенный сканер ученика (ТЗ ATTENDANCE-QR-FE-002).
 *
 * <b>Главное в этом экране — замок сканирования.</b> `onBarcodeScanned` срабатывает
 * десятками раз в секунду, пока код в кадре, и без замка одно наведение камеры
 * превратилось бы в шквал одинаковых запросов. Поэтому сканирование живёт ровно до
 * первого попадания и возобновляется только явным действием ученика.
 *
 * <b>Фронт не решает, действителен ли код</b> (§5 ТЗ): он отдаёт payload как есть и
 * показывает то, что ответил бэкенд. Ни разбора токена, ни собственной проверки времени
 * урока здесь нет и быть не должно — правило живёт в одном месте, на сервере.
 */
export function QrScanScreen({ nav, navigation }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();

  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(null);
  // Токен последнего кода: при сетевой ошибке повторяем отправку им же, не заставляя
  // ученика снова ловить код камерой.
  const lastPayload = useRef(null);
  // Замок живёт в ref, а не в состоянии: между кадрами камеры перерисовки может не
  // случиться, и проверка по state пропустила бы второй кадр.
  const locked = useRef(false);

  // Результат обязан дойти и без глаз: `accessibilityLiveRegion` работает только на
  // Android, поэтому объявляем явно — на обеих платформах.
  useEffect(() => {
    if (state) AccessibilityInfo.announceForAccessibility(`${state.title}. ${state.subtitle}`);
  }, [state]);

  const goBack = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else nav?.('home');
  }, [nav, navigation]);

  const send = useCallback(
    async (payload) => {
      setBusy(true);
      try {
        const result = await attendanceQrApi.scan(token, payload);
        const next = scanSuccessState(result);
        setState(next);
        if (next.tone === 'success') {
          // Только на подтверждении: отклик на каждое касание превращается в шум.
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      } catch (error) {
        setState(scanErrorState(error));
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  const onScanned = useCallback(
    ({ data }) => {
      if (locked.current || !data) return;
      locked.current = true;
      lastPayload.current = data;
      send(data);
    },
    [send],
  );

  const onAction = useCallback(() => {
    const kind = state?.action?.kind;
    if (kind === SCAN_ACTION.RESEND && lastPayload.current) {
      setState(null);
      send(lastPayload.current);
      return;
    }
    if (kind === SCAN_ACTION.RESCAN) {
      setState(null);
      locked.current = false;
      return;
    }
    goBack();
  }, [goBack, send, state]);

  if (!permission) return <Backdrop insets={insets} onClose={goBack} />;

  if (!permission.granted) {
    return (
      <Backdrop insets={insets} onClose={goBack}>
        <PermissionBlock
          canAsk={permission.canAskAgain}
          onAsk={requestPermission}
          onOpenSettings={() => Linking.openSettings()}
        />
      </Backdrop>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Камера живёт только на видимом экране: чужая вкладка не должна держать её
          включённой ни ради батареи, ни ради приличий. */}
      {focused && (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          // Только QR: меньше типов — меньше работы на кадр и быстрее захват.
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={locked.current ? undefined : onScanned}
        />
      )}

      <Viewfinder busy={busy} />
      <CloseButton insets={insets} onPress={goBack} />

      {!state && !busy && (
        <View style={{ position: 'absolute', top: insets.top + 72, left: 24, right: 24, gap: 6 }}>
          <Txt style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' }}>
            Наведите камеру на QR-код
          </Txt>
          <Txt style={{ fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
            Код показывает учитель на экране
          </Txt>
        </View>
      )}

      {state && <ResultSheet state={state} insets={insets} onAction={onAction} />}
    </View>
  );
}

/** Тёмная подложка для состояний без камеры — разрешение ещё не выдано или отозвано. */
function Backdrop({ children, insets, onClose }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <CloseButton insets={insets} onPress={onClose} />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>{children}</View>
    </View>
  );
}

/**
 * Отказ в доступе — не тупик: одна кнопка либо спрашивает разрешение, либо ведёт в
 * настройки, где его можно вернуть.
 */
function PermissionBlock({ canAsk, onAsk, onOpenSettings }) {
  return (
    <View style={{ gap: 16, alignItems: 'center' }}>
      <Icon name="camera" size={44} color="#fff" strokeWidth={1.6} />
      <Txt style={{ fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' }}>
        Нужен доступ к камере
      </Txt>
      <Txt style={{ fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
        Камера нужна только для того, чтобы отсканировать QR-код учителя и отметиться на уроке.
      </Txt>
      <FilledButton onPress={canAsk ? onAsk : onOpenSettings} style={{ marginTop: 8 }}>
        {canAsk ? 'Разрешить доступ' : 'Открыть настройки'}
      </FilledButton>
    </View>
  );
}

/** Окно наведения: затемнение вокруг и углы, показывающие, куда целиться. */
function Viewfinder({ busy }) {
  const { c } = useTheme();
  const corner = { position: 'absolute', width: 34, height: 34, borderColor: c.green, borderWidth: 4 };
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: '70%', aspectRatio: 1, maxWidth: 320 }}>
        <View style={{ ...corner, top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 }} />
        <View style={{ ...corner, top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 }} />
        <View style={{ ...corner, bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 }} />
        <View style={{ ...corner, bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 }} />
        {busy && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
    </View>
  );
}

function CloseButton({ insets, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Закрыть сканер"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => ({
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
        zIndex: 2,
      })}
    >
      <Icon name="x" size={22} color="#fff" strokeWidth={2.2} />
    </Pressable>
  );
}

/**
 * Результат — шит поверх замершей камеры, а не отдельный экран: видно, что ты всё ещё в
 * сканере, и «сканировать снова» возвращает мгновенно.
 *
 * Цвет ничего не сообщает в одиночку — рядом всегда иконка и текст.
 */
function ResultSheet({ state, insets, onAction }) {
  const { c } = useTheme();
  const look = {
    success: { bg: c.successSoft, fg: c.success, icon: 'check' },
    neutral: { bg: c.blueSoft, fg: c.blue, icon: 'info' },
    warning: { bg: c.goldSoft, fg: c.goldDeep, icon: 'alertTriangle' },
    error: { bg: c.redSoft, fg: c.red, icon: 'alertTriangle' },
  }[state.tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: c.bg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: insets.bottom + 20,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: look.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={look.icon} size={22} color={look.fg} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>{state.title}</Txt>
          <Txt style={{ fontSize: 14, fontWeight: '500', color: c.inkMuted }}>{state.subtitle}</Txt>
        </View>
      </View>

      {state.action.kind === SCAN_ACTION.DISMISS ? (
        <OutlineButton size="lg" onPress={onAction}>
          {state.action.label}
        </OutlineButton>
      ) : (
        <FilledButton onPress={onAction}>{state.action.label}</FilledButton>
      )}
    </View>
  );
}
