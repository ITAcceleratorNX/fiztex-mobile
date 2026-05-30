import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { BuildingNode } from './BuildingNode';
import { MapBackground, SectionBanner } from './map/MapBackground';
import { PathConnector } from './map/PathConnector';
import { STAGES } from '../constants/stages';
import { useJourney } from '../context/JourneyContext';

const MAP_STAGES = [...STAGES].reverse();
const ALIGN_PATTERN = [
  'center',
  'left',
  'right',
  'left',
  'right',
  'left',
  'right',
  'left',
  'center',
];

export function JourneyMap({ scrollEnabled = true }) {
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { progress, selectStage, isLoading } = useJourney();

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.green} />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      scrollEnabled={scrollEnabled}
      contentContainerStyle={{
        paddingTop: insets.top + 130,
        paddingBottom: insets.bottom + 100,
        minHeight: MAP_STAGES.length * 200 + 400,
      }}
      showsVerticalScrollIndicator={false}
    >
      <MapBackground>
        <View style={styles.stages}>
          {MAP_STAGES.map((stage, index) => {
            const align = ALIGN_PATTERN[index] ?? 'center';
            const prevStage = MAP_STAGES[index - 1];
            const prevAlign = index > 0 ? ALIGN_PATTERN[index - 1] : align;
            const pathDone =
              prevStage &&
              progress.stageStatuses[prevStage.id] === 'reward_claimed';

            return (
              <View key={stage.id}>
                {index > 0 ? (
                  <PathConnector
                    from={prevAlign}
                    to={align}
                    completed={pathDone}
                    index={index}
                  />
                ) : null}
                {stage.isFinal ? (
                  <SectionBanner label="Финальная цель" emoji="🏔️" />
                ) : null}
                {stage.isStart ? (
                  <SectionBanner label="Старт пути" emoji="🚀" />
                ) : null}
                <BuildingNode
                  stage={stage}
                  status={progress.stageStatuses[stage.id]}
                  align={align}
                  onPress={() => selectStage(stage)}
                  tasksTotal={stage.tasks.length}
                  tasksDone={
                    progress.stageStatuses[stage.id] === 'completed' ||
                    progress.stageStatuses[stage.id] === 'reward_claimed'
                      ? stage.tasks.length
                      : 0
                  }
                />
              </View>
            );
          })}
        </View>
      </MapBackground>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stages: {
    paddingHorizontal: 16,
    zIndex: 5,
  },
});
