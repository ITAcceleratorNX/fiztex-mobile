import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { JourneyHeader } from '../components/JourneyHeader';
import { JourneyMap } from '../components/JourneyMap';
import { StageModal } from '../components/StageModal';
import { JourneyProvider, useJourney } from '../context/JourneyContext';

function JourneyContent() {
  const { c } = useTheme();
  const { resetDemo, selectedStage } = useJourney();
  const modalOpen = selectedStage !== null;

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <JourneyMap scrollEnabled={!modalOpen} />
      {!modalOpen ? <JourneyHeader /> : null}
      <StageModal />
      <CelebrationOverlay />
      {!modalOpen ? (
        <Pressable
          onLongPress={resetDemo}
          style={[styles.resetHint, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Txt style={{ fontSize: 9, fontWeight: '600', color: c.ink3 }}>hold = сброс</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StudentHeroes() {
  return (
    <JourneyProvider>
      <JourneyContent />
    </JourneyProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  resetHint: {
    position: 'absolute',
    bottom: 88,
    right: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
