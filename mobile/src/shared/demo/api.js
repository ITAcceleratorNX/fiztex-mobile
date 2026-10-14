import { demoRole, demoSessionId, rememberDemoFile } from './session';

const STUDENTS = [
  { studentProfileId: 101, fullName: 'Данияр Демо', classId: 11, className: '7А' },
  { studentProfileId: 102, fullName: 'Амина Демо', classId: 12, className: '5Б' },
  { studentProfileId: 103, fullName: 'Тимур Примеров', classId: 11, className: '7А' },
];
const SUBJECTS = [{ id: 21, name: 'Математика' }, { id: 22, name: 'Физика' }];
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
let state;
const copy = (value) => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const dateString = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
function dateOffset(date, days) { const result = new Date(`${date}T12:00:00`); result.setDate(result.getDate() + days); return dateString(result); }
function fail(message, status = 409, code = 'DEMO_VALIDATION', details) { const error = new Error(message); Object.assign(error, { status, code, details }); throw error; }
function teacher(role) { if (role !== 'TEACHER') fail('Это действие доступно учителю', 403); }
function studentFor(role, params, childId) {
  const id = role === 'PARENT' ? Number(childId || params.get('childId') || params.get('childStudentProfileId') || 101) : 101;
  const student = STUDENTS.find((item) => item.studentProfileId === id && id !== 103);
  if (!student) fail('Ребёнок не найден', 404);
  return student;
}
function page(items, params) {
  const size = Math.max(1, Number(params.get('size')) || 20);
  const number = Math.max(0, Number(params.get('page')) || 0);
  return { content: items.slice(number * size, (number + 1) * size), totalElements: items.length,
    totalPages: Math.ceil(items.length / size), size, number, first: number === 0, last: (number + 1) * size >= items.length, empty: items.length === 0 };
}
function data() {
  if (state?.sessionId === demoSessionId()) return state;
  const today = dateString(new Date());
  const yearNumber = Number(today.slice(0, 4));
  const startYear = Number(today.slice(5, 7)) >= 9 ? yearNumber : yearNumber - 1;
  const year = { id: 1, name: `${startYear}–${startYear + 1}`, startDate: `${startYear}-09-01`, endDate: `${startYear + 1}-08-31` };
  const period = { id: 2, name: 'Демонстрационный период', current: true, startDate: dateOffset(today, -30), endDate: dateOffset(today, 30) };
  const lesson = (id, classId, subjectId, lessonNumber, day = today) => ({ id, classId,
    className: classId === 11 ? '7А' : '5Б', subjectId, subjectName: SUBJECTS.find((item) => item.id === subjectId).name,
    date: day, startTime: lessonNumber === 1 ? '09:00:00' : '10:00:00', endTime: lessonNumber === 1 ? '09:45:00' : '10:45:00',
    startsAt: `${day}T09:00:00+05:00`, endsAt: `${day}T09:45:00+05:00`, lessonNumber, room: '204', status: 'ACTIVE',
    temporalStatus: day < today ? 'FINISHED' : 'UPCOMING', academicPeriodId: 2, academicPeriodName: period.name,
    academicPeriodStatus: 'ACTIVE', targetType: 'CLASS', teacher: { id: 31, fullName: 'Марина Демо' },
    topic: subjectId === 21 ? 'Проценты и пропорции' : 'Скорость и расстояние', materialCount: 0, textbookCount: 0,
    changedFields: [], homeworkState: 'ASSIGNED', homework: null, comment: null });
  const lessons = [lesson(201, 11, 21, 1), lesson(202, 11, 22, 2), lesson(203, 12, 21, 1),
    lesson(204, 11, 21, 1, dateOffset(today, -1))];
  const assignment = (id, lessonId, title, status = 'PUBLISHED') => {
    const linked = lessons.find((item) => item.id === lessonId);
    return { id, lessonId, title, description: 'Решите задачи: найдите 20% от 150 и число, 25% которого равны 30. Запишите ход решения.',
      classId: linked.classId, className: linked.className, subjectId: linked.subjectId, subjectName: linked.subjectName,
      teacherProfileId: 31, teacherName: 'Марина Демо', answerFormat: 'WRITTEN', creationMode: 'MANUAL',
      status, dueType: 'EXACT', dueAt: `${dateOffset(today, 3)}T18:00:00+05:00`, publishedAt: now(), createdAt: now(), updatedAt: now(),
      questionCount: 0, antiCheatEnabled: false, materials: [], overdue: false, updatedAfterPublish: false,
      lesson: { id: linked.id, lessonDate: linked.date, lessonNumber: linked.lessonNumber },
      recipients: { type: 'CLASS', locked: true, snapshotTaken: true, students: STUDENTS.filter((item) => item.classId === linked.classId).map((item) => ({ ...item, active: true })), totalCount: linked.classId === 11 ? 2 : 1, activeCount: linked.classId === 11 ? 2 : 1 } };
  };
  state = { sessionId: demoSessionId(), today, year, period, lessons, nextId: 1000,
    homework: [assignment(301, 201, 'Проценты: самостоятельная работа'), assignment(302, 202, 'Скорость и расстояние'),
      assignment(303, 203, 'Дроби: закрепление'), assignment(304, 204, 'Пропорции: проверенная работа', 'COMPLETED')],
    submissions: {}, attendance: {}, grades: [], completed: {}, notifications: [], gradeHistory: {} };
  for (const [homeworkId, studentId, body, status] of [[302, 101, 'Скорость равна расстоянию, делённому на время: 120 / 2 = 60 км/ч.', 'SUBMITTED'], [304, 101, 'Ответ: 12. Использовал основное свойство пропорции.', 'DONE'], [301, 103, '20% от 150 = 30. Искомое число = 120.', 'SUBMITTED']]) {
    const attempt = { id: state.nextId++, attemptNumber: 1, body, submittedAt: now(), photos: [], files: [], reviews: status === 'DONE' ? [{ id: state.nextId++, decision: 'DONE', comment: 'Верное решение. Молодец!', createdAt: now(), photos: [], teacherProfileId: 31 }] : [] };
    state.submissions[`${homeworkId}:${studentId}`] = { id: state.nextId++, homeworkId, studentProfileId: studentId,
      studentFullName: STUDENTS.find((item) => item.studentProfileId === studentId).fullName, status, attemptCount: 1,
      currentAttempt: attempt, history: [], lastSubmittedAt: attempt.submittedAt, resubmitted: false };
  }
  state.grades.push({ id: 501, studentProfileId: 101, sourceType: 'LESSON', sourceId: 204, subjectId: 21, scaleCode: '5', numericValue: 5, gradeType: 'LESSON_WORK', weight: 1, deleted: false, academicPeriodId: 2, academicYearId: 1, createdAt: now(), updatedAt: now(), publishedAt: now() });
  state.grades.push({ ...state.grades[0], id: 502, studentProfileId: 102, sourceId: 203, scaleCode: '4', numericValue: 4 });
  const entries = STUDENTS.filter((item) => item.classId === 11).map((item) => ({ ...item, draft: { status: 'PRESENT', mark: null, reason: null, comment: null }, published: { status: 'PRESENT', mark: null, reason: null, comment: null } }));
  state.attendance[204] = { version: 1, entries, state: 'PUBLISHED', publishedAt: now() };
  return state;
}
function lessonView(lesson, role, student) {
  const d = data();
  return { ...lesson, viewerRole: role === 'TEACHER' ? 'MAIN_TEACHER' : role,
    capabilities: ['VIEW_CARD', 'VIEW_GRADES', 'VIEW_ATTENDANCE', ...(role === 'TEACHER' ? ['VIEW_STUDENTS', 'VIEW_TEACHER_HISTORY', 'EDIT_TEACHING_PART', 'FILL_ATTENDANCE'] : role === 'STUDENT' ? ['SUBMIT_HOMEWORK'] : [])],
    homework: lesson.homework ? { ...lesson.homework, completed: Boolean(d.completed[`${lesson.id}:${student.studentProfileId}`]) } : null };
}
function submission(homeworkId, studentId) {
  const d = data();
  const hw = d.homework.find((item) => item.id === homeworkId);
  if (!hw) fail('Задание не найдено', 404);
  const sub = d.submissions[`${homeworkId}:${studentId}`] || { id: null, homeworkId, studentProfileId: studentId,
    studentFullName: STUDENTS.find((item) => item.studentProfileId === studentId)?.fullName, status: 'NOT_SUBMITTED', attemptCount: 0, currentAttempt: null, history: [], resubmitted: false };
  return { ...sub, canSubmit: hw.status === 'PUBLISHED' && ['NOT_SUBMITTED', 'RETURNED'].includes(sub.status), blockedReason: hw.status === 'COMPLETED' ? 'Задание завершено' : sub.status === 'SUBMITTED' ? 'Работа уже отправлена' : sub.status === 'DONE' ? 'Работа проверена' : null };
}
function roster(hw) {
  const students = hw.recipients.students.map((item) => { const sub = submission(hw.id, item.studentProfileId); return { ...item, status: sub.status, currentAttemptId: sub.currentAttempt?.id, submissionId: sub.id, lastSubmittedAt: sub.lastSubmittedAt, resubmitted: sub.resubmitted }; });
  const count = (status) => students.filter((item) => item.status === status).length;
  return { students, total: students.length, notSubmitted: count('NOT_SUBMITTED'), submitted: count('SUBMITTED'), returned: count('RETURNED'), done: count('DONE') };
}
function homeworkView(hw) { const progress = roster(hw); return { ...hw, hasAnswers: progress.notSubmitted !== progress.total, progress: { total: progress.total, submitted: progress.total - progress.notSubmitted, pendingReview: progress.submitted } }; }
function studentGrades(studentId, subjectId) { return data().grades.filter((item) => item.studentProfileId === studentId && !item.deleted && (!subjectId || item.subjectId === subjectId)); }
function average(grades) { return { count: grades.length, average: grades.length ? Number((grades.reduce((sum, item) => sum + item.numericValue, 0) / grades.length).toFixed(2)) : null }; }
function sheet(lesson) {
  const d = data();
  const stored = d.attendance[lesson.id] || { version: null, state: 'NOT_FILLED', entries: STUDENTS.filter((item) => item.classId === lesson.classId).map((item) => ({ ...item, draft: { status: 'NOT_MARKED', mark: null, reason: null, comment: null }, published: null })) };
  const markedCount = stored.entries.filter((item) => item.draft.status !== 'NOT_MARKED').length;
  return { ...stored, lessonId: lesson.id, totalCount: stored.entries.length, markedCount, canFill: true, canPublish: markedCount === stored.entries.length,
    hasUnpublishedChanges: stored.state === 'DRAFT', reminder: stored.state !== 'PUBLISHED' };
}
function notify(title, body, roles = ['STUDENT', 'PARENT']) {
  data().notifications.unshift({ id: String(data().nextId++), title, body, roles, read: false, kind: 'DEMO', createdAt: now(), route: 'home', params: {} });
}
function multipartBody(form) {
  const parts = form?._parts || (typeof form?.entries === 'function' ? [...form.entries()] : []);
  const body = {};
  for (const [key, value] of parts) {
    if (key === 'photos' || key === 'files') (body[key] ||= []).push(value);
    else body[key] = value;
  }
  return body;
}

