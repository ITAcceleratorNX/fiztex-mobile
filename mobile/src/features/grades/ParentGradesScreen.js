import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { StateView } from '@shared/components/ui';
import {
  ChildPickerSheet,
  ChildSwitcherPill,
  childShortLabel,
} from '@shared/ui/childSwitcher';
import { useParentChildren } from '@shared/hooks/useSchedule';
import { StudentGradesScreen } from './StudentGradesScreen';
import { GradesSkeleton } from './GradeStates';

/**
 * Оценки ребёнка (Figma `parent-multi-grades`, `parent-single-grades`,
 * `parent-child-picker`).
 *
 * <b>Экран не свой, а ученический.</b> Содержимое у ребёнка и у родителя одно и то же —
 * и оценки, и средние, и права; разная только область, и её задаёт
 * `childStudentProfileId`. Поэтому здесь нет ни одной карточки предмета: этот компонент
 * отвечает ровно за выбор ребёнка и передаёт его вниз.
 *
 * <b>Переключатель — общий</b> с расписанием и заданиями (`shared/ui/childSwitcher`): у
 * родителя это одна и та же шапка во всех разделах, и три её копии разошлись бы в
 * подписях и цветах.
 *
 * <b>Один ребёнок — без переключателя</b>: пилюля остаётся, но не нажимается, потому что
 * «чей это дневник» — вопрос, который всё равно нужно закрывать (макет
 * `parent-single-grades`).
 */
export function ParentGradesScreen({ nav }) {
  const { c } = useTheme();
  const { loading, error, children, reload } = useParentChildren();

  const [childId, setChildId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Первый ребёнок по умолчанию: до выбора запрос за оценками не уходит, а держать
  // родителя на пустом экране, когда ребёнок один, незачем. Тот же приём в расписании.
  useEffect(() => {
    if (children.length && !childId) setChildId(children[0].id);
  }, [children, childId]);

  const selectedIndex = children.findIndex((item) => item.id === childId);
  const child = selectedIndex >= 0 ? children[selectedIndex] : null;

  if (loading || (children.length > 0 && !child)) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        <View style={{ padding: 16, paddingTop: 24 }}>
          <GradesSkeleton header={false} />
        </View>
      </Screen>
    );
  }

  if (error || children.length === 0) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
          <StateView
            icon={error ? 'alertTriangle' : 'users'}
            tone={error ? 'warn' : 'neutral'}
            title={error ? 'Не удалось загрузить' : 'Дети не привязаны к аккаунту'}
            subtitle={
              error
                ? 'Проверьте соединение и попробуйте снова'
                : 'Обратитесь к администратору школы — он свяжет вас с ребёнком'
            }
            actionLabel={error ? 'Повторить' : undefined}
            onAction={error ? () => reload() : undefined}
          />
        </View>
      </Screen>
    );
  }

  const label = [childShortLabel(child), child?.className].filter(Boolean).join(' · ');

  return (
    <>
      <StudentGradesScreen
        // `key` — не украшение: у другого ребёнка другой список предметов и другая
        // выбранная четверть, и переиспользованное состояние показало бы чужое.
        key={childId}
        nav={nav}
        childStudentProfileId={childId}
        childLabel={label}
        titleRight={
          <ChildSwitcherPill
            child={child}
            index={selectedIndex < 0 ? 0 : selectedIndex}
            canSwitch={children.length > 1}
            onPress={() => setPickerOpen(true)}
          />
        }
      />

      <ChildPickerSheet
        visible={pickerOpen}
        items={children}
        selectedId={childId}
        onSelect={(nextId) => {
          setChildId(nextId);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
