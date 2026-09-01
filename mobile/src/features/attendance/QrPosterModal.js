import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { FilledButton, OutlineButton } from '@shared/components/ui';

/**
 * Код на весь экран (ТЗ ATTENDANCE-QR-FE-001 §3).
 *
 * <b>Модалка и есть сессия.</b> Она открыта — код действует, закрыта — погашен. Поэтому
 * все выходы (крестик, кнопка «Закрыть», аппаратная «назад») делают одно и то же:
 * учитель не обязан помнить, какой из них выключает код в классе.
 *
 * <b>Экран не гаснет, пока код показан</b> — иначе учитель держит телефон перед классом и
 * тыкает в него каждые полминуты.
 *
 * Счётчика отметившихся и таймера здесь нет: ТЗ §7 исключает оба, хотя данные для
 * счётчика приходят тем же ответом.
 */
export function QrPosterModal({ visible, payload, lessonTitle, lessonEndsAt, busy, onReissue, onClose }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Код читают с задней парты: занимаем короткую сторону экрана целиком, оставив место
  // на шапку, подпись классу и кнопки.
  const size = Math.max(180, Math.min(width - 48, height - 320));

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {visible && <PosterBody
        c={c}
        insets={insets}
        size={size}
        payload={payload}
        lessonTitle={lessonTitle}
        lessonEndsAt={lessonEndsAt}
        busy={busy}
        onReissue={onReissue}
        onClose={onClose}
      />}
    </Modal>
  );
}

function PosterBody({ c, insets, size, payload, lessonTitle, lessonEndsAt, busy, onReissue, onClose }) {
  useKeepAwake();
  const [expired, setExpired] = useState(false);

  // Звонок гасит код на сервере, поэтому в этот момент экран закрывается сам. Это не
  // таймер на экране, а отказ показывать классу мёртвый код.
  useEffect(() => {
    if (!lessonEndsAt) return undefined;
    const delay = new Date(lessonEndsAt).getTime() - Date.now();
    if (!Number.isFinite(delay)) return undefined;
    if (delay <= 0) {
      setExpired(true);
      return undefined;
    }
    const timer = setTimeout(() => {
      setExpired(true);
      onClose();
    }, delay);
    return () => clearTimeout(timer);
  }, [lessonEndsAt, onClose]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Какой это урок: учитель должен видеть, что показывает код нужного занятия. */}
          <Txt numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>
            {lessonTitle}
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть QR-код"
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="x" size={22} color={c.ink2} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 24 }}>
        <View
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            borderRadius: 16,
          }}
        >
          {payload && !expired ? (
            // Уровень M: больше коррекции — плотнее модули и хуже читается издалека,
            // меньше — нет запаса на блик.
            <QRCode value={payload} size={size - 32} ecl="M" backgroundColor="#fff" color="#000" />
          ) : (
            <ActivityIndicator size="large" color={c.ink3} />
          )}
        </View>

        {/* Читает класс, а не учитель, — поэтому крупно. */}
        <Txt style={{ fontSize: 22, fontWeight: '700', color: c.ink, textAlign: 'center' }}>
          Отсканируйте код в приложении PhysTech
        </Txt>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <OutlineButton size="lg" disabled={busy} onPress={onReissue}>
              Новый код
            </OutlineButton>
          </View>
          <View style={{ flex: 1 }}>
            <FilledButton disabled={busy} onPress={onClose}>
              Закрыть
            </FilledButton>
          </View>
        </View>
        {/* Подтверждения у перевыпуска нет: диалог на каждое «не сканируется» надоедает
            сильнее, чем разовая потеря кода, который ещё никто не успел отсканировать. */}
        <Txt style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted, textAlign: 'center' }}>
          Прежний код перестанет действовать
        </Txt>
      </View>
    </View>
  );
}
