import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/AuthContext';
import { teacherRequestsApi } from '@shared/api/teacherRequestsApi';
import { Screen } from '@shared/components/Screen';
import { Card, Pill, PrimaryButton, ScreenHeader } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { ACTIVE_STATUSES, HISTORY_STATUSES, periodLabel, REQUEST_STATUS, REQUEST_TYPES, daysInPeriod } from './model';

const TABS = [
  { value: 'ACTIVE', label: 'Мои заявки' },
  { value: 'HISTORY', label: 'История' },
];

function pluralDays(days) {
  if (days % 10 === 1 && days % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) return 'дня';
  return 'дней';
}

function pluralDocuments(count) {
  if (count % 10 === 1 && count % 100 !== 11) return 'документ';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'документа';
  return 'документов';
}

function submittedDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RequestEmptyState({ history }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 48, gap: 16 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: c.blueSoft }}>
        <Icon name={history ? 'history' : 'calendar'} size={42} color={c.blue} strokeWidth={1.7} />
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Txt style={{ fontSize: 20, fontWeight: '700', textAlign: 'center' }}>{history ? 'История пуста' : 'Заявок пока нет'}</Txt>
        <Txt style={{ color: c.ink3, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
          {history ? 'Здесь появятся отклонённые и отменённые заявки.' : 'Создайте заявку, если не сможете провести уроки.'}
        </Txt>
      </View>
    </View>
  );
}

function RequestCard({ request, onPress }) {
  const { c } = useTheme();
  const status = REQUEST_STATUS[request.status] || REQUEST_STATUS.PENDING;
  const days = daysInPeriod(request.dateFrom, request.dateTo);
  const documents = request.documentCount ?? 0;

  return (
    <Card onPress={onPress} style={{ gap: 14, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Txt style={{ fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{REQUEST_TYPES[request.type] || request.type}</Txt>
          <Txt style={{ color: c.ink2, fontSize: 14 }}>{periodLabel(request.dateFrom, request.dateTo)}</Txt>
        </View>
        <Pill color={status.tone}>{status.label}</Pill>
      </View>

      <View style={{ height: 1, backgroundColor: c.border }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, rowGap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="calendar" size={15} color={c.ink3} />
            <Txt style={{ fontSize: 12, color: c.ink3 }}>{days} {pluralDays(days)}</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="fileText" size={15} color={c.ink3} />
            <Txt style={{ fontSize: 12, color: c.ink3 }}>{documents} {pluralDocuments(documents)}</Txt>
          </View>
          <Txt style={{ fontSize: 12, color: c.ink3 }}>Подана {submittedDate(request.createdAt)}</Txt>
        </View>
        <Icon name="chevronRight" size={18} color={c.ink3} />
      </View>
    </Card>
  );
}

export function TeacherRequestsScreen({ navigation }) {
  const { token } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
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

  const createRequest = () => navigation.navigate('teacher-request-form');

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Освобождения" large />

        <View accessibilityRole="tablist" style={{ flexDirection: 'row', marginHorizontal: 20, padding: 3, gap: 3, borderRadius: 12, backgroundColor: c.bg2 }}>
          {TABS.map(({ value, label }) => {
            const selected = tab === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setTab(value)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9,
                  backgroundColor: selected ? c.green : 'transparent',
                  opacity: pressed ? 0.86 : 1,
                })}
              >
                <Txt style={{ fontSize: 14, fontWeight: selected ? '700' : '500', color: selected ? c.surface : c.ink2 }}>{label}</Txt>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: insets.bottom + (tab === 'ACTIVE' ? 92 : 24), gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.blue} colors={[c.blue]} />}
        >
          {loading ? <ActivityIndicator color={c.blue} style={{ marginTop: 32 }} /> : error ? (
            <Card style={{ alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Icon name="alertTriangle" size={28} color={c.red} />
              <Txt style={{ color: c.red, textAlign: 'center' }}>Не удалось загрузить заявки</Txt>
              <Pressable accessibilityRole="button" onPress={load} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Txt style={{ color: c.blue, fontWeight: '700' }}>Повторить</Txt>
              </Pressable>
            </Card>
          ) : rows.length ? rows.map((row) => (
            <RequestCard key={row.id} request={row} onPress={() => navigation.navigate('teacher-request', { requestId: row.id })} />
          )) : <RequestEmptyState history={tab === 'HISTORY'} />}
        </ScrollView>

        {tab === 'ACTIVE' ? (
          <View style={{ position: 'absolute', right: 20, bottom: insets.bottom + 18 }}>
            <PrimaryButton full={false} onPress={createRequest} style={{ paddingHorizontal: 20 }}>
              <Icon name="plus" size={18} color={c.surface} /> Создать заявку
            </PrimaryButton>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
