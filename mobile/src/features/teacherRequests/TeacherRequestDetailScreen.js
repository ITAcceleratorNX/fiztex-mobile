import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@features/auth/AuthContext';
import { teacherRequestsApi } from '@shared/api/teacherRequestsApi';
import { Screen } from '@shared/components/Screen';
import { Banner, Card, ConfirmDialog, OutlineButton, Pill, ScreenHeader } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { daysInPeriod, fileError, periodLabel, REQUEST_STATUS, REQUEST_TYPES } from './model';

function eventLabel(event) {
  const labels = {
    CREATED: 'Заявка отправлена',
    UPDATED: 'Заявка изменена',
    CANCELLED: 'Заявка отменена',
    APPROVED: 'Заявка согласована',
    REJECTED: 'Заявка отклонена',
    DOCUMENT_ADDED: 'Документ добавлен',
    DOCUMENT_REMOVED: 'Документ удалён',
  };
  return labels[event.action] || event.description || 'Обновление заявки';
}

function dayWord(days) {
  if (days % 10 === 1 && days % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) return 'дня';
  return 'дней';
}

function RequestSection({ title, children }) {
  return (
    <Card style={{ gap: 14, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt style={{ fontSize: 17, fontWeight: '700' }}>{title}</Txt>
      </View>
      {children}
    </Card>
  );
}

export function TeacherRequestDetailScreen({ navigation, route }) {
  const { token } = useAuth();
  const { c } = useTheme();
  const requestId = route.params?.requestId ?? route.params?.payload?.requestId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    if (!token || requestId == null) return;
    const current = ++sequence.current;
    setLoading(true);
    setError(false);
    try {
      const result = await teacherRequestsApi.get(token, requestId);
      if (current === sequence.current) setData(result);
    } catch (e) {
      if (current === sequence.current) { setError(true); setData(null); }
    } finally { if (current === sequence.current) setLoading(false); }
  }, [token, requestId]);

  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [load]);

  const cancel = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      setData(await teacherRequestsApi.cancel(token, requestId));
      setConfirmCancel(false);
    } catch (e) {
      Alert.alert('Не удалось отменить', e?.message || 'Обновите заявку и попробуйте снова.');
      await load();
    } finally { setBusy(false); }
  }, [busy, load, requestId, token]);

  const upload = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const file = { uri: asset.uri, name: asset.name, type: asset.mimeType, sizeBytes: asset.size, file: asset.file };
    const validation = fileError(file);
    if (validation) { Alert.alert('Файл не подходит', validation); return; }
    setBusy(true);
    try { await teacherRequestsApi.upload(token, requestId, file); await load(); }
    catch (e) { Alert.alert('Не удалось загрузить документ', e?.message || 'Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  }, [load, requestId, token]);

  const remove = useCallback((documentId) => Alert.alert('Удалить документ?', 'Это действие нельзя отменить.', [
    { text: 'Оставить', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await teacherRequestsApi.removeDocument(token, requestId, documentId); await load(); }
      catch (e) { Alert.alert('Не удалось удалить файл', e?.message || 'Обновите карточку и попробуйте снова.'); await load(); }
      finally { setBusy(false); }
    } },
  ]), [load, requestId, token]);

  if (loading) return <Screen scroll={false}><ActivityIndicator color={c.blue} style={{ flex: 1 }} /></Screen>;
  if (error || !data) return (
    <Screen>
      <ScreenHeader title="Заявка" back={() => navigation.goBack()} />
      <Card style={{ margin: 20, alignItems: 'center', gap: 10 }}>
        <Icon name="alertTriangle" size={28} color={c.red} />
        <Txt style={{ color: c.red, textAlign: 'center' }}>Не удалось загрузить заявку</Txt>
        <Pressable accessibilityRole="button" onPress={load} style={{ padding: 12 }}><Txt style={{ color: c.blue, fontWeight: '700' }}>Повторить</Txt></Pressable>
      </Card>
    </Screen>
  );

  const status = REQUEST_STATUS[data.status] || REQUEST_STATUS.PENDING;
  const actions = data.availableActions || [];
  const canEdit = actions.includes('EDIT');
  const canCancel = actions.includes('CANCEL');
  const canUpload = actions.includes('UPLOAD_DOCUMENT');
  const canDelete = data.status === 'PENDING';
  const dayCount = daysInPeriod(data.dateFrom, data.dateTo);
  const sentDate = data.createdAt ? new Date(data.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const approvedNotice = data.status === 'APPROVED'
    ? 'Заявка согласована. Документы можно добавлять в любой момент.'
    : data.status === 'CANCELLED'
      ? 'Заявка отменена и перенесена в историю.'
      : null;

  return (
    <Screen onRefresh={load} refreshing={loading} contentStyle={{ paddingBottom: 24 }}>
      <ScreenHeader title="Заявка" back={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <View style={{ gap: 10, paddingTop: 2, paddingBottom: 4 }}>
          <Txt style={{ fontSize: 25, lineHeight: 31, fontWeight: '700', letterSpacing: -0.4 }}>{REQUEST_TYPES[data.type] || 'Заявка'}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Pill color={status.tone}>{status.label}</Pill>
            <Txt style={{ fontSize: 14, fontWeight: '600' }}>{periodLabel(data.dateFrom, data.dateTo)}</Txt>
            <Txt style={{ fontSize: 13, color: c.ink3 }}>{dayCount} {dayWord(dayCount)}</Txt>
          </View>
        </View>

        {approvedNotice ? <Banner icon={data.status === 'APPROVED' ? 'lock' : 'info'} tone="info">{approvedNotice}</Banner> : null}

        <RequestSection title="Причина">
          <Txt style={{ fontSize: 15, lineHeight: 22, color: c.ink2 }}>{data.reason}</Txt>
          {data.status === 'REJECTED' && data.rejectionReason ? (
            <View style={{ padding: 14, borderRadius: 12, backgroundColor: c.redSoft, gap: 5 }}>
              <Txt style={{ color: c.red, fontWeight: '700' }}>Причина отказа</Txt>
              <Txt style={{ color: c.red, fontSize: 14, lineHeight: 20 }}>{data.rejectionReason}</Txt>
            </View>
          ) : null}
        </RequestSection>

        <RequestSection title="Документы">
          {data.documents?.length ? data.documents.map((doc) => (
            <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: c.border }}>
              <Icon name="fileText" size={19} color={c.ink3} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt numberOfLines={1} style={{ fontSize: 14, fontWeight: '600' }}>{doc.fileName}</Txt>
                {doc.sizeBytes ? <Txt style={{ color: c.ink3, fontSize: 12 }}>{Math.max(1, Math.round(doc.sizeBytes / 1024))} КБ</Txt> : null}
              </View>
              {canDelete ? <Pressable accessibilityRole="button" accessibilityLabel={`Удалить ${doc.fileName}`} onPress={() => remove(doc.id)}><Icon name="x" size={18} color={c.red} /></Pressable> : null}
            </View>
          )) : (
            <Txt style={{ color: c.ink3, fontSize: 14 }}>Документы не приложены</Txt>
          )}
          {canUpload ? <Txt style={{ color: c.ink3, fontSize: 12 }}>PDF, JPG, PNG или HEIC · до 10 МБ</Txt> : null}
        </RequestSection>

        {canEdit || canCancel ? (
          <View style={{ gap: 10, marginTop: 2 }}>
            {canEdit ? <OutlineButton size="lg" icon="pencil" style={{ width: '100%' }} onPress={() => navigation.navigate('teacher-request-form', { requestId })}>Редактировать</OutlineButton> : null}
            {canUpload ? <OutlineButton size="lg" icon="upload" style={{ width: '100%' }} onPress={upload} disabled={busy}>Добавить документ</OutlineButton> : null}
            {canCancel ? <OutlineButton size="lg" style={{ width: '100%', borderColor: c.red }} onPress={() => setConfirmCancel(true)} disabled={busy}><Txt style={{ color: c.red, fontSize: 14, fontWeight: '700' }}>Отменить заявку</Txt></OutlineButton> : null}
          </View>
        ) : canUpload ? (
          <OutlineButton size="lg" icon="upload" style={{ width: '100%' }} onPress={upload} disabled={busy}>Добавить документ</OutlineButton>
        ) : null}

        <RequestSection title="История">
          {data.history?.length ? [...data.history].reverse().map((event, index) => (
            <View key={event.id || `${event.action}-${index}`} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, marginTop: 4, borderRadius: 6, borderWidth: 2, borderColor: event.action === 'CREATED' ? c.green : c.blue, backgroundColor: c.surface }} />
                {index < data.history.length - 1 ? <View style={{ width: 1, flex: 1, minHeight: 22, backgroundColor: c.border, marginTop: 4 }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 8, gap: 3 }}>
                <Txt style={{ fontSize: 14, fontWeight: '600' }}>{eventLabel(event)}</Txt>
                <Txt style={{ color: c.ink3, fontSize: 12 }}>
                  {event.actorName || (event.actorRole === 'TEACHER' ? 'Учитель' : 'Администратор')}
                  {event.createdAt ? ` · ${new Date(event.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                </Txt>
              </View>
            </View>
          )) : <Txt style={{ color: c.ink3, fontSize: 14 }}>Событий пока нет</Txt>}
          <View style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 12, gap: 3 }}>
            <Txt style={{ color: c.ink3, fontSize: 12 }}>Отправлена</Txt>
            <Txt style={{ fontSize: 14, fontWeight: '600' }}>{sentDate}</Txt>
          </View>
        </RequestSection>
      </View>

      <ConfirmDialog
        visible={confirmCancel}
        title="Отменить заявку?"
        message="Заявка перейдёт в историю. Вернуть её будет нельзя."
        cancelLabel="Оставить"
        confirmLabel="Отменить заявку"
        confirmTone="danger"
        busy={busy}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={cancel}
      />
    </Screen>
  );
}
