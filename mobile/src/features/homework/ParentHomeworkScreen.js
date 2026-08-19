import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { useParentChildren } from '@shared/hooks/useSchedule';
import { useHomeworkList } from '@shared/hooks/useHomework';
import {
  ChildPickerSheet,
  ChildSubtitle,
  ChildSwitcherPill,
} from '@features/schedule/ChildSwitcher';
import { HomeworkRow, ScopeTabs } from './components';
import {
  HomeworkEmpty,
  HomeworkError,
  HomeworkForbidden,
  HomeworkSkeleton,
  ListHeading,
} from './HomeworkStates';

/**
 * Задания ребёнка глазами родителя (ТЗ HOMEWORK-005.3, Figma «Родитель ДЗ …»
 * 901:14854…15463).
 *
 * Лента дословно та же, что видит ученик, — иначе разговор дома начинался бы со сверки
 * списков. Различие одно: ребёнок в шапке. У единственного ребёнка это подпись под
 * заголовком, у нескольких — чип с выбором, потому что переключать больше не на кого
 * (Figma «1 ребёнок» против «мультиребёнок»).
 */
export function ParentHomeworkScreen({ nav }) {
  const { c } = useTheme();
  const { loading: childrenLoading, error: childrenError, children } = useParentChildren();
  const [childId, setChildId] = useState(null);
  const [picking, setPicking] = useState(false);

  // Первый ребёнок выбирается сам: экран без выбранного ребёнка ничего не показывает,
  // а начинать со списка «выберите ребёнка» там, где он один, — лишний шаг.
  useEffect(() => {
    if (childId == null && children.length > 0) setChildId(children[0].id);
  }, [childId, children]);

  const index = Math.max(0, children.findIndex((child) => child.id === childId));
  const child = children[index] || null;

  const { loading, error, rows, scope, setScope, reload, refresh, refreshing } =
    useHomeworkList({ childId });

  const busy = childrenLoading || loading;
  // Родителя без привязанных детей показывать нечем — это не сбой сети, а состояние учётки.
  const blocked = !childrenLoading && !childrenError && children.length === 0;

  return (
    <Screen scroll={false}>
      <ListHeading>
        {children.length > 1 ? (
          <ChildSwitcherPill
            child={child}
            index={index}
            canSwitch
            onPress={() => setPicking(true)}
          />
        ) : child ? (
          <ChildSubtitle child={child} />
        ) : null}
      </ListHeading>

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
          blocked={blocked}
          loading={busy}
          error={error || (childrenError ? 'load' : null)}
          rows={rows}
          scope={scope}
          onRetry={() => reload()}
          onOpen={(id) => nav('homework-card', { homeworkId: id, childId })}
        />
      </ScrollView>

      <ChildPickerSheet
        visible={picking}
        items={children}
        selectedId={childId}
        onSelect={(id) => {
          setChildId(id);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </Screen>
  );
}

function Body({ blocked, loading, error, rows, scope, onRetry, onOpen }) {
  if (blocked) return <HomeworkForbidden forParent />;
  if (loading) return <HomeworkSkeleton />;
  if (error === 'forbidden') return <HomeworkForbidden forParent />;
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
