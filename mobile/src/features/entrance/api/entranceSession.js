import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'fiztex.entrance.token';
const ATTEMPT_KEY = 'fiztex.entrance.attemptId';
/** Pre–EntranceFlow keys from the old EntranceContext provider. */
const LEGACY_TOKEN_KEY = 'fiztex.admissions.token';
const LEGACY_ATTEMPT_KEY = 'fiztex.admissions.attemptId';

let entranceToken = null;
let activeAttemptId = null;
let hydrated = false;
let hydratePromise = null;

function parseAttemptId(raw) {
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

async function hydrate() {
  if (hydrated) return;
  if (hydratePromise) {
    await hydratePromise;
    return;
  }

  hydratePromise = (async () => {
    let [token, attemptRaw] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(ATTEMPT_KEY),
    ]);

    if (!token) {
      token = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
      if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    }
    if (!attemptRaw) {
      attemptRaw = await AsyncStorage.getItem(LEGACY_ATTEMPT_KEY);
      if (attemptRaw) await AsyncStorage.setItem(ATTEMPT_KEY, attemptRaw);
    }

    entranceToken = token;
    activeAttemptId = parseAttemptId(attemptRaw);
    hydrated = true;
  })();

  try {
    await hydratePromise;
  } finally {
    hydratePromise = null;
  }
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
  hydrated = false;
  hydratePromise = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, ATTEMPT_KEY, LEGACY_TOKEN_KEY, LEGACY_ATTEMPT_KEY]);
}
