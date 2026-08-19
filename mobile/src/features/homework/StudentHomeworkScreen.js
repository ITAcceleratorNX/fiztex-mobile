import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { useHomeworkList } from '@shared/hooks/useHomework';
import { HomeworkRow, ScopeTabs } from './components';
import {
  HomeworkEmpty,
  HomeworkError,
  HomeworkForbidden,
  HomeworkSkeleton,
  ListHeading,
} from './HomeworkStates';

/**
 * Задания ученика (ТЗ HOMEWORK-005.2, Figma «ДЗ (моб.)» 853:19518 и состояния 853:19614…19745).
 *
 * Вкладка — это набор статусов на сервере, а не разбиение пришедшей страницы: просроченное
 * задание остаётся в «Актуальных» до ручного завершения учителем, завершённое и отменённое
 * уходят в «Историю», а повторно открытое возвращается обратно само — у него сменился
 * статус, и переносить его руками некому.
 */
export function StudentHomeworkScreen({ nav }) {
  const { c } = useTheme();
  const { loading, error, rows, scope, setScope, reload, refresh, refreshing } = useHomeworkList();

  return (
    <Screen scroll={false}>
      <ListHeading />

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <ScopeTabs value={scope} onChange={setScope} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.ink3} />
        }
      >
        <Body
          loading={loading}
          error={error}
          rows={rows}
          scope={scope}
          onRetry={() => reload()}
          onOpen={(id) => nav('homework-card', { homeworkId: id })}
        />
      </ScrollView>
    </Screen>
  );
}

function Body({ loading, error, rows, scope, onRetry, onOpen }) {
  if (loading) return <HomeworkSkeleton />;
  if (error === 'forbidden') return <HomeworkForbidden />;
  if (error) return <HomeworkError onRetry={onRetry} />;
  if (rows.length === 0) return <HomeworkEmpty scope={scope} />;

  return (
    <View>
      {rows.map((row) => (
        <HomeworkRow key={row.id} row={row} onPress={() => onOpen(row.id)} />
      ))}
    </View>
  );
}
