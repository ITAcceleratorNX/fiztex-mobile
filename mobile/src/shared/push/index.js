import React from 'react';
import { PushNavigationBridge } from './PushNavigationBridge';
import { usePushRegistration } from './usePushRegistration';

export { configurePushPresentation } from './registration';

/**
 * Push-уведомления приложения (PUSH-001): регистрация телефона за сессией и переход по нажатию.
 * Рендерится один раз внутри `AuthProvider`, рядом с навигатором.
 */
export function PushNotifications({ navigationRef, rootRouteFor }) {
  usePushRegistration();
  return <PushNavigationBridge navigationRef={navigationRef} rootRouteFor={rootRouteFor} />;
}
