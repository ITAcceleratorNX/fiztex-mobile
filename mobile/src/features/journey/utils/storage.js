import AsyncStorage from '@react-native-async-storage/async-storage';
import { getInitialProgress, STORAGE_KEY } from '../constants/stages';

export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialProgress();
    const parsed = JSON.parse(raw);
    return {
      ...getInitialProgress(),
      ...parsed,
      stats: { ...getInitialProgress().stats, ...parsed.stats },
      stageStatuses: {
        ...getInitialProgress().stageStatuses,
        ...parsed.stageStatuses,
      },
    };
  } catch {
    return getInitialProgress();
  }
}

export async function saveProgress(progress) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export async function resetProgress() {
  const initial = getInitialProgress();
  await saveProgress(initial);
  return initial;
}
