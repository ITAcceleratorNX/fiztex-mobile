import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { Banner, Card, FilledButton, OutlineButton } from '@shared/components/ui';
import { homeworkAiApi, newIdempotencyKey } from '@shared/api/homeworkAiApi';
import { gradesApi } from '@shared/api/gradesApi';

/** AI-черновик существует только для текущей фото-отправки; обычная проверка независима. */
export function TeacherPhotoAiReview({
  token, homeworkId, studentProfileId, attemptId, canTransfer, onDraft,
}) {
  const { c } = useTheme();
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [grade, setGrade] = useState('');
  const [comment, setComment] = useState('');
  const [mode, setMode] = useState(null);
  const [scale, setScale] = useState([]);
  const [currentGrade, setCurrentGrade] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const restoredAt = useRef(null);

  const showResult = useCallback((next) => {
    setResult(next);
    if (!next) return;
    setRecognizedText(next.teacherRecognizedText ?? next.recognizedText ?? '');
    setGrade(String(next.teacherGrade ?? next.suggestedGrade ?? ''));
    setComment(next.teacherComment ?? next.suggestedComment ?? '');
    setDirty(false);
    if (next.teacherConfirmedAt && restoredAt.current !== next.teacherConfirmedAt) {
      restoredAt.current = next.teacherConfirmedAt;
      onDraft?.(next.teacherComment ?? '');
    }
  }, [onDraft]);

  useEffect(() => {
    if (!token || !homeworkId || !studentProfileId || !attemptId) return;
    let active = true;
    setJob(null);
    setResult(null);
    setError(null);
    restoredAt.current = null;
    Promise.all([
      homeworkAiApi.lastGradeSuggestion(token, homeworkId, studentProfileId),
      homeworkAiApi.recommendation(token, homeworkId, studentProfileId),
    ]).then(([nextJob, nextResult]) => {
      if (!active) return;
      setJob(nextJob);
      showResult(nextResult);
    }).catch((caught) => {
      if (active) setError(caught?.message || 'Не удалось загрузить AI-проверку');
    });
    Promise.all([
      gradesApi.homeworkValueMode(token, homeworkId),
      gradesApi.homeworkGrades(token, homeworkId),
      gradesApi.scale(token),
    ]).then(([nextMode, grades, nextScale]) => {
      if (!active) return;
      setMode(nextMode);
      setScale(Array.isArray(nextScale) ? nextScale : []);
      setCurrentGrade((grades ?? []).find(
        (row) => row.studentProfileId === studentProfileId && !row.deleted,
      ) ?? null);
    }).catch(() => { /* Оценку можно выставить вручную в журнале; AI остаётся доступен. */ });
    return () => { active = false; };
  }, [token, homeworkId, studentProfileId, attemptId, showResult]);

  useEffect(() => {
    if (!job?.id || !['PENDING', 'RUNNING'].includes(job.status)) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const next = await homeworkAiApi.job(token, job.id);
        if (!active) return;
        setJob(next);
        if (next.status === 'DONE') {
          showResult(await homeworkAiApi.recommendation(token, homeworkId, studentProfileId));
        }
      } catch (caught) {
        if (active) setError(caught?.message || 'Не удалось получить результат AI');
      }
    }, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [job?.id, job?.status, token, homeworkId, studentProfileId, showResult]);

  const runAi = async () => {
    if (busy || ['PENDING', 'RUNNING'].includes(job?.status)) return;
    setBusy(true);
    setError(null);
    try {
      const started = await homeworkAiApi.suggestGrades(
        token, homeworkId, studentProfileId, newIdempotencyKey());
      setJob(started);
      if (started.status === 'DONE') {
        showResult(await homeworkAiApi.recommendation(token, homeworkId, studentProfileId));
      }
    } catch (caught) {
      setError(caught?.message || 'AI недоступен. Проверьте работу вручную.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    const numericGrade = grade === '' ? null : Number(grade);
    if (numericGrade != null && (!Number.isInteger(numericGrade) || numericGrade < 1 || numericGrade > 10)) {
      setError('Оценка должна быть целым числом от 1 до 10');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await homeworkAiApi.confirmPhotoReview(token, homeworkId, studentProfileId, {
        expectedAttemptId: attemptId, recognizedText,
        grade: numericGrade, comment: comment.slice(0, 2000),
      });
      showResult(saved);
    } catch (caught) {
      setError(caught?.message || 'Не удалось сохранить AI-черновик');
    } finally {
      setBusy(false);
    }
  };

  const saveGrade = async (value) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await gradesApi.setHomeworkGrade(
        token, homeworkId, studentProfileId, currentGrade?.id,
        value,
      );
      setCurrentGrade(saved);
    } catch (caught) {
      setError(caught?.message || 'Не удалось выставить оценку');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 10,
    color: c.ink, backgroundColor: c.bg, textAlignVertical: 'top',
  };
  const running = ['PENDING', 'RUNNING'].includes(job?.status);
  const confirmed = Boolean(result?.teacherConfirmedAt) && !dirty;

  return (
    <Card elevated style={{ gap: 10 }}>
      <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>AI-проверка фото-работы</Txt>
      <Txt style={{ fontSize: 12, color: c.ink3 }}>
        AI читает все фото как одну работу. Оценку и решение подтверждаете вы.
      </Txt>
      <OutlineButton onPress={runAi} disabled={busy || running}>
        {running ? 'Проверяю работу…' : 'Проверить с AI'}
      </OutlineButton>
      {job?.status === 'FAILED' ? (
        <Banner icon="alertTriangle" tone="soft">
          AI не обработал работу. Обычная проверка доступна ниже.
        </Banner>
      ) : null}
      {error ? <Banner icon="alertTriangle" tone="soft">{error}</Banner> : null}

      {result?.basis === 'COMPLETENESS' ? (
        <View style={{ gap: 10 }}>
          <Txt style={{ color: c.ink }}>Выполнено на {result.percent ?? 0}%.
            {' '}Предварительно: {result.suggestedGrade ?? '—'}/10.</Txt>
          {result.summary ? <Txt style={{ color: c.ink }}>{result.summary}</Txt> : null}
          {(result.strengths ?? []).map((item, index) => (
            <Txt key={`strength-${index}`} style={{ color: c.ink }}>✓ {item}</Txt>
          ))}
          {(result.issues ?? []).map((item, index) => (
            <Txt key={`issue-${index}`} style={{ color: c.ink }}>• {item}</Txt>
          ))}
          {(result.uncertainFragments ?? []).map((item, index) => (
            <Txt key={`uncertain-${index}`} style={{ color: c.ink }}>Проверьте по фото: {item}</Txt>
          ))}
          <Txt style={{ color: c.ink }}>Распознанный текст и формулы</Txt>
          <TextInput multiline value={recognizedText} onChangeText={(value) => {
            setRecognizedText(value); setDirty(true);
          }}
            style={[inputStyle, { minHeight: 130 }]} />
          <Txt style={{ fontSize: 11, color: c.ink3 }}>
            Исправление текста не пересчитывает рекомендацию AI. Сверьте фото и измените оценку сами.
          </Txt>
          <Txt style={{ color: c.ink }}>Оценка 1–10</Txt>
          <TextInput value={grade} onChangeText={(value) => { setGrade(value); setDirty(true); }} keyboardType="number-pad"
            style={inputStyle} />
          <Txt style={{ color: c.ink }}>Комментарий ученику</Txt>
          <TextInput multiline value={comment} onChangeText={(value) => { setComment(value); setDirty(true); }} maxLength={2000}
            style={[inputStyle, { minHeight: 80 }]} />
          {canTransfer ? (
            <FilledButton onPress={confirm} disabled={busy}>
              {busy ? 'Сохраняю…' : 'Передать в проверку ДЗ'}
            </FilledButton>
          ) : (
            <Txt style={{ fontSize: 11, color: c.ink3 }}>
              Работа уже проверена. Передать комментарий можно для следующей отправки.
            </Txt>
          )}
          {confirmed ? (
            <View style={{ gap: 8 }}>
              <Txt style={{ fontSize: 12, color: c.ink3 }}>
                Черновик сохранён. Комментарий передан в форму проверки; оценка ещё не выставлена.
              </Txt>
              {mode?.valueMode === 'POINTS' && result.teacherGrade != null ? (
                <OutlineButton disabled={busy} onPress={() => saveGrade({
                  score: result.teacherGrade, maxScore: 10,
                })}>
                  Выставить {result.teacherGrade}/10 отдельно
                </OutlineButton>
              ) : null}
              {mode?.valueMode === 'SCALE' && scale.map((item) => (
                <OutlineButton key={item.code} disabled={busy}
                  onPress={() => saveGrade({ scaleCode: item.code })}>
                  Выставить по шкале: {item.code}
                </OutlineButton>
              ))}
              {!mode && <Txt style={{ fontSize: 11, color: c.ink3 }}>
                Режим оценивания не загрузился. Выставьте оценку вручную в журнале.
              </Txt>}
              {currentGrade ? <Txt style={{ fontSize: 12, color: c.ink3 }}>
                Текущая оценка в журнале: {currentGrade.scaleCode ?? currentGrade.score ?? '—'}
              </Txt> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
