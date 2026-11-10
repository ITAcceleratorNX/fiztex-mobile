export const REQUEST_TYPES = {
  RELEASE: 'Освобождение',
  SICK_LEAVE: 'Больничный',
};

export const REQUEST_STATUS = {
  PENDING: { label: 'На рассмотрении', tone: 'gold' },
  APPROVED: { label: 'Согласована', tone: 'success' },
  REJECTED: { label: 'Отклонена', tone: 'red' },
  CANCELLED: { label: 'Отменена', tone: 'gray' },
};

export const ACTIVE_STATUSES = ['PENDING', 'APPROVED'];
export const HISTORY_STATUSES = ['REJECTED', 'CANCELLED'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic'];

export function dateLabel(value) {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

export function daysInPeriod(from, to) {
  if (!from || !to) return 0;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
}

export function periodLabel(from, to) {
  return from === to ? dateLabel(from) : `${dateLabel(from)} — ${dateLabel(to)}`;
}

export function fileError(file) {
  const extension = String(file?.name || '').split('.').pop().toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(extension)) return 'Можно прикрепить PDF, JPG, PNG или HEIC.';
  if (file.sizeBytes > MAX_FILE_SIZE) return 'Размер файла не должен превышать 10 МБ.';
  return null;
}
