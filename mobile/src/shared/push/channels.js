import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Каналы уведомлений Android. Идентификаторы — контракт с бэком: `NotificationTopic.channelId()` в модуле
 * уведомлений. Канал, которого нет на телефоне, Android молча не показывает, поэтому новая тема на бэке
 * — это новая строка здесь, и приложение с ней должно выйти раньше, чем сценарий.
 *
 * `general` — канал по умолчанию (`defaultChannel` плагина в app.json): им уходят уведомления без темы,
 * например тестовый пуш диагностики.
 */
export const ANDROID_CHANNELS = [
  { id: 'lessons', name: 'Уроки и расписание', description: 'Отмена, перенос и замена уроков' },
  { id: 'homework', name: 'Задания и тесты', description: 'Новые задания и тесты' },
  { id: 'grades', name: 'Оценки', description: 'Новые и изменённые оценки' },
  { id: 'reminders', name: 'Напоминания', description: 'Посещаемость, проверка работ, итоги дня' },
  { id: 'feedback', name: 'Отзывы и опросы', description: 'Ежемесячные отзывы учителей и опросы' },
  { id: 'general', name: 'Прочее', description: 'Остальные уведомления' },
];

/**
 * Создаёт каналы. На Android 13+ запрос разрешения показывается только после появления первого канала,
 * поэтому вызывать до запроса разрешения. Повторный вызов обновляет названия, настройки человека не трогает.
 */
export async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all(ANDROID_CHANNELS.map((channel) =>
    Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      description: channel.description,
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#2A8847',
    })));
}
