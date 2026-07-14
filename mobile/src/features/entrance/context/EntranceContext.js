import React, { createContext } from 'react';

const EntranceCtx = createContext(null);

/**
 * Thin provider — kept only so App.js can wrap the tree without churn.
 * Session state now lives in entranceSession.js and the flow state in EntranceFlow.js,
 * which talk to `admissionsApi` directly. There is no shared context state anymore.
 */
export function EntranceProvider({ children }) {
  return <EntranceCtx.Provider value={null}>{children}</EntranceCtx.Provider>;
}

export function useEntrance() {
  throw new Error('useEntrance is deprecated — use EntranceFlow props or admissionsApi directly');
}
