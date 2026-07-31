/**
 * TEMPORARY attendance placeholder.
 *
 * Attendance tracking does not exist in the backend yet, but the Figma schedule
 * («Посещаемость – Смешанный день», node 2022:14940) shows an attendance badge on
 * past lessons. Until the real API lands we derive a value from the lesson id.
 *
 * It is deliberately NOT random: `Math.random()` would flip badges on every
 * re-render. Hashing the lesson id keeps a lesson's badge stable while still
 * producing a mixed day.
 *
 * When the backend ships:
 *   1. set `ATTENDANCE_MOCK_ENABLED = false` (or delete this module),
 *   2. feed `LessonRow`'s `attendance` prop from the real field.
 * Nothing else changes — the badge already renders from that single prop.
 */

export const ATTENDANCE_MOCK_ENABLED = true;

/** Statuses the design defines. `null` = not recorded (no badge). */
export const ATTENDANCE_STATUSES = ['present', 'late', 'absent'];

// Weighted so most lessons are "present", with the occasional late/absent and
// one unrecorded — the "mixed day" of the mockup.
const BUCKETS = ['present', 'present', 'present', 'present', 'late', 'absent', null];

/**
 * @param {{lessonId?: number|string, status?: string, date?: string}} lesson
 * @returns {'present'|'late'|'absent'|null} null when nothing should be shown
 */
export function mockAttendanceFor(lesson) {
  if (!ATTENDANCE_MOCK_ENABLED) return null;
  // Only finished lessons can have attendance — matches the design, where
  // «Сейчас»/«Следующий» keep their status badge instead.
  if (!lesson || lesson.status !== 'done') return null;

  // Lesson ids run sequentially within a day, so indexing the buckets with the
  // raw id rotates through them — every day ends up mixed, like the mockup.
  // The string hash is only a fallback for rows without an id (mock previews).
  if (Number.isFinite(Number(lesson.lessonId))) {
    return BUCKETS[Number(lesson.lessonId) % BUCKETS.length];
  }
  const key = `${lesson.date || ''}${lesson.time || ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }
  return BUCKETS[hash % BUCKETS.length];
}