// Contract-shaped local responses. Unknown routes fail closed; there is no HTTP fallback.
export async function demoRequest(path, { method = 'GET', body, token, multipart = false } = {}) {
  const role = demoRole(token);
  if (multipart) body = multipartBody(body);
  const d = data();
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);
  const childMatch = pathname.match(/\/children\/(\d+)/);
  const student = studentFor(role, params, childMatch?.[1]);
  let result;
  const get = method === 'GET';
  if (pathname === '/api/me/profile' && get) result = { accountId: role === 'STUDENT' ? 900001 : role === 'PARENT' ? 900002 : 900003, role,
    fullName: role === 'STUDENT' ? 'Данияр Демо' : role === 'PARENT' ? 'Алия Демо' : 'Марина Демо',
    firstName: role === 'STUDENT' ? 'Данияр' : role === 'PARENT' ? 'Алия' : 'Марина', lastName: 'Демо',
    children: role === 'PARENT' ? STUDENTS.slice(0, 2).map((item) => ({ ...item, firstName: item.fullName.split(' ')[0], academicYearName: d.year.name, relationType: 'MOTHER' })) : [],
    student: role === 'STUDENT' ? { studentProfileId: 101, className: '7А', academicYearName: d.year.name } : null,
    teacher: role === 'TEACHER' ? { teacherProfileId: 31, assignments: [{ classId: 11, className: '7А', subjectId: 21, subjectName: 'Математика' }, { classId: 11, className: '7А', subjectId: 22, subjectName: 'Физика' }, { classId: 12, className: '5Б', subjectId: 21, subjectName: 'Математика' }] } : null };
  else if (pathname === '/api/schedule/children' && get) result = STUDENTS.slice(0, 2).map((item) => ({ ...item, firstName: item.fullName.split(' ')[0], academicYearName: d.year.name, relationType: 'MOTHER' }));
  else if (/^\/api\/schedule\/(me|children\/\d+)\/(today|week)$/.test(pathname) && get) {
    const selected = params.get('date') || d.today;
    const monday = dateOffset(selected, -((new Date(`${selected}T12:00:00`).getDay() + 6) % 7));
    const weekly = pathname.endsWith('/week');
    const lessons = d.lessons.filter((item) => (role === 'TEACHER' || item.classId === student.classId) && (weekly ? item.date >= monday && item.date <= dateOffset(monday, 6) : item.date === selected));
    result = { status: lessons.length ? 'ok' : 'no_lessons', date: selected, weekStart: monday, weekEnd: dateOffset(monday, 6), workingDays: WEEKDAYS,
      classId: student.classId, className: student.className, academicYearId: 1, academicPeriodId: 2, events: [], oneTimeEvents: [],
      lessons: lessons.map((item) => ({ ...item, lessonId: item.id, lessonInstanceId: item.id, weekday: WEEKDAYS[new Date(`${item.date}T12:00:00`).getDay()], teacherFullName: 'Марина Демо', teacherId: 31, cancelled: false, audienceType: 'CLASS' })) };
  }
  else if (pathname === '/api/lessons/current' && get) result = { status: 'ok', lesson: lessonView(d.lessons.find((item) => item.classId === student.classId), role, student) };
  else if (/^\/api\/lessons\/\d+/.test(pathname)) {
    const [, id, action = ''] = pathname.match(/^\/api\/lessons\/(\d+)(?:\/(.*))?$/) || [];
    const lesson = d.lessons.find((item) => item.id === Number(id));
    if (!lesson) fail('Урок не найден', 404);
    if (!action && get) result = lessonView(lesson, role, student);
    else if (action === 'students' && get) result = STUDENTS.filter((item) => item.classId === lesson.classId).map((item) => ({ id: item.studentProfileId, fullName: item.fullName }));
    else if (action === 'history' && get) result = page([], params);
    else if (action === 'materials' && get) result = [];
    else if (action === 'textbooks' && get) result = { selected: null, available: [], canSelect: false };
    else if (action === 'summary' && get) result = { canEdit: false, aiEnabled: false, content: null, publishedContent: null, revision: 0, remainingCalls: 0, hasUnpublishedChanges: false };
    else if (action === 'grades/sheet' && get) { teacher(role); result = { lessonId: lesson.id, writeState: 'ALLOWED', canManageGrades: true, capacity: 'MAIN_TEACHER', maxGradesPerStudent: 3, valueMode: 'SCALE', defaultWorkType: 'LESSON_WORK', workTypes: [], students: STUDENTS.filter((item) => item.classId === lesson.classId).map((item) => ({ studentProfileId: item.studentProfileId, fullName: item.fullName, grades: studentGrades(item.studentProfileId).filter((grade) => grade.sourceType === 'LESSON' && grade.sourceId === lesson.id).map((grade) => ({ ...grade, canEdit: true, authorName: 'Марина Демо', authorCapacity: 'MAIN_TEACHER' })) })) }; }
    else if (action === 'grades' && get) result = studentGrades(student.studentProfileId).filter((item) => item.sourceId === lesson.id && item.sourceType === 'LESSON');
    else if (action === 'parent-comments' && get) result = { lessonId: lesson.id, writeState: 'ALLOWED', students: [] };
    else if (action === 'attendance/me' && get) result = { lessonId: lesson.id, studentProfileId: student.studentProfileId, attendance: sheet(lesson).entries.find((item) => item.studentProfileId === student.studentProfileId)?.published ?? null };
    else if (action.startsWith('attendance')) {
      teacher(role);
      const current = sheet(lesson);
      if (action === 'attendance' && get) result = current;
      else if (action === 'attendance/history' && get) result = page([], params);
      else if (action === 'attendance/qr' && get) result = null;
      else if (['attendance/entries', 'attendance/mark-all-present', 'attendance/publish'].includes(action) && !get) {
        if ((body?.expectedVersion ?? null) !== current.version) fail('Лист изменился. Обновите его.', 409, 'ATTENDANCE_VERSION_CONFLICT');
        if (action === 'attendance/mark-all-present') {
          const affected = current.entries.filter((item) => item.draft.status === 'ABSENT' || item.draft.mark);
          if (affected.length && !body?.confirmOverwrite) fail('Подтвердите замену отметок', 409, 'ATTENDANCE_BULK_OVERWRITE_CONFIRM_REQUIRED', { affectedCount: affected.length });
          current.entries.forEach((item) => { item.draft = { status: 'PRESENT', mark: null, reason: null, comment: null }; });
        } else if (action === 'attendance/entries') {
          for (const entry of body?.entries || []) {
            const row = current.entries.find((item) => item.studentProfileId === entry.studentProfileId);
            if (!row) fail('Ученик не найден', 404);
            row.draft = { status: entry.status, mark: entry.mark ?? null, reason: entry.reason ?? null, comment: entry.comment ?? null };
          }
        } else {
          const missing = current.entries.filter((item) => item.draft.status === 'NOT_MARKED');
          if (missing.length) fail('Отметьте всех учеников', 409, 'ATTENDANCE_INCOMPLETE', { unmarkedStudentProfileIds: missing.map((item) => item.studentProfileId) });
          current.entries.forEach((item) => { item.published = copy(item.draft); });
          current.publishedAt = now();
          notify('Посещаемость опубликована', `${lesson.subjectName}: отметки доступны в расписании`);
        }
        current.version = (current.version || 0) + 1;
        current.state = action === 'attendance/publish' ? 'PUBLISHED' : 'DRAFT';
        current.draftUpdatedAt = now(); current.draftUpdatedByName = 'Марина Демо';
        d.attendance[lesson.id] = current;
        result = sheet(lesson);
      }
    } else if (['topic', 'comment', 'homework/not-assigned'].includes(action) && !get) {
      teacher(role);
      if (action === 'topic') lesson.topic = method === 'DELETE' ? null : body?.topic;
      if (action === 'comment') lesson.comment = method === 'DELETE' ? null : { id: lesson.id, body: body?.body, createdByName: 'Марина Демо', createdAt: now(), updatedAt: now() };
      if (action === 'homework/not-assigned') lesson.homeworkState = method === 'DELETE' ? 'NOT_SPECIFIED' : 'NOT_ASSIGNED';
      result = action === 'comment' && method !== 'DELETE' ? lesson.comment : lessonView(lesson, role, student);
    }
  }
  else if (pathname === '/api/homework' && get) result = page(d.homework.filter((item) => (params.get('scope') === 'HISTORY' ? ['COMPLETED', 'CANCELLED'].includes(item.status) : ['PUBLISHED', 'DRAFT'].includes(item.status)) && (!params.get('lessonId') || item.lessonId === Number(params.get('lessonId'))) && (!params.get('classId') || item.classId === Number(params.get('classId')))).map(homeworkView), params);
  else if (/^\/api\/homework\/(my|children\/\d+)$/.test(pathname) && get) result = page(d.homework.filter((item) => item.classId === student.classId && item.status !== 'DRAFT' && (!params.get('lessonId') || item.lessonId === Number(params.get('lessonId'))) && (params.get('scope') === 'HISTORY' ? ['COMPLETED', 'CANCELLED'].includes(item.status) : item.status === 'PUBLISHED')).map((item) => ({ ...item, submissionStatus: submission(item.id, student.studentProfileId).status, lastSubmittedAt: submission(item.id, student.studentProfileId).lastSubmittedAt })), params);
  else if (/^\/api\/homework\/\d+/.test(pathname)) {
    const [, id, action = ''] = pathname.match(/^\/api\/homework\/(\d+)(?:\/(.*))?$/) || [];
    const hw = d.homework.find((item) => item.id === Number(id));
    if (!hw) fail('Задание не найдено', 404);
    if (role !== 'TEACHER' && hw.classId !== student.classId) fail('Задание недоступно этому ребёнку', 404);
    if (!action && get) result = homeworkView(hw);
    else if (action === 'materials' && get) result = [];
    else if (action === 'history' && get) result = page([], params);
    else if (action === 'questions' && get) result = [];
    else if (action === 'ai-generations' && get) result = [];
    else if (action === 'grades' && get) result = d.grades.filter((item) => item.sourceType === 'HOMEWORK' && item.sourceId === hw.id && !item.deleted);
    else if (action === 'grades/value-mode' && get) result = { valueMode: 'SCALE', defaultWorkType: 'HOMEWORK', workTypes: [] };
    else if (action === 'my-submission' && get) result = { ...hw, submission: submission(hw.id, 101) };
    else if (action === 'my-submission' && method === 'POST') {
      if (role !== 'STUDENT') fail('Работу отправляет ученик', 403);
      const old = submission(hw.id, 101);
      if (!old.canSubmit) fail(old.blockedReason || 'Работу уже отправили');
      if (!String(body?.body || '').trim() && !body?.photos?.length && !body?.files?.length) fail('Добавьте ответ или вложение', 400);
      const attachments = (items, kind) => (items || []).map((file) => {
        const fileId = d.nextId++;
        rememberDemoFile(`/api/homework/${hw.id}/my-submission/attachments/${fileId}/content`, file?.uri);
        rememberDemoFile(`/api/homework/${hw.id}/submissions/101/attachments/${fileId}/content`, file?.uri);
        return { id: fileId, fileName: file?.name || 'Локальное вложение', contentType: file?.type, kind, sizeBytes: 0 };
      });
      const attempt = { id: d.nextId++, body: String(body?.body || ''), attemptNumber: old.attemptCount + 1, submittedAt: now(), reviews: [], photos: attachments(body?.photos, 'PHOTO'), files: attachments(body?.files, 'FILE') };
      result = { ...old, id: old.id || d.nextId++, status: 'SUBMITTED', currentAttempt: attempt, history: old.currentAttempt ? [...old.history, old.currentAttempt] : [], attemptCount: attempt.attemptNumber, lastSubmittedAt: attempt.submittedAt, resubmitted: old.attemptCount > 0 };
      d.submissions[`${hw.id}:101`] = result;
      notify('Работа отправлена', hw.title, ['TEACHER']);
    } else if (/^children\/\d+$/.test(action) && get) {
      const sub = submission(hw.id, student.studentProfileId);
      result = { ...hw, work: { status: sub.status, attemptCount: sub.attemptCount, lastSubmittedAt: sub.lastSubmittedAt, resubmitted: sub.resubmitted, lastReview: sub.currentAttempt?.reviews.slice(-1)[0] || null } };
      delete result.submission;
    } else if (action === 'submissions' && get) { teacher(role); result = roster(hw); }
    else if (/^submissions\/\d+$/.test(action) && get) { teacher(role); result = submission(hw.id, Number(action.split('/')[1])); }
    else if (/^submissions\/\d+\/reviews$/.test(action) && method === 'POST') {
      teacher(role);
      const studentId = Number(action.split('/')[1]);
      const sub = submission(hw.id, studentId);
      if (!sub.currentAttempt || sub.currentAttempt.id !== Number(body?.expectedAttemptId)) fail('Работа изменилась. Откройте её заново.');
      if (!['DONE', 'RETURNED'].includes(body?.decision)) fail('Выберите решение', 400);
      if (body.decision === 'RETURNED' && !String(body.comment || '').trim()) fail('Напишите, что нужно исправить', 400);
      sub.currentAttempt.reviews.push({ id: d.nextId++, decision: body.decision, comment: body.comment || '', createdAt: now(), photos: [], teacherProfileId: 31 });
      sub.status = body.decision;
      d.submissions[`${hw.id}:${studentId}`] = sub;
      result = submission(hw.id, studentId);
      notify(body.decision === 'DONE' ? 'Работа проверена' : 'Работа возвращена', hw.title);
    } else if (action.endsWith('anti-cheat-events')) result = get ? { enabled: false, attempts: [], violationCount: 0 } : null;
    else if (['publish', 'completion', 'cancellation'].includes(action) && !get) { teacher(role); hw.status = action === 'publish' || method === 'DELETE' ? 'PUBLISHED' : action === 'completion' ? 'COMPLETED' : 'CANCELLED'; result = homeworkView(hw); }
  }
  else if (pathname === '/api/grades/scale' && get) result = [2, 3, 4, 5].map((value) => ({ code: String(value), numericValue: value, sortOrder: value }));
  else if (pathname === '/api/grades/my/subjects' && get) result = { academicYearId: 1, className: student.className, studentProfileId: student.studentProfileId, period: d.period, periods: [d.period], subjects: SUBJECTS.map((item) => ({ subjectId: item.id, subjectName: item.name, grades: studentGrades(student.studentProfileId, item.id), average: average(studentGrades(student.studentProfileId, item.id)), result: null })) };
  else if (/^\/api\/grades\/my\/homework\/\d+$/.test(pathname) && get) result = studentGrades(student.studentProfileId).filter((item) => item.sourceType === 'HOMEWORK' && item.sourceId === Number(pathname.split('/').pop()));
  else if (pathname === '/api/grades' && method === 'POST') {
    teacher(role);
    const lesson = d.lessons.find((item) => item.id === body?.sourceId);
    if (!lesson || body?.sourceType !== 'LESSON') fail('Выберите урок');
    if (studentGrades(body.studentProfileId).filter((item) => item.sourceId === lesson.id && item.sourceType === 'LESSON').length >= 3) fail('Не больше трёх оценок за урок');
    if (![2, 3, 4, 5].includes(Number(body.scaleCode))) fail('Выберите оценку', 400);
    result = { ...body, id: d.nextId++, academicYearId: 1, academicPeriodId: 2, subjectId: lesson.subjectId, numericValue: Number(body.scaleCode), weight: 1, deleted: false, createdAt: now(), updatedAt: now(), publishedAt: now() };
    d.grades.push(result); notify('Новая оценка', `${lesson.subjectName}: ${result.scaleCode}`);
  }
  else if (/^\/api\/grades\/\d+(\/history)?$/.test(pathname)) {
    const id = Number(pathname.split('/')[3]);
    const grade = d.grades.find((item) => item.id === id);
    if (!grade) fail('Оценка не найдена', 404);
    if (get) result = [];
    else { teacher(role); if (method === 'DELETE') grade.deleted = true;
      else { if (![2, 3, 4, 5].includes(Number(body?.scaleCode))) fail('Выберите оценку', 400); Object.assign(grade, body, { numericValue: Number(body.scaleCode), updatedAt: now() }); }
      result = grade;
    }
  }
  else if (pathname === '/api/gradebook/context' && get) result = { academicYear: d.year, periods: [d.period], scopes: [{ classId: 11, className: '7А', subjectId: 21, subjectName: 'Математика' }, { classId: 11, className: '7А', subjectId: 22, subjectName: 'Физика' }, { classId: 12, className: '5Б', subjectId: 21, subjectName: 'Математика' }] };
  else if (pathname === '/api/gradebook/my/diary' && get) result = { studentProfileId: student.studentProfileId, dateFrom: params.get('dateFrom'), dateTo: params.get('dateTo'), entries: studentGrades(student.studentProfileId).map((grade) => ({ grade, subjectId: grade.subjectId, academicPeriodId: 2, lessonId: grade.sourceType === 'LESSON' ? grade.sourceId : null, homeworkId: grade.sourceType === 'HOMEWORK' ? grade.sourceId : null, date: d.lessons.find((item) => item.id === grade.sourceId)?.date || d.today })).filter((item) => (!params.get('dateFrom') || item.date >= params.get('dateFrom')) && (!params.get('dateTo') || item.date <= params.get('dateTo'))) };
  else if (/^\/api\/gradebook\/students\/\d+$/.test(pathname) && get) { const id = Number(pathname.split('/').pop()); const subjectId = Number(params.get('subjectId')); const grades = studentGrades(id, subjectId); result = { studentProfileId: id, studentName: STUDENTS.find((item) => item.studentProfileId === id)?.fullName, subjectId, academicPeriodId: 2, average: average(grades), events: grades.map((grade) => ({ grade, type: grade.sourceType, sourceId: grade.sourceId, lessonId: grade.sourceId, date: d.lessons.find((item) => item.id === grade.sourceId)?.date || d.today, title: 'Работа на уроке' })), result: null }; }
  else if (pathname === '/api/gradebook/journal' && get) {
    const classId = Number(params.get('classId')) || 11; const subjectId = Number(params.get('subjectId')) || 21;
    const columns = d.lessons.filter((item) => item.classId === classId && item.subjectId === subjectId).map((item) => ({ key: `LESSON:${item.id}`, type: 'LESSON', sourceId: item.id, lessonId: item.id, date: item.date, startTime: item.startTime, lessonNumber: item.lessonNumber, title: item.topic, active: true }));
    result = { classId, period: { ...d.period, windowFrom: d.period.startDate, windowTo: d.period.endDate }, availableSubgroups: [], columns,
      rows: STUDENTS.filter((item) => item.classId === classId).map((item) => { const grades = studentGrades(item.studentProfileId, subjectId); const avg = average(grades); return { studentProfileId: item.studentProfileId, studentName: item.fullName, currentMember: true, average: { value: avg.average, count: avg.count, visibleCount: avg.count }, cells: columns.map((column) => ({ columnKey: column.key, grades: grades.filter((grade) => grade.sourceId === column.sourceId && grade.sourceType === column.type) })) }; }) };
  }
  else if (pathname === '/api/final-grades/my' && get) result = { academicYearId: 1, studentProfileId: student.studentProfileId, periods: [d.period], subjects: SUBJECTS.map((item) => ({ subjectId: item.id, subjectName: item.name, periodValues: {}, yearValue: null })) };
  else if (pathname === '/api/final-grades/class' && get) result = { academicYearId: 1, academicPeriodId: 2, classId: Number(params.get('classId')), subjectId: Number(params.get('subjectId')), canManage: false, publicationOpen: false, allowedValues: [2, 3, 4, 5], rows: STUDENTS.filter((item) => item.classId === Number(params.get('classId'))).map((item) => ({ studentProfileId: item.studentProfileId, studentName: item.fullName, currentMember: true, finalGrade: null })) };
  else if (pathname === '/api/attendance/my-marks' && get) result = d.lessons.filter((lesson) => lesson.classId === student.classId && (!params.get('dateFrom') || lesson.date >= params.get('dateFrom')) && (!params.get('dateTo') || lesson.date <= params.get('dateTo'))).flatMap((lesson) => { const mark = sheet(lesson).entries.find((item) => item.studentProfileId === student.studentProfileId)?.published; return mark ? [{ lessonId: lesson.id, studentProfileId: student.studentProfileId, attendance: mark, lessonDate: lesson.date }] : []; });
  else if (pathname === '/api/attendance/states' && get) result = d.lessons.map((item) => ({ lessonId: item.id, state: sheet(item).state, reminder: sheet(item).reminder }));
  else if (pathname === '/api/attendance/summary' && get) {
    const lessons = d.lessons.filter((item) => item.classId === student.classId && item.date.startsWith(params.get('month') || d.today.slice(0, 7))).map((item) => ({ lessonId: item.id, lessonDate: item.date, startTime: item.startTime, endTime: item.endTime, subjectName: item.subjectName, lessonStatus: 'ACTIVE', published: Boolean(sheet(item).publishedAt), attendance: sheet(item).entries.find((entry) => entry.studentProfileId === student.studentProfileId)?.published || null }));
    result = { month: params.get('month') || d.today.slice(0, 7), studentProfileId: student.studentProfileId, academicYear: d.year, lessons,
      attendedCount: lessons.filter((item) => item.attendance?.status === 'PRESENT' && !item.attendance?.mark).length, missedCount: lessons.filter((item) => item.attendance?.status === 'ABSENT' && item.attendance?.mark !== 'EXCUSED').length, lateCount: lessons.filter((item) => item.attendance?.mark === 'LATE').length, excusedCount: lessons.filter((item) => item.attendance?.mark === 'EXCUSED').length };
  }
  else if (pathname === '/api/attendance/teacher-journal/options' && get) result = { academicYear: d.year, scopes: [{ classId: 11, className: '7А' }, { classId: 12, className: '5Б' }] };
  else if (pathname === '/api/attendance/teacher-journal' && get) result = { month: params.get('month'), students: STUDENTS.filter((item) => item.classId === Number(params.get('classId'))), lessons: d.lessons.filter((item) => item.classId === Number(params.get('classId'))).map((item) => ({ ...item, lessonId: item.id, lessonDate: item.date, state: sheet(item).state, totalCount: sheet(item).totalCount, markedCount: sheet(item).markedCount, entries: sheet(item).entries.map((entry) => ({ studentProfileId: entry.studentProfileId, attendance: entry.published })) })) };
  else if (pathname === '/api/notifications/unread-count' && get) result = { count: d.notifications.filter((item) => item.roles.includes(role) && !item.read).length };
  else if (pathname === '/api/notifications' && get) { const items = d.notifications.filter((item) => item.roles.includes(role)); result = { items, hasMore: false, unreadCount: items.filter((item) => !item.read).length }; }
  else if (pathname === '/api/notifications/read-all' && method === 'POST') { d.notifications.filter((item) => item.roles.includes(role)).forEach((item) => { item.read = true; }); result = null; }
  else if (/^\/api\/notifications\/[^/]+\/read$/.test(pathname) && method === 'POST') { const item = d.notifications.find((entry) => entry.id === pathname.split('/')[3] && entry.roles.includes(role)); if (item) item.read = true; result = null; }
  else if (get && ['/api/me/keys', '/api/me/equipment', '/api/grade-corrections/my', '/api/surveys/my', '/api/homework-groups'].includes(pathname)) result = [];
  else if (/^\/api\/monthly-feedback\/children\/\d+\/months$/.test(pathname) && get) result = [];
  else if (/^\/api\/monthly-feedback\/children\/\d+\/months\/\d{4}-\d{2}$/.test(pathname) && get) result = { childId: student.studentProfileId, month: pathname.split('/').pop(), subjects: [], coverage: { expectedSubjects: 2, publishedSubjects: 0, partial: true, pendingSubjectNames: SUBJECTS.map((item) => item.name) }, analysis: null };
  else if (/^\/api\/parent-comments\/children\/\d+$/.test(pathname) && get) result = { comments: [], subjects: [], hasMore: false, unreadCount: 0, page: 0 };
  if (result === undefined) fail('Это действие пока недоступно в демо. Попробуйте расписание, задания, посещаемость или оценки.', 422, 'DEMO_UNSUPPORTED');
  return copy(result);
}
