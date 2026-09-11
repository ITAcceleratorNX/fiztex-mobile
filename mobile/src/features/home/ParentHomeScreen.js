import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_CHROME_HEIGHT, Screen } from '@shared/components/Screen';
import { PickerSheet, StateView } from '@shared/components/ui';
import { useChildSchedule, useParentChildren } from '@shared/hooks/useSchedule';
import { useSelectedChild } from '@shared/state/SelectedChild';
import { useMyProfile } from '@shared/hooks/useProfile';
import { useMyDiaryGrades, useMySubjectGrades } from '@shared/hooks/useGrades';
import { useMySurveys } from '@shared/hooks/useSurveys';
import {
  ChildSwitcherPill, GradesTile, HomeHeader, HomeSectionTitle, LearnerLessonsCard, SurveysTile,
} from './HomeParts';
import { childPillLabel, formatHomeDate, parentName, todayKey } from './homeDate';
import { latestGradeLine } from './latestGrade';

/**
 * Главная родителя (Figma `glavnaya-Родитель-home`).
 *
 * Отличие от ученической одно, но принципиальное: всё содержимое принадлежит
 * **выбранному ребёнку**. Доступы детей не объединяются — каждый запрос уходит со своим
 * `childId`, и переключение пилюли меняет расписание и оценки целиком, а не подпись.
 */
export function ParentHomeScreen({ nav }) {
  const insets = useSafeAreaInsets();
  const { children, loading: childrenLoading, error: childrenError } = useParentChildren();
  const { profile, displayName } = useMyProfile();
  // Выбор ребёнка общий на всё приложение родителя (`SelectedChildProvider`): его
  // читают и расписание, и оценки, и кнопка «Текущий урок» в нижней панели.
  const { childId, setChildId } = useSelectedChild(children);
  const [pickerOpen, setPickerOpen] = useState(false);

  const child = useMemo(
    () => children.find((c) => c.id === childId) || null,
    [children, childId],
  );

  const { data, loading, error, reload, emptyMessage } = useChildSchedule(childId);
  const today = todayKey();
  const { grades, reload: reloadGrades } = useMyDiaryGrades({
    dateFrom: today, dateTo: today, childStudentProfileId: childId, enabled: childId != null,
  });
  const { subjects, reload: reloadSubjects } = useMySubjectGrades({
    childStudentProfileId: childId,
  });
  // Без `childId`: анкета родителя одна на аккаунт независимо от числа детей и от того,
  // какой ребёнок выбран пилюлей выше (см. правило в контракте опросов) — переключение
  // ребёнка эту плитку не трогает.
  const { surveys, reload: reloadSurveys } = useMySurveys();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reload(true), reloadGrades(), reloadSubjects({ silent: true }), reloadSurveys(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadGrades, reloadSubjects, reloadSurveys]);

  const openLesson = useCallback(
    (lesson) => nav?.('lesson', {
      ...lesson,
      childId,
      // Имя ребёнка знает этот экран, а не карточка урока: в ответе урока его нет.
      childName: child ? childPillLabel(child) : null,
    }),
    [nav, childId, child],
  );

  if (!childrenLoading && children.length === 0) {
    return (
      <Screen>
        <View style={{ paddingTop: 80 }}>
          <StateView
            icon="users"
            tone="brand"
            title="Дети не привязаны"
            subtitle={childrenError || 'Обратитесь к администратору школы — он свяжет ваш аккаунт с ребёнком.'}
          />
        </View>
      </Screen>
    );
  }

  const lessons = data?.lessons ?? [];
  const gradeLine = latestGradeLine(subjects);
  const pendingSurveys = (surveys ?? []).filter((s) => s.canAnswer).length;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} contentStyle={{
        gap: 20,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + BOTTOM_CHROME_HEIGHT,
      }}>
      <HomeHeader
        title={parentName(profile, displayName)}
        subtitle={formatHomeDate(data?.date)}
      />

      {/* Сразу под приветствием, как и у ученика — опросам не место внизу экрана под
          расписанием и оценками. Широкий вариант: у родителя нет плитки сканера, с
          которой её делить строкой. */}
      {pendingSurveys > 0 ? (
        <SurveysTile count={pendingSurveys} onPress={() => nav?.('survey-list')} />
      ) : null}

      <View style={{ gap: 10 }}>
        <HomeSectionTitle>Расписание на сегодня</HomeSectionTitle>
        {child ? (
          <ChildSwitcherPill
            child={child}
            disabled={children.length < 2}
            onPress={() => setPickerOpen(true)}
          />
        ) : null}
        <LearnerLessonsCard
          lessons={lessons}
          gradesByLesson={grades}
          onOpenLesson={openLesson}
          onShowAll={() => nav?.('schedule')}
          emptyText={
            loading || childrenLoading
              ? 'Загружаем расписание…'
              : error || emptyMessage || 'Сегодня уроков нет'
          }
        />
      </View>

      <View style={{ gap: 10 }}>
        <HomeSectionTitle>Оценки</HomeSectionTitle>
        <GradesTile
          title="Оценки по предметам"
          subtitle={gradeLine || 'Оценок за четверть пока нет'}
          onPress={() => nav?.('grades')}
        />
      </View>

      <PickerSheet
        visible={pickerOpen}
        title="Выберите ребёнка"
        value={childId}
        options={children.map((item) => ({ value: item.id, label: childPillLabel(item) }))}
        onSelect={(value) => {
          setChildId(value);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}
