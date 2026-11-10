import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@features/auth/AuthContext';
import { teacherRequestsApi } from '@shared/api/teacherRequestsApi';
import { Screen } from '@shared/components/Screen';
import { Card, Pill, PrimaryButton, ScreenHeader } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { dateLabel, fileError, periodLabel, REQUEST_STATUS, REQUEST_TYPES } from './model';

function eventLabel(event) {
  const labels = { CREATED: 'Заявка отправлена', UPDATED: 'Данные заявки изменены', CANCELLED: 'Заявка отменена', APPROVED: 'Заявка согласована', REJECTED: 'Заявка отклонена', DOCUMENT_ADDED: 'Добавлен документ', DOCUMENT_REMOVED: 'Документ удалён' };
  return labels[event.action] || event.description || 'Обновление заявки';
}

export function TeacherRequestDetailScreen({ navigation, route }) {
  const { token } = useAuth();
  const { c } = useTheme();
  const requestId = route.params?.requestId ?? route.params?.payload?.requestId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    if (!token || requestId == null) return;
    const current = ++sequence.current;
    setLoading(true); setError(false);
    try { const result = await teacherRequestsApi.get(token, requestId); if (current === sequence.current) setData(result); }
    catch (e) { if (current === sequence.current) { setError(true); setData(null); } }
    finally { if (current === sequence.current) setLoading(false); }
  }, [token, requestId]);
  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [load]);

  const cancel = useCallback(() => Alert.alert('Отменить заявку?', 'Заявка перейдёт в историю. Вернуть её будет нельзя.', [
    { text: 'Оставить', style: 'cancel' },
    { text: 'Отменить заявку', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { setData(await teacherRequestsApi.cancel(token, requestId)); }
      catch (e) { Alert.alert('Не удалось отменить', e?.message || 'Обновите заявку и попробуйте снова.'); await load(); }
      finally { setBusy(false); }
    } },
  ]), [load, requestId, token]);

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
  if (error || !data) return <Screen><ScreenHeader title="Заявка" back={() => navigation.goBack()} /><Card style={{ margin: 16 }}><Txt style={{ color: c.red, textAlign: 'center' }}>Не удалось загрузить заявку</Txt><Pressable onPress={load} style={{ padding: 12 }}><Txt style={{ color: c.blue, textAlign: 'center' }}>Повторить</Txt></Pressable></Card></Screen>;

  const status = REQUEST_STATUS[data.status] || REQUEST_STATUS.PENDING;
  const actions = data.availableActions || [];
  const canEdit = actions.includes('EDIT');
  const canCancel = actions.includes('CANCEL');
  const canUpload = actions.includes('UPLOAD_DOCUMENT');
  const canDelete = data.status === 'PENDING';

  return (
    <Screen onRefresh={load} refreshing={loading} contentStyle={{ paddingBottom: 24 }}>
      <ScreenHeader title="Заявка" back={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><Txt style={{ flex: 1, fontSize: 19, fontWeight: '700' }}>{REQUEST_TYPES[data.type] || data.type}</Txt><Pill color={status.tone}>{status.label}</Pill></View>
          <Txt style={{ color: c.ink2 }}>{periodLabel(data.dateFrom, data.dateTo)}</Txt>
          <View style={{ height: 1, backgroundColor: c.border }} />
          <Txt style={{ color: c.ink3, fontSize: 12 }}>Причина</Txt><Txt style={{ lineHeight: 22 }}>{data.reason}</Txt>
          {data.status === 'REJECTED' && data.rejectionReason ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.redSoft, gap: 6 }}><Txt style={{ color: c.red, fontWeight: '700' }}>Причина отказа</Txt><Txt style={{ color: c.red }}>{data.rejectionReason}</Txt></View> : null}
          {data.decidedAt ? <Txt style={{ color: c.ink3, fontSize: 12 }}>Решение от {dateLabel(data.decidedAt)}</Txt> : null}
        </Card>

        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt style={{ fontSize: 16, fontWeight: '700' }}>Документы</Txt>{canUpload ? <Pressable onPress={upload} disabled={busy}><Icon name="plus" size={20} color={c.blue} /></Pressable> : null}</View>
          {data.documents?.length ? data.documents.map((doc) => (
            <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: c.border }}>
              <Icon name="fileText" size={20} color={c.blue} /><Txt numberOfLines={1} style={{ flex: 1 }}>{doc.fileName}</Txt>
              {canDelete ? <Pressable onPress={() => remove(doc.id)}><Icon name="x" size={18} color={c.red} /></Pressable> : null}
            </View>
          )) : <Txt style={{ color: c.ink3 }}>Документы не приложены</Txt>}
          {canUpload ? <Txt style={{ color: c.ink3, fontSize: 12 }}>PDF, JPG, PNG или HEIC · до 10 МБ</Txt> : null}
        </Card>

        {canEdit || canCancel ? <View style={{ gap: 10 }}>
          {canEdit ? <PrimaryButton color="blue" onPress={() => navigation.navigate('teacher-request-form', { requestId })}>Редактировать</PrimaryButton> : null}
          {canCancel ? <PrimaryButton color="ghost" onPress={cancel} disabled={busy}>Отменить заявку</PrimaryButton> : null}
        </View> : null}

        <Card style={{ gap: 14 }}>
          <Txt style={{ fontSize: 16, fontWeight: '700' }}>История</Txt>
          {data.history?.length ? [...data.history].reverse().map((event, index) => (
            <View key={event.id || `${event.action}-${index}`} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 10, height: 10, marginTop: 5, borderRadius: 5, backgroundColor: c.blue }} />
              <View style={{ flex: 1, gap: 3 }}><Txt style={{ fontWeight: '600' }}>{eventLabel(event)}</Txt><Txt style={{ color: c.ink3, fontSize: 12 }}>{event.actorName || (event.actorRole === 'TEACHER' ? 'Учитель' : 'Администратор')} · {event.createdAt ? new Date(event.createdAt).toLocaleString('ru-RU') : ''}</Txt></View>
            </View>
          )) : <Txt style={{ color: c.ink3 }}>Событий пока нет</Txt>}
        </Card>
      </View>
    </Screen>
  );
}
