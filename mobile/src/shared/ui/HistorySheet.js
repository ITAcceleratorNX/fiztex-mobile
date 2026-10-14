import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { HISTORY } from '@shared/theme/tokens';
import { Txt } from '@shared/components/Txt';
import { OutlineButton } from '@shared/components/ui';

export function HistorySheet({ title, subtitle, children, onClose }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: c.modalBackdrop }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть историю" onPress={onClose} style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{
          backgroundColor: c.surface, maxHeight: HISTORY.maxHeight,
          maxWidth: HISTORY.maxWidth, width: '100%', alignSelf: 'center',
          borderTopLeftRadius: HISTORY.sheetRadius, borderTopRightRadius: HISTORY.sheetRadius,
          paddingTop: HISTORY.inset, paddingBottom: Math.max(HISTORY.inset, insets.bottom),
        }}>
          <View style={{ paddingHorizontal: HISTORY.gutter, gap: HISTORY.gap }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: HISTORY.gap }}>
              <Txt style={{ flex: 1, fontSize: HISTORY.titleSize, fontWeight: '700', color: c.ink }}>{title}</Txt>
              <OutlineButton onPress={onClose}>Закрыть</OutlineButton>
            </View>
            {subtitle ? <Txt style={{ fontSize: HISTORY.bodySize, color: c.ink2 }}>{subtitle}</Txt> : null}
          </View>
          <ScrollView contentContainerStyle={{ padding: HISTORY.gutter, gap: HISTORY.gap }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
