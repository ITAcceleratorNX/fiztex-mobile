import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@features/auth/AuthContext';
import { useTheme } from '@shared/theme/ThemeContext';
import { COMMENT } from '@shared/theme/tokens';
import { Txt } from '@shared/components/Txt';
import { FilledButton, OutlineButton, ConfirmDialog } from '@shared/components/ui';
import { CommentDialog, CommentTextField } from '@shared/ui/comments';
import { parentCommentsApi } from '@shared/api/parentCommentsApi';

export function ParentCommentEditor({ lessonId, row, lesson, onClose, onSaved }) {
  const { c } = useTheme();
  const { token } = useAuth();
  const [saved, setSaved] = useState(row.comment);
  const [text, setText] = useState(row.comment?.text || '');
  const [editing, setEditing] = useState(!row.comment);
  const [original, setOriginal] = useState(null);
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [discard, setDiscard] = useState(false);
  const context = useRef(null);
  const current = `${token}:${lessonId}:${row.studentProfileId}`;
  context.current = current;
  const mounted = useRef(true);
  const running = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const isCurrent = (started) => mounted.current && context.current === started;
  const dirty = text !== (saved?.text || '');
  function close() {
    if (running.current) return;
    if (editing && dirty) setDiscard(true); else onClose();
  }
  async function generate() {
    if (running.current || !text.trim()) return;
    const started = current;
    const source = text;
    running.current = true; setBusy('ai'); setError(null);
    try {
      const result = await parentCommentsApi.improve(token, lessonId, row.studentProfileId, source);
      if (!isCurrent(started)) return;
      setOriginal(prev => prev ?? source); setText(result.text); setAi(true);
    } catch (e) {
      if (isCurrent(started)) setError(e?.status === 429 ? e.message : 'Не удалось улучшить текст. Попробуйте ещё раз');
    } finally { running.current = false; if (isCurrent(started)) setBusy(null); }
  }
  async function publish() {
    if (running.current || !text.trim() || !row.canEdit || conflict) return;
    const started = current;
    running.current = true; setBusy('save'); setError(null);
    try {
      const result = await parentCommentsApi.publish(token, lessonId, row.studentProfileId, text.trim(), saved?.version);
      if (!isCurrent(started)) return;
      setSaved(result); setText(result.text); setEditing(false); setOriginal(null); setAi(false);
      void onSaved();
    } catch (e) {
      if (!isCurrent(started)) return;
      setConflict(e?.status === 409);
      setError(e?.status === 409 ? e.message : 'Не удалось сохранить комментарий');
    } finally { running.current = false; if (isCurrent(started)) setBusy(null); }
  }
  const label = ['Комментарий для родителя', lesson?.subject, lesson?.date].filter(Boolean).join(' · ');
  return <>
    <CommentDialog title={row.fullName} subtitle="Ученик не видит этот комментарий" subtitleIcon="eyeOff" onClose={close} busy={Boolean(busy)}
      footer={editing ? <View style={{ flexDirection: 'row', gap: COMMENT.actionGap }}>
        <OutlineButton size="lg" style={{ flex: 1 }} disabled={Boolean(busy) || !text.trim() || conflict} onPress={generate}>✦ Улучшить с AI</OutlineButton>
        <FilledButton size="lg" style={{ flex: 1 }} disabled={Boolean(busy) || !text.trim() || conflict || !row.canEdit || (Boolean(saved) && !dirty)} onPress={publish}>
          {busy === 'save' ? 'Сохраняем…' : saved ? 'Сохранить' : 'Опубликовать'}
        </FilledButton>
      </View> : row.canEdit ? <OutlineButton size="lg" onPress={() => setEditing(true)}>Редактировать</OutlineButton> : null}>
      {saved ? <Txt style={{ color: c.markPresent, fontSize: COMMENT.captionSize }}>Опубликован{saved.updated ? ' · Обновлено' : ''}</Txt> : null}
      <CommentTextField label={label} value={text} onChange={setText} disabled={Boolean(busy)} generating={busy === 'ai'} aiGenerated={ai} readOnly={!editing} />
      {editing && original != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: COMMENT.gap }}>
        <OutlineButton disabled={Boolean(busy)} onPress={() => { setText(original); setOriginal(null); setAi(false); }}>Вернуть мой текст</OutlineButton>
        <OutlineButton disabled={Boolean(busy)} onPress={generate}>Ещё вариант</OutlineButton>
      </View> : null}
      {error ? <View style={{ gap: COMMENT.gap }}><Txt accessibilityRole="alert" style={{ color: c.red }}>{error}</Txt>
        {conflict ? <OutlineButton onPress={async () => { await onSaved(); onClose(); }}>Обновить комментарий</OutlineButton> : null}
      </View> : null}
    </CommentDialog>
    <ConfirmDialog visible={discard} title="Закрыть без сохранения?" message="Введённый текст не сохранён."
      confirmLabel="Закрыть" cancelLabel="Продолжить редактирование" onCancel={() => setDiscard(false)} onConfirm={onClose} />
  </>;
}
