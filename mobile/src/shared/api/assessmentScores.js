/**
 * Ввод баллов СОР/СОЧ (ТЗ Frontend «СОР/СОЧ», Mobile; то же правило, что в журнале веба —
 * `fiztex-web/src/lib/journalScoresModel.ts`). Правки копятся черновиками и уходят одним действием
 * «Сохранить баллы». Здесь только проверка ввода и сборка списка изменений: допустимость (права,
 * период, максимум) решает сервер. Пустое поле — «не менять», ноль — результат.
 */

export const draftKey = (workId, studentProfileId) => `${workId}:${studentProfileId}`;

/** Что не так с введённым текстом; `null` — допустимо или поле пусто. */
export function scoreDraftProblem(text, maxScore) {
  const value = String(text ?? '').trim();
  if (value === '') return null;
  if (!/^-?\d+$/.test(value)) return 'Только целое число';
  const number = Number(value);
  if (number < 0) return 'Не меньше 0';
  if (number > maxScore) return `Не больше ${maxScore}`;
  return null;
}

/**
 * Изменения из черновиков. Совпавший с сохранённым балл и пустое поле изменением не считаются;
 * ошибочные черновики попадают в `invalid` и блокируют сохранение.
 *
 * @param {Map<number, {score:number|null, version:number|null}>} students  по studentProfileId
 */
export function collectChanges(drafts, { workId, kind, maxScore, students }) {
  const changes = [];
  const invalid = [];
  for (const [studentId, text] of drafts) {
    if (scoreDraftProblem(text, maxScore)) {
      invalid.push(studentId);
      continue;
    }
    if (String(text).trim() === '') continue;
    const current = students.get(studentId);
    const score = Number(String(text).trim());
    if (current?.score === score) continue;
    changes.push({
      workId,
      kind,
      studentProfileId: studentId,
      score,
      before: current?.score ?? null,
      version: current?.version ?? null,
    });
  }
  return { changes, invalid };
}

/** Исправление выставленного СОЧ требует причину. */
export function needsReason(changes) {
  return changes.some((change) => change.kind === 'SOCH' && change.before != null);
}

/** Не меньше трёх букв или цифр — то же правило проверяет сервер. */
export function hasMeaningfulReason(reason) {
  let signs = 0;
  for (const char of String(reason ?? '')) {
    if (/[\p{L}\p{N}]/u.test(char)) signs += 1;
    if (signs >= 3) return true;
  }
  return false;
}

function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/** Текст панели: «Изменено 3 балла · ещё не сохранены» (макет D14/D15/D17). */
export function barMessage(changes, invalidCount) {
  if (invalidCount > 0) return 'Исправьте ошибку, чтобы сохранить';
  if (changes.length === 0) return null;
  const n = changes.length;
  const head = n === 1 ? 'Изменён 1 балл' : `Изменено ${n} ${plural(n, ['балл', 'балла', 'баллов'])}`;
  return changes.some((change) => change.before != null)
    ? `${head} · исправление попадёт в историю`
    : `${head} · ещё не сохранены`;
}

/** Лист результатов с сервера в карту по ученику. */
export function mapSheet(raw) {
  const work = raw?.work ?? {};
  return {
    workId: work.id ?? null,
    kind: work.kind ?? 'SOR',
    title: work.kind === 'SOCH' ? 'СОЧ' : work.number != null ? `СОР ${work.number}` : 'СОР',
    maxScore: work.maxScore ?? 0,
    canManage: raw?.canManage === true,
    canCorrect: raw?.canCorrect === true,
    students: (raw?.students ?? []).map((row) => ({
      studentProfileId: row.studentProfileId,
      name: row.studentName,
      score: row.score ?? null,
      version: row.version ?? null,
      inAudience: row.inAudience !== false,
    })),
  };
}
