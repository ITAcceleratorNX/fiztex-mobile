import React from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { Txt } from '@shared/components/Txt';
import { Hex } from '@shared/components/Hex';
import { useTheme } from '@shared/theme/ThemeContext';

export function PrivacyOverlay({ visible }) {
  const { c, dark } = useTheme();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: dark ? '#000' : '#14110D' }]}>
        <Hex size={72} fill={c.green} style={{ opacity: 0.35 }} />
        <Txt style={styles.title}>Тест приостановлен</Txt>
        <Txt style={styles.sub}>Вернитесь в приложение, чтобы продолжить</Txt>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  sub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
