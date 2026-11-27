import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_CHROME_HEIGHT, Screen } from '@shared/components/Screen';
import { PickerSheet, StateView } from '@shared/components/ui';
import { useChildSchedule, useParentChildren, useUpcomingLessons } from '@shared/hooks/useSchedule';
import { useSelectedChild } from '@shared/state/SelectedChild';
import { useUnreadNotifications } from '@shared/hooks/useNotificationCenter';
import { useMyProfile } from '@shared/hooks/useProfile';
import { useMyDiaryGrades, useMySubjectGrades } from '@shared/hooks/useGrades';
import { useMySurveys } from '@shared/hooks/useSurveys';
import { useAttendanceSummary } from '@shared/hooks/useAttendance';
import { useMyGradeCorrections } from '@shared/hooks/useGradeCorrections';
import { homeCorrectionLine } from '@shared/api/gradeCorrectionMap';
import { usePendingAbsenceDays } from '@shared/hooks/useAbsence';
import { homeAbsenceAlert } from '@shared/api/absenceMap';
import { upcomingAssessment, upcomingAssessmentIsSoon, upcomingAssessmentLine } from '@shared/api/assessmentMap';
import { summaryTileLine } from '@shared/api/learnerAttendanceMap';
import {
  ActiveSurveysBlock, ChildSwitcherPill, HomeHeader, HomeSectionTitle, NotificationBell, LearnerHomeTile,
  LearnerLessonsCard,
} from './HomeParts';
import { childPillLabel, formatHomeDate, parentName, todayKey } from './homeDate';
import { latestGradeLine } from './latestGrade';
import { TeacherFeedHomeCard } from '@features/teacherFeed/TeacherFeedScreens';
import { GradeDynamicsHomeTile } from '@features/dynamics/ParentDynamicsScreens';

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
  const unreadNotifications = useUnreadNotifications();
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
  // какой ребёнок выбран пилюлей ниже (см. правило в контракте опросов) — переключение
  // ребёнка этот блок не трогает.
  const { surveys, reload: reloadSurveys } = useMySurveys();
  // Посещаемость выбранного ребёнка за текущий месяц — подпись плитки.
  const attendance = useAttendanceSummary({ childId, enabled: childId != null });
  const reloadAttendance = attendance.reload;
  // Открытые исправления выбранного ребёнка — та же строка-предупреждение на плитке «Оценки»,
  // что у ученика: в одной карточке урока родитель исправление легко пропускает.
  const corrections = useMyGradeCorrections({ childId, enabled: childId != null });
  const reloadCorrections = corrections.reload;
  // Ближайший СОР/СОЧ на неделе (26.11.2026): на главной видны только сегодняшние уроки.
  const upcoming = useUpcomingLessons({ childId, parent: true, enabled: childId != null });
  const reloadUpcoming = upcoming.reload;
  const upcomingWork = useMemo(
    () => (child ? upcomingAssessment(upcoming.lessons, upcoming.today) : null),
    [child, upcoming.lessons, upcoming.today],
  );
  // Дни, где ждут причину отсутствия: строка на плитке «Посещаемость», нажатие — сразу этот день
  // со шторкой ответа, как из уведомления «укажите причину».
  const pendingAbsence = usePendingAbsenceDays({ childId, enabled: childId != null });
  const reloadPendingAbsence = pendingAbsence.reload;
  const absenceAlert = useMemo(
    () => (child ? homeAbsenceAlert(pendingAbsence.days) : null),
    [child, pendingAbsence.days],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        reload(true),
        reloadGrades(),
        reloadSubjects({ silent: true }),
        reloadSurveys(true),
        reloadAttendance(true),
        reloadCorrections(),
        reloadPendingAbsence(),
        reloadUpcoming(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadGrades, reloadSubjects, reloadSurveys, reloadAttendance, reloadCorrections, reloadPendingAbsence, reloadUpcoming]);

  const openSurvey = useCallback(
    (survey) => nav?.('survey-take', { surveyId: survey.surveyId, title: survey.title }),
    [nav],
  );

  const openLesson = useCallback(
    (lesson) => nav?.('lesson', {
      ...lesson,
      childId,
      // Имя ребёнка знает этот экран, а не карточка урока: в ответе урока его нет.
      childName: child ? childPillLabel(child) : null,
    }),
    [nav, childId, child],
  );

  // Плитка с открытым исправлением ведёт туда же, куда уведомление «работу нужно исправить»:
  // в карточку урока, где блок «Требуется исправление». Сервер отдаёт ближайший срок первым.
  const nearestCorrection = child ? corrections.corrections[0] ?? null : null;
  const openGrades = useCallback(() => {
    if (nearestCorrection) {
      openLesson({ lessonInstanceId: nearestCorrection.lessonId });
      return;
    }
    nav?.('grades');
  }, [nav, nearestCorrection, openLesson]);

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

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} contentStyle={{
        gap: 20,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + BOTTOM_CHROME_HEIGHT,
      }}>
      <HomeHeader
        title={parentName(profile, displayName)}
        subtitle={formatHomeDate(data?.date)}
        right={<NotificationBell count={unreadNotifications} onPress={() => nav?.('notifications')} />}
      />

      {/* Сразу под приветствием — как в макете: у родителя нет плитки сканера, и опрос
          встаёт первым же блоком главной. */}
      <ActiveSurveysBlock surveys={surveys} onOpenSurvey={openSurvey} />

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

      {upcomingWork ? (
        <LearnerHomeTile
          icon="clipboardCheck"
          title="СОР и СОЧ"
          subtitle={upcomingAssessmentLine(upcomingWork, upcoming.today)}
          alert={upcomingAssessmentIsSoon(upcomingWork, upcoming.today)
            ? upcomingAssessmentLine(upcomingWork, upcoming.today) : null}
          onPress={() => openLesson(upcomingWork.lesson)}
        />
      ) : null}
      {/* Разделы — плитками подряд, без заголовка секции (Figma 2170:5561). */}
      <LearnerHomeTile
        icon="award"
        title="Оценки по предметам"
        subtitle={gradeLine || 'Оценок за четверть пока нет'}
        alert={child ? homeCorrectionLine(corrections.corrections) : null}
        onPress={openGrades}
      />
      {/* Под «Оценками по предметам», как в макете (Figma 2201:52702). */}
      {child ? <GradeDynamicsHomeTile childId={childId} onPress={() => nav?.('grade-dynamics')} /> : null}
      <LearnerHomeTile
        icon="calendarCheck"
        tone="markPresent"
        iconSize={20}
        title="Посещаемость"
        subtitle={summaryTileLine(attendance.summary) || 'Календарь за месяц'}
        alert={absenceAlert?.text ?? null}
        onPress={() => nav?.('attendance', absenceAlert ? { absenceDate: absenceAlert.date } : undefined)}
      />

      {/* «От учителей» — сводки об учёбе, отзывы за месяц и комментарии к урокам одной лентой: для
          родителя это одно и то же, а три соседних блока читались как три разных раздела. */}
      {child ? <TeacherFeedHomeCard key={childId} childId={childId} nav={nav} /> : null}

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
