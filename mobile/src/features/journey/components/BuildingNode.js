import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Pill } from '@shared/components/ui';
import { useTheme } from '@shared/theme/ThemeContext';
import { useJourneyTheme } from '../constants/theme';

const SIZE = 88;
const SIZE_FINAL = 108;

function nodeFill(status, t) {
  switch (status) {
    case 'open':
      return t.green;
    case 'completed':
      return t.blue;
    case 'reward_claimed':
      return t.goldDeep;
    default:
      return t.locked;
  }
}

export function BuildingNode({
  stage,
  status,
  align,
  onPress,
  tasksDone = 0,
  tasksTotal = 0,
}) {
  const { c } = useTheme();
  const t = useJourneyTheme();
  const isLocked = status === 'locked';
  const isOpen = status === 'open';
  const isFinal = stage.isFinal;
  const size = isFinal ? SIZE_FINAL : SIZE;
  const fill = nodeFill(status, t);
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOpen) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -3,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [isOpen, bounce]);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.wrap,
        {
          alignSelf:
            align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
          marginLeft: align === 'left' ? '6%' : 0,
          marginRight: align === 'right' ? '6%' : 0,
          opacity: isLocked ? 0.75 : 1,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <View style={styles.nodeWrap}>
          <View
            style={{
              width: size,
              height: size,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: fill,
              borderRadius: Math.round(size * 0.32),
              borderColor: isLocked ? c.borderStrong : '#FFFFFF88',
              borderWidth: isLocked ? 2 : 3,
            }}
          >
            <Txt style={{ fontSize: isFinal ? 40 : 34 }}>{stage.emoji}</Txt>
          </View>

          {isLocked ? (
            <View style={[styles.badge, { backgroundColor: c.ink3, borderColor: c.surface }]}>
              <Txt style={{ fontSize: 12 }}>🔒</Txt>
            </View>
          ) : null}
          {status === 'reward_claimed' ? (
            <View style={[styles.badge, { backgroundColor: c.goldDeep, borderColor: c.surface }]}>
              <Icon name="star" size={14} color="#fff" />
            </View>
          ) : null}
          {status === 'completed' ? (
            <View style={[styles.badge, { backgroundColor: c.green, borderColor: c.surface }]}>
              <Icon name="check" size={14} color="#fff" />
            </View>
          ) : null}
        </View>
      </Animated.View>

      <View style={[styles.labelCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Txt style={{ textAlign: 'center', fontSize: 12, fontWeight: '700' }} numberOfLines={2}>
          {stage.name}
        </Txt>
        {tasksTotal > 0 && !isLocked ? (
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: c.bg2 }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(tasksDone / tasksTotal) * 100}%`,
                    backgroundColor: status === 'reward_claimed' ? c.goldDeep : c.green,
                  },
                ]}
              />
            </View>
            <Txt style={{ fontSize: 9, fontWeight: '700', color: c.ink3 }}>
              {tasksDone}/{tasksTotal}
            </Txt>
          </View>
        ) : null}
        {isLocked ? (
          <Txt style={{ textAlign: 'center', fontSize: 10, fontWeight: '600', color: c.ink3, marginTop: 2 }}>
            Закрыто
          </Txt>
        ) : null}
      </View>

      {isOpen && stage.isStart ? (
        <Pill color="gold" style={{ marginTop: 8 }}>Начать</Pill>
      ) : null}
      {isOpen && !stage.isStart && !isFinal ? (
        <Pill color="blue" style={{ marginTop: 8 }}>Вперёд</Pill>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 4,
    zIndex: 5,
  },
  nodeWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelCard: {
    minWidth: 110,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});
