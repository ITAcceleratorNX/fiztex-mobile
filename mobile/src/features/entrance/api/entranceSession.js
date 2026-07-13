import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'fiztex.entrance.token';
const ATTEMPT_KEY = 'fiztex.entrance.attemptId';

let entranceToken = null;
let activeAttemptId = null;
let hydrated = false;

async function hydrate() {
  if (hydrated) return;
  const [token, attemptRaw] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(ATTEMPT_KEY),
  ]);
  entranceToken = token;
  activeAttemptId = attemptRaw ? Number(attemptRaw) : null;
  hydrated = true;
}

export async function getEntranceToken() {
  await hydrate();
  return entranceToken;
}

export async function setEntranceToken(token) {
  await hydrate();
  entranceToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getActiveAttemptId() {
  await hydrate();
  return activeAttemptId;
}

export async function setActiveAttemptId(attemptId) {
  await hydrate();
  activeAttemptId = attemptId != null ? attemptId : null;
  if (attemptId != null) await AsyncStorage.setItem(ATTEMPT_KEY, String(attemptId));
  else await AsyncStorage.removeItem(ATTEMPT_KEY);
}

export async function clearEntranceSession() {
  await hydrate();
  entranceToken = null;
  activeAttemptId = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, ATTEMPT_KEY]);
}
