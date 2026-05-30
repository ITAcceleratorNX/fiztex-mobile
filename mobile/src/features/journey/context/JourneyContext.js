import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { STAGE_ORDER, STAGES } from '../constants/stages';
import { loadProgress, saveProgress, resetProgress } from '../utils/storage';

const JourneyContext = createContext(null);

function unlockNextStage(statuses, currentId) {
  const index = STAGE_ORDER.indexOf(currentId);
  if (index < 0 || index >= STAGE_ORDER.length - 1) return statuses;
  const nextId = STAGE_ORDER[index + 1];
  if (statuses[nextId] === 'locked') {
    return { ...statuses, [nextId]: 'open' };
  }
  return statuses;
}

function applyReward(progress, stageId) {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) return progress;

  const stats = { ...progress.stats };
  if (stage.reward.points) stats.points += stage.reward.points;
  if (stage.reward.stars) stats.stars += stage.reward.stars;
  if (stage.reward.badge && !stats.badges.includes(stage.reward.badge)) {
    stats.badges = [...stats.badges, stage.reward.badge];
  }

  let stageStatuses = {
    ...progress.stageStatuses,
    [stageId]: 'reward_claimed',
  };
  stageStatuses = unlockNextStage(stageStatuses, stageId);

  const allMainDone = STAGE_ORDER.slice(0, -1).every(
    (id) => stageStatuses[id] === 'reward_claimed',
  );
  if (allMainDone && stageStatuses.mountain === 'locked') {
    stageStatuses = { ...stageStatuses, mountain: 'open' };
  }

  const goalAchieved =
    stageId === 'mountain' || progress.goalAchieved
      ? stageId === 'mountain'
      : progress.goalAchieved;

  return { stageStatuses, stats, goalAchieved };
}

export function JourneyProvider({ children }) {
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    loadProgress().then((data) => {
      setProgress(data);
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback(async (next) => {
    setProgress(next);
    await saveProgress(next);
  }, []);

  const markStageCompleted = useCallback(
    (stageId) => {
      if (!progress) return;
      const status = progress.stageStatuses[stageId];
      if (status !== 'open') return;
      persist({
        ...progress,
        stageStatuses: { ...progress.stageStatuses, [stageId]: 'completed' },
      });
    },
    [progress, persist],
  );

  const claimReward = useCallback(
    (stageId) => {
      if (!progress) return;
      const status = progress.stageStatuses[stageId];
      if (status !== 'completed') return;
      const next = applyReward(progress, stageId);
      persist(next);
      if (stageId === 'mountain') setShowCelebration(true);
    },
    [progress, persist],
  );

  const resetDemo = useCallback(async () => {
    const initial = await resetProgress();
    setProgress(initial);
    setSelectedStage(null);
    setShowCelebration(false);
  }, []);

  const value = useMemo(() => {
    if (!progress) return null;
    return {
      progress,
      isLoading,
      selectedStage,
      selectStage: setSelectedStage,
      markStageCompleted,
      claimReward,
      resetDemo,
      showCelebration,
      dismissCelebration: () => setShowCelebration(false),
    };
  }, [
    progress,
    isLoading,
    selectedStage,
    markStageCompleted,
    claimReward,
    resetDemo,
    showCelebration,
  ]);

  if (!value) return null;

  return (
    <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
  );
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used within JourneyProvider');
  return ctx;
}
