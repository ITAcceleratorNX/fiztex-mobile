import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { COMMENT } from '@shared/theme/tokens';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { ScreenHeader, StateView, OutlineButton } from '@shared/components/ui';
import { ChildSwitcherPill, ChildPickerSheet } from '@shared/ui/childSwitcher';
import { CommentDialog, TeacherCommentCard } from '@shared/ui/comments';
import { useParentChildren } from '@shared/hooks/useSchedule';
import { useSelectedChild } from '@shared/state/SelectedChild';
import { useChildParentComments } from '@shared/hooks/useParentComments';
import { useAuth } from '@features/auth/AuthContext';

function dateLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function ParentTeacherCommentsScreen({ nav }) {
  const { token } = useAuth();
  const { children, loading, error, reload } = useParentChildren();
  const { childId, setChildId } = useSelectedChild(children);
  const [picker, setPicker] = useState(false);
  const child = children.find(item => item.id === childId);
  const switcher = child ? <ChildSwitcherPill child={child} index={children.indexOf(child)} canSwitch={children.length > 1} onPress={() => setPicker(true)} /> : null;
  return <>
    {childId ? <CommentList key={`${token}:${childId}`} childId={childId} nav={nav} switcher={switcher} /> :
      <Screen><ScreenHeader title="Комментарии учителей" back={() => nav?.back?.()} />
        <StateView title={loading ? 'Загрузка…' : error || 'Дети не привязаны'} actionLabel={error ? 'Повторить' : undefined} onAction={reload} />
      </Screen>}
    <ChildPickerSheet visible={picker} items={children} selectedId={childId} onSelect={id => { setChildId(id); setPicker(false); }} onClose={() => setPicker(false)} />
  </>;
}

function CommentList({ childId, nav, switcher }) {
  const { c } = useTheme();
  const [subjectId, setSubjectId] = useState(null);
  const [page, setPage] = useState(0);
  const [all, setAll] = useState([]);
  const [selected, setSelected] = useState(null);
  const [readError, setReadError] = useState(null);
  const mounted = useRef(true);
  const openSequence = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const comments = useChildParentComments(childId, subjectId, page);
  const { data, loading, error, reload, markRead } = comments;
  useEffect(() => {
    if (!data) return;
    setAll(previous => {
      const items = page === 0 ? [] : previous;
      const merged = new Map(items.map(item => [item.id, item]));
      (data.comments || []).forEach(item => merged.set(item.id, item));
      return [...merged.values()];
    });
  }, [data, page]);
  function filter(id) { setAll([]); setSelected(null); setSubjectId(id); setPage(0); }
  async function open(comment) {
    const sequence = ++openSequence.current;
    setSelected(comment); setReadError(null);
    if (!comment.unread) return;
    try {
      await markRead(comment);
      if (!mounted.current) return;
      setAll(previous => previous.map(item => item.id === comment.id && item.version === comment.version ? { ...item, unread: false } : item));
      if (openSequence.current === sequence) setSelected(previous => previous?.id === comment.id ? { ...previous, unread: false } : previous);
    } catch { if (mounted.current && openSequence.current === sequence) setReadError('Не удалось сохранить комментарий'); }
  }
  const rows = all;
  return <Screen refreshing={loading && rows.length > 0} onRefresh={() => { if (page !== 0) { setAll([]); setPage(0); } else void reload(true); }}
    contentStyle={{ padding: COMMENT.gutter, gap: COMMENT.actionGap }}>
    <ScreenHeader title="Комментарии учителей" back={() => nav?.back?.()} />
    {switcher}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: COMMENT.gap }}>
      <OutlineButton onPress={() => filter(null)} style={{ backgroundColor: subjectId == null ? c.blueSoft : c.surface }}>Все</OutlineButton>
      {(data?.subjects || []).map(subject => <OutlineButton key={subject.id} onPress={() => filter(subject.id)}
        style={{ backgroundColor: subjectId === subject.id ? c.blueSoft : c.surface }}>{subject.name}</OutlineButton>)}
    </ScrollView>
    {error ? <StateView icon="alert" title={error} actionLabel="Повторить" onAction={() => reload()} /> : null}
    {loading && !rows.length ? <StateView title="Загрузка…" /> : !error && !rows.length ? <StateView icon="message" title="Комментариев пока нет" /> : null}
    {rows.map((comment, index) => {
      const group = new Date(comment.updatedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      const previous = index ? new Date(rows[index - 1].updatedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : null;
      return <View key={comment.id} style={{ gap: COMMENT.gap }}>
        {group !== previous ? <Txt style={{ fontSize: COMMENT.labelSize, color: c.ink3 }}>{group}</Txt> : null}
        <TeacherCommentCard comment={comment} dateLabel={dateLabel(comment.lessonDate)} onPress={() => void open(comment)} />
      </View>;
    })}
    {data?.hasMore ? <OutlineButton disabled={loading} onPress={() => setPage(previous => previous + 1)}>Показать ещё</OutlineButton> : null}
    {selected ? <CommentDialog title={selected.subjectName} subtitle={dateLabel(selected.lessonDate)} onClose={() => setSelected(null)}>
      <TeacherCommentCard comment={selected} dateLabel={dateLabel(selected.lessonDate)} expanded />
      {selected.updated ? <Txt style={{ color: c.ink3, fontSize: COMMENT.captionSize }}>Обновлено · {new Date(selected.updatedAt).toLocaleString('ru-RU')}</Txt> : null}
      {readError ? <OutlineButton onPress={() => void open(selected)}>Повторить</OutlineButton> : null}
    </CommentDialog> : null}
  </Screen>;
}
