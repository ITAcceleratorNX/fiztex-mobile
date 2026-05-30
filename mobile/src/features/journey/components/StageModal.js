import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card, PrimaryButton } from '@shared/components/ui';
import { GradCard, GRAD } from '@shared/components/Grad';
import { useTheme } from '@shared/theme/ThemeContext';
import { useJourney } from '../context/JourneyContext';

function statusLabel(status) {
  switch (status) {
    case 'open':
      return 'Открыто';
    case 'completed':
      return 'Выполнено';
    case 'reward_claimed':
      return 'Награда получена';
    default:
      return 'Закрыто';
  }
}

function RewardBlock({ parts }) {
  const { c } = useTheme();
  return (
    <View style={[styles.rewardBox, { backgroundColor: c.goldSoft, borderColor: c.goldDeep }]}>
      <Txt style={{ fontSize: 28 }}>🎁</Txt>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontSize: 12, fontWeight: '600', color: c.ink3 }}>Награда за этап</Txt>
        <Txt style={{ fontSize: 14, fontWeight: '700', marginTop: 2 }}>{parts.join(' · ') || '—'}</Txt>
      </View>
    </View>
  );
}

export function StageModal() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { selectedStage, selectStage, progress, markStageCompleted, claimReward } =
    useJourney();

  if (!selectedStage) return null;

  const status = progress.stageStatuses[selectedStage.id];
  const isLocked = status === 'locked';
  const rewardParts = [];
  if (selectedStage.reward.points) rewardParts.push(`${selectedStage.reward.points} XP`);
  if (selectedStage.reward.stars) rewardParts.push(`${selectedStage.reward.stars} ⭐`);
  if (selectedStage.reward.badge) rewardParts.push(`бейдж «${selectedStage.reward.badge}»`);
  if (selectedStage.reward.special) rewardParts.push(`«${selectedStage.reward.special}»`);

  const heroGrad =
    selectedStage.accent === '#777777'
      ? GRAD.blue
      : [selectedStage.accent, c.blueDeep];

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={() => selectStage(null)}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={() => selectStage(null)} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, backgroundColor: c.bg }]}>
          <GradCard
            colors={heroGrad}
            vertical
            style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
            padding={20}
            radius={0}
          >
            <Pressable style={styles.closeBtn} onPress={() => selectStage(null)}>
              <Icon name="x" size={20} color="#fff" />
            </Pressable>
            <Txt style={{ fontSize: 52, textAlign: 'center' }}>{selectedStage.emoji}</Txt>
            <Txt style={{ fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 4 }}>
              {selectedStage.name}
            </Txt>
            <View style={styles.statusPill}>
              <Txt style={{ fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase' }}>
                {statusLabel(status)}
              </Txt>
            </View>
            <Txt style={{ marginTop: 10, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.92)', textAlign: 'center' }}>
              {selectedStage.description}
            </Txt>
          </GradCard>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {isLocked ? (
              <Card style={{ alignItems: 'center', padding: 24 }}>
                <Txt style={{ fontSize: 36, marginBottom: 8 }}>🔒</Txt>
                <Txt style={{ textAlign: 'center', fontSize: 14, lineHeight: 20, color: c.ink2, fontWeight: '500' }}>
                  Этот этап пока закрыт. Завершите предыдущий этап, чтобы открыть его.
                </Txt>
              </Card>
            ) : (
              <>
                <Txt style={{ fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                  Задания ({selectedStage.tasks.length})
                </Txt>
                {selectedStage.tasks.map((task, i) => (
                  <Card key={task} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <View style={[styles.taskCheck, { backgroundColor: c.blueSoft, borderColor: c.blue }]}>
                      <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>{i + 1}</Txt>
                    </View>
                    <Txt style={{ flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 }}>{task}</Txt>
                  </Card>
                ))}
                <RewardBlock parts={rewardParts} />
              </>
            )}

            <PrimaryButton color="ghost" onPress={() => selectStage(null)}>
              Вернуться на карту
            </PrimaryButton>

            {!isLocked && status === 'open' ? (
              <PrimaryButton
                color="green"
                onPress={() => markStageCompleted(selectedStage.id)}
              >
                Отметить выполненным
              </PrimaryButton>
            ) : null}

            {!isLocked && status === 'completed' ? (
              <PrimaryButton
                color="gold"
                onPress={() => {
                  claimReward(selectedStage.id);
                  selectStage(null);
                }}
              >
                Получить награду
              </PrimaryButton>
            ) : null}

            {status === 'reward_claimed' ? (
              <View style={[styles.doneBanner, { backgroundColor: c.greenSoft, borderColor: c.green }]}>
                <Txt style={{ fontWeight: '700', color: c.greenDeep, fontSize: 15 }}>
                  ✓ Награда получена!
                </Txt>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 17, 13, 0.55)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  statusPill: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  body: { flexGrow: 0 },
  bodyContent: { padding: 16, gap: 10, paddingBottom: 24 },
  taskCheck: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginVertical: 4,
  },
  doneBanner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
});
