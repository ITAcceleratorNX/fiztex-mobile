import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useAuth } from '@features/auth/AuthContext';
import { teacherRequestsApi } from '@shared/api/teacherRequestsApi';
import { Screen } from '@shared/components/Screen';
import { Card, Pill, PrimaryButton, ScreenHeader } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { ACTIVE_STATUSES, HISTORY_STATUSES, periodLabel, REQUEST_STATUS, REQUEST_TYPES, daysInPeriod } from './model';

export function TeacherRequestsScreen({ navigation }) {
  const { token } = useAuth();
  const { c } = useTheme();
  const [tab, setTab] = useState('ACTIVE');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const statuses = tab === 'ACTIVE' ? ACTIVE_STATUSES : HISTORY_STATUSES;

  const load = useCallback(async () => {
    if (!token) return;
    const current = ++sequence.current;
    setLoading(true);
    setError(false);
    try {
      const pages = await Promise.all(statuses.map((status) => teacherRequestsApi.listAll(token, status)));
      if (current === sequence.current) setRows(pages.flat().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
    } catch (e) {
      if (current === sequence.current) { setRows([]); setError(true); }
    } finally { if (current === sequence.current) setLoading(false); }
  }, [token, tab]);

  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [load]);

  const subtitle = useMemo(() => tab === 'ACTIVE' ? 'Текущие заявки и решения' : 'Заявки, по которым принято решение', [tab]);

  return (
    <Screen onRefresh={load} refreshing={loading} contentStyle={{ paddingBottom: 20 }}>
      <ScreenHeader title="Освобождения" large sub={subtitle} />
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <PrimaryButton onPress={() => navigation.navigate('teacher-request-form')}>
          <Icon name="plus" size={18} color="#fff" /> Создать заявку
        </PrimaryButton>
        <View style={{ flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 14, padding: 4 }}>
          {[['ACTIVE', 'Мои заявки'], ['HISTORY', 'История']].map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 11, backgroundColor: tab === key ? c.surface : 'transparent' }}>
              <Txt style={{ fontSize: 14, fontWeight: tab === key ? '700' : '500', color: tab === key ? c.ink : c.ink2 }}>{label}</Txt>
            </Pressable>
          ))}
        </View>
        {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 24 }} /> : error ? (
          <Card><Txt style={{ color: c.red, textAlign: 'center' }}>Не удалось загрузить заявки</Txt><Pressable onPress={load} style={{ padding: 12 }}><Txt style={{ color: c.blue, textAlign: 'center', fontWeight: '700' }}>Повторить</Txt></Pressable></Card>
        ) : rows.length ? rows.map((row) => {
          const status = REQUEST_STATUS[row.status] || REQUEST_STATUS.PENDING;
          const days = daysInPeriod(row.dateFrom, row.dateTo);
          return (
            <Card key={row.id} onPress={() => navigation.navigate('teacher-request', { requestId: row.id })} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}><Txt style={{ fontSize: 16, fontWeight: '700' }}>{REQUEST_TYPES[row.type] || row.type}</Txt><Txt style={{ color: c.ink2, marginTop: 4 }}>{periodLabel(row.dateFrom, row.dateTo)}</Txt></View>
                <Pill color={status.tone}>{status.label}</Pill>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}><Txt style={{ fontSize: 13, color: c.ink3 }}>{days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} · {row.documentCount || 0} док.</Txt><Txt style={{ fontSize: 11, color: c.ink3, marginTop: 3 }}>Подана {row.createdAt ? new Date(row.createdAt).toLocaleDateString('ru-RU') : '—'}</Txt></View>
                <Icon name="chevronRight" size={18} color={c.ink3} />
              </View>
            </Card>
          );
        }) : (
          <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
            <Icon name="calendar" size={28} color={c.ink3} />
            <Txt style={{ fontSize: 16, fontWeight: '700' }}>{tab === 'ACTIVE' ? 'Заявок пока нет' : 'История пуста'}</Txt>
            <Txt style={{ color: c.ink2, textAlign: 'center' }}>{tab === 'ACTIVE' ? 'Создайте заявку, если не сможете провести уроки.' : 'Здесь появятся отклонённые и отменённые заявки.'}</Txt>
          </Card>
        )}
      </View>
    </Screen>
  );
}
