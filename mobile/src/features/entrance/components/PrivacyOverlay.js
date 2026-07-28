import React from 'react';
import { View, Modal, StyleSheet, Pressable } from 'react-native';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';

export function PrivacyOverlay({ visible, onResume }) {
  const { c, dark } = useTheme();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: dark ? '#000' : '#0F172A' }]}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: c.green, opacity: 0.35 }} />
        <Txt style={styles.title}>Тест приостановлен</Txt>
        <Txt style={styles.sub}>
          Выход из приложения зафиксирован. Нажмите «Продолжить», чтобы снова увидеть вопросы.
        </Txt>
        {onResume ? (
          <Pressable
            onPress={onResume}
            style={{
              marginTop: 28,
              paddingVertical: 14,
              paddingHorizontal: 28,
              borderRadius: 999,
              backgroundColor: c.green,
            }}
          >
            <Txt style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Продолжить</Txt>
          </Pressable>
        ) : null}
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
