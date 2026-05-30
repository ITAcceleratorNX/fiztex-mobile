import { Modal, StyleSheet, View } from 'react-native';
import { Txt } from '@shared/components/Txt';
import { PrimaryButton } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';
import { useTheme } from '@shared/theme/ThemeContext';
import { useJourney } from '../context/JourneyContext';

export function CelebrationOverlay() {
  const { c } = useTheme();
  const { showCelebration, dismissCelebration } = useJourney();

  return (
    <Modal visible={showCelebration} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <GradCard colors={GRAD.gold} style={{ marginBottom: 16, borderRadius: 20 }} padding={16}>
            <Txt style={{ fontSize: 36, textAlign: 'center' }}>🎉🏆🎉</Txt>
          </GradCard>
          <Txt style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
            Цель достигнута!
          </Txt>
          <Txt style={{ fontSize: 15, lineHeight: 22, color: c.ink2, textAlign: 'center', fontWeight: '500', marginBottom: 20 }}>
            Вы прошли весь путь героя! Главный бейдж «Goal Achieved» ваш!
          </Txt>
          <PrimaryButton color="green" onPress={dismissCelebration}>
            Ура! Продолжить
          </PrimaryButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 17, 13, 0.6)',
    padding: 28,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
});
