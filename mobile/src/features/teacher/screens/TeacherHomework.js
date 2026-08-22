import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Pill, ScreenHeader, StateView } from '@shared/components/ui';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkApi } from '@shared/api/homeworkApi';
import { homeworkMetaLine, homeworkStatusChip, progressLabel } from '@shared/api/homeworkMap';

const TABS = [
  { value: 'ACTUAL', label: 'Актуальные' },
  { value: 'HISTORY', label: 'История' },
];

const PAGE_SIZE = 50;

/**
 * Домашние задания учителя (ТЗ HOMEWORK-005.1, Figma 868:247 и состояния 868:388…590).
 *
 * Вкладка — это набор статусов, а не отдельная выдача: повторно открытое задание
 * возвращается в «Актуальные» само, потому что у него сменился статус (§4.1, §6).
 * Поэтому вкладка уходит в запрос параметром, а не разбирается на клиенте.
 *
 * Фильтров класса и предмета здесь нет — в мобильном макете их не рисовали; на узком
 * экране список короче, и панель фильтров стоила бы больше места, чем экономит.
 */
export function TeacherHomework({ nav }) {
  const { c } = useTheme();
  const { token } = useAuth();

  const [scope, setScope] = useState('ACTUAL');
  const [state, setState] = useState({ loading: true, error: null, rows: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!token) {
        setState({ loading: false, error: null, rows: [] });
        return;
      }
      if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const page = await homeworkApi.list(token, { scope, size: PAGE_SIZE });
        setState({ loading: false, error: null, rows: page?.content ?? [] });
      } catch (e) {
        // 403 — не сбой сети, а отсутствие учительского доступа к разделу (§8).
        setState({
          loading: false,
          error: e?.status === 403 ? 'forbidden' : 'load',
          rows: [],
        });
      }
    },
    [token, scope],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Возврат с формы или карточки: там задание могли создать, опубликовать или завершить.
  // Первый показ пропускается — список только что загрузился сам.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) load(true);
      else focusedBefore.current = true;
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  return (
    <Screen>
      <ScreenHeader
        title="Задания"
        large
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Создать задание"
            onPress={() => nav('homework-create')}
            hitSlop={8}
          >
            <Icon name="plus" size={22} color={c.ink} />
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <ScopeTabs value={scope} onChange={setScope} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.ink3} />
        }
      >
        <Body
          state={state}
          scope={scope}
          onRetry={() => load()}
          onOpen={(id) => nav('homework-card', { homeworkId: id })}
          onCreate={() => nav('homework-create')}
        />
      </ScrollView>
    </Screen>
  );
}

/** Пилюля на серой дорожке (Figma 868:247): вкладка меняет выборку, а не часть экрана. */
function ScopeTabs({ value, onChange }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: c.bg2,
        borderRadius: 14,
        padding: 4,
        gap: 4,
      }}
    >
      {TABS.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.value)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? c.surface : 'transparent',
            }}
          >
            <Txt
              style={{
                fontSize: 15,
                fontWeight: selected ? '700' : '500',
                color: selected ? c.ink : c.inkMuted,
              }}
            >
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function Body({ state, scope, onRetry, onOpen, onCreate }) {
  const { c } = useTheme();

  if (state.loading) {
    return (
      <View style={{ paddingTop: 64, alignItems: 'center' }}>
        <ActivityIndicator color={c.blue} />
      </View>
    );
  }

  if (state.error === 'forbidden') {
    return (
      <StateView
        style={{ marginTop: 96 }}
        icon="lock"
        title="Раздел недоступен"
        subtitle="Домашними заданиями управляет учитель. Если доступ нужен, обратитесь к администратору."
      />
    );
  }

  if (state.error) {
    return (
      <StateView
        style={{ marginTop: 96 }}
        icon="alertTriangle"
        tone="error"
        title="Не удалось загрузить"
        subtitle="Проверьте подключение к интернету"
        actionLabel="Повторить"
        onAction={onRetry}
      />
    );
  }

  if (state.rows.length === 0) {
    // Пустая «История» и пустые «Актуальные» — разные состояния: в первой создавать нечего,
    // она наполняется сама, когда задание завершают или отменяют (§8).
    return scope === 'ACTUAL' ? (
      <StateView
        style={{ marginTop: 96 }}
        title="Нет актуальных заданий"
        subtitle="Создайте новое задание"
        actionLabel="Создать задание"
        onAction={onCreate}
      />
    ) : (
      <StateView
        style={{ marginTop: 96 }}
        title="История пуста"
        subtitle="Завершённые и отменённые задания появятся здесь"
      />
    );
  }

  return (
    <View>
      {state.rows.map((row) => (
        <HomeworkRow key={row.id} row={row} onPress={() => onOpen(row.id)} />
      ))}
    </View>
  );
}

function HomeworkRow({ row, onPress }) {
  const { c } = useTheme();
  const chip = homeworkStatusChip(row);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Открыть задание «${row.title ?? ''}»`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        backgroundColor: pressed ? c.bg2 : 'transparent',
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontSize: 13, fontWeight: '400', color: c.inkMuted }} numberOfLines={1}>
          {homeworkMetaLine(row)}
        </Txt>
        <Txt style={{ fontSize: 16, fontWeight: '600', color: c.ink }} numberOfLines={1}>
          {row.title}
        </Txt>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {chip ? <Pill color={chip.color}>{chip.label}</Pill> : null}
        <Txt style={{ fontSize: 13, fontWeight: '500', color: c.inkMuted }}>
          {progressLabel(row)}
        </Txt>
      </View>
    </Pressable>
  );
}
