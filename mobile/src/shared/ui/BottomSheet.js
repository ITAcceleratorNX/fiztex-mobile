import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';

/**
 * Шторка снизу с заголовком и круглым «×» (Figma `phyztex` Р3–Р9, «Вторник, 17 ноября»): ручка
 * сверху, заголовок 20/700, подпись под ним, прокручиваемое тело и необязательный подвал с
 * кнопкой действия. Закрывается «×», нажатием по фону и системным «назад».
 *
 * Отличие от `PickerSheet` и `HistorySheet`: там список выбора и история с кнопкой «Закрыть»
 * словом, а здесь карточка сущности — её содержимое собирает экран.
 */
export function BottomSheet({ visible = true, title, subtitle, onClose, footer, children }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: c.modalBackdrop }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" onPress={onClose} style={{ flex: 1 }} />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.surface,
            maxHeight: '88%',
            maxWidth: 560,
            width: '100%',
            alignSelf: 'center',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingBottom: Math.max(20, insets.bottom + 8),
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.stripeIdle }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Txt accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>
                {title}
              </Txt>
              {subtitle ? <Txt style={{ fontSize: 13, color: c.inkMuted }}>{subtitle}</Txt> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.bg2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon name="x" size={16} color={c.ink2} strokeWidth={2.4} />
            </Pressable>
          </View>
          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 14 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
