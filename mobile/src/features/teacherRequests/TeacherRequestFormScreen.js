import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@features/auth/AuthContext';
import { teacherRequestsApi } from '@shared/api/teacherRequestsApi';
import { Screen } from '@shared/components/Screen';
import { Card, FieldLabel, PrimaryButton, ScreenHeader, TextField } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { ACTIVE_STATUSES, fileError, REQUEST_TYPES } from './model';
import { DatePickerModal } from '@shared/components/DatePickerModal';

const TYPES = Object.keys(REQUEST_TYPES);

export function TeacherRequestFormScreen({ navigation, route }) {
  const { token } = useAuth();
  const { c } = useTheme();
  const [type, setType] = useState('RELEASE');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dateError, setDateError] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [datePicker, setDatePicker] = useState(null);
  const [occupiedRanges, setOccupiedRanges] = useState([]);
  const requestId = route.params?.requestId;

  useEffect(() => {
    let active = true;
    if (!token) return () => { active = false; };
    Promise.all(ACTIVE_STATUSES.map((status) => teacherRequestsApi.listAll(token, status)))
      .then((pages) => {
        if (!active) return;
        setOccupiedRanges(pages.flat().filter((row) => String(row.id) !== String(requestId || '')).map((row) => ({ from: row.dateFrom, to: row.dateTo })));
      })
      .catch(() => { if (active) setOccupiedRanges([]); });
    return () => { active = false; };
  }, [requestId, token]);

  useEffect(() => {
    if (!requestId || !token) return;
    teacherRequestsApi.get(token, requestId).then((data) => {
      setType(data.type); setDateFrom(data.dateFrom); setDateTo(data.dateTo); setReason(data.reason);
    }).catch(() => Alert.alert('Не удалось загрузить заявку', 'Вернитесь в список и попробуйте ещё раз.'));
  }, [requestId, token]);

  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'], multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    const picked = (result.assets || []).map((asset) => ({ uri: asset.uri, name: asset.name, type: asset.mimeType, sizeBytes: asset.size, file: asset.file }));
    const invalid = picked.find(fileError);
    if (invalid) { Alert.alert('Файл не подходит', fileError(invalid)); return; }
    setFiles((current) => [...current, ...picked]);
  }, []);

  const pickPhotos = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.9 });
    if (result.canceled) return;
    const picked = (result.assets || []).map((asset) => ({ uri: asset.uri, name: asset.fileName || 'document.jpg', type: asset.mimeType || 'image/jpeg', sizeBytes: asset.fileSize, file: asset.file }));
    const invalid = picked.find(fileError);
    if (invalid) { Alert.alert('Файл не подходит', fileError(invalid)); return; }
    setFiles((current) => [...current, ...picked]);
  }, []);

  const save = useCallback(async () => {
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) && dateFrom <= dateTo;
    setDateError(validDate ? '' : 'Укажите корректный период дат.');
    setReasonError(reason.trim() ? '' : 'Укажите причину отсутствия.');
    if (!validDate || !reason.trim() || busy) return;
    setBusy(true);
    let saved;
    try {
      const activeRequests = (await Promise.all(ACTIVE_STATUSES.map((status) => teacherRequestsApi.listAll(token, status)))).flat();
      const overlaps = activeRequests.some((row) =>
        String(row.id) !== String(requestId || '') && row.dateFrom <= dateTo && row.dateTo >= dateFrom,
      );
      if (overlaps) {
        setDateError('Период пересекается с другой заявкой на рассмотрении или согласованной.');
        return;
      }
      saved = requestId
        ? await teacherRequestsApi.update(token, requestId, { type, dateFrom, dateTo, reason: reason.trim() })
        : await teacherRequestsApi.create(token, { type, dateFrom, dateTo, reason: reason.trim() });
      if (saved.id && files.length) {
        const uploadErrors = [];
        for (const file of files) {
          try { await teacherRequestsApi.upload(token, saved.id, file); }
          catch (e) { uploadErrors.push(file.name); }
        }
        if (uploadErrors.length) Alert.alert('Заявка сохранена', `Не удалось загрузить: ${uploadErrors.join(', ')}. Добавьте документы в карточке заявки.`);
      }
      navigation.replace('teacher-request', { requestId: saved.id });
    } catch (e) {
      const message = e?.message || 'Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.';
      Alert.alert('Не удалось сохранить', message);
    } finally { setBusy(false); }
  }, [busy, dateFrom, dateTo, files, navigation, reason, requestId, token, type]);

  return (
    <Screen contentStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title={requestId ? 'Изменить заявку' : 'Новая заявка'} back={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 16, gap: 20 }}>
        <View style={{ gap: 10 }}><FieldLabel required>Тип заявки</FieldLabel><View style={{ flexDirection: 'row', gap: 10 }}>{TYPES.map((value) => (
          <Pressable key={value} onPress={() => setType(value)} style={{ flex: 1, minHeight: 72, justifyContent: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: type === value ? c.blue : c.border, backgroundColor: type === value ? c.blueSoft : c.surface }}>
            <Txt style={{ fontWeight: '700', color: type === value ? c.blueInk : c.ink }}>{REQUEST_TYPES[value]}</Txt>
          </Pressable>
        ))}</View></View>
        <View style={{ gap: 8 }}>
          <FieldLabel required>Даты отсутствия</FieldLabel>
          <Card style={{ gap: 12 }}>
            <Pressable onPress={() => setDatePicker('from')}><TextField label="С даты" value={dateFrom ? dateFrom.split('-').reverse().join('.') : ''} editable={false} placeholder="Выберите дату" right={<Icon name="calendar" size={18} color={c.blue} />} /></Pressable>
            <Pressable onPress={() => setDatePicker('to')}><TextField label="По дату" value={dateTo ? dateTo.split('-').reverse().join('.') : ''} editable={false} placeholder="Выберите дату" right={<Icon name="calendar" size={18} color={c.blue} />} /></Pressable>
            {dateError ? <Txt style={{ color: c.red, fontSize: 12 }}>{dateError}</Txt> : <Txt style={{ color: c.ink3, fontSize: 12 }}>Укажите один день или непрерывный период. Прошедшие даты доступны.</Txt>}
          </Card>
        </View>
        <TextField label="Причина" required error={reasonError} value={reason} onChangeText={(value) => { setReason(value); if (value.trim()) setReasonError(''); }} placeholder="Расскажите, почему вы не сможете провести уроки" multiline maxLength={1000} />
        <View style={{ gap: 8 }}>
          <FieldLabel optional>Документ</FieldLabel>
          <Card style={{ gap: 10 }}>
            <Txt style={{ color: c.ink2, fontSize: 13 }}>PDF, JPG, PNG или HEIC · до 10 МБ</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={pickFile} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.border }}>
                <Icon name="upload" size={18} color={c.blue} /><Txt style={{ color: c.blue, fontWeight: '700' }}>Файл</Txt>
              </Pressable>
              <Pressable onPress={pickPhotos} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.border }}>
                <Icon name="camera" size={18} color={c.blue} /><Txt style={{ color: c.blue, fontWeight: '700' }}>Фото</Txt>
              </Pressable>
            </View>
            {files.map((file, index) => <View key={`${file.name}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Txt numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>{file.name}</Txt><Pressable onPress={() => setFiles((current) => current.filter((_, i) => i !== index))}><Icon name="x" size={17} color={c.red} /></Pressable></View>)}
          </Card>
        </View>
        <PrimaryButton onPress={save} disabled={busy}>{busy ? 'Сохраняем…' : requestId ? 'Сохранить изменения' : 'Отправить заявку'}</PrimaryButton>
      </View>
      <DatePickerModal visible={!!datePicker} value={datePicker === 'from' ? dateFrom : dateTo} occupiedRanges={occupiedRanges} title={datePicker === 'from' ? 'Дата начала' : 'Дата окончания'} onClose={() => setDatePicker(null)} onSelect={(value) => {
        if (datePicker === 'from') { setDateFrom(value); if (!dateTo || value > dateTo) setDateTo(value); }
        else setDateTo(value);
        setDateError('');
      }} />
    </Screen>
  );
}
