import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

const NAVY = '#274185';

/** Decorative navy hero background — matches Figma entrance code screen. */
export function EntranceCodeBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: NAVY }]}>
      <View
        style={{
          position: 'absolute',
          top: height * 0.22,
          left: width * 0.5 - 200,
          width: 400,
          height: 400,
          borderRadius: 999,
          backgroundColor: 'rgba(251, 146, 60, 0.18)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -width * 0.45,
          right: -width * 0.35,
          width: width * 1.1,
          height: width * 1.1,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: -height * 0.15,
          left: -width * 0.35,
          width: width * 1.4,
          height: 2,
          backgroundColor: 'rgba(255,255,255,0.05)',
          transform: [{ rotate: '32deg' }],
        }}
      />
    </View>
  );
}
