import React from 'react';

/** Thin provider — session lives in entranceSession.js; flow state in EntranceFlow. */
export function EntranceProvider({ children }) {
  return children;
}

export function useEntrance() {
  throw new Error('useEntrance is deprecated — use EntranceFlow props or admissionsApi directly');
}
