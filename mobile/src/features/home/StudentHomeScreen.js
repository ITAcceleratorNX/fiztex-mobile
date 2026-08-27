import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@shared/components/Screen';
import { StateView } from '@shared/components/ui';
import { useMySchedule } from '@shared/hooks/useSchedule';
import { useMyProfile } from '@shared/hooks/useProfile';
import { useMyDiaryGrades, useMySubjectGrades } from '@shared/hooks/useGrades';
import {
  HomeHeader, HomeSectionTitle, LearnerLessonsCard, GradesTile,
} from './HomeParts';
import { formatHomeDate, greetingName, todayKey } from './homeDate';
import { latestGradeLine } from './latestGrade';

/**
 * Главная ученика (Figma `glavnaya-student-home`).
 *
 * Экран не заводит своих запросов: расписание, оценки и профиль он берёт теми же
 * хуками, что и разделы, в которые ведёт. Поэтому «Сегодня» здесь и день в разделе
 * «Расписание» не могут разойтись — это один и тот же ответ из кэша хука.
 */
export function StudentHomeScreen({ nav }) {
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload, emptyMessage } = useMySchedule();
  const { profile, displayName } = useMyProfile();
  const today = todayKey();
  // Чипы оценок — отдельный запрос: его ошибка не должна ронять расписание,
  // поэтому хук гасит её молча и отдаёт пустую карту.
  const { grades, reload: reloadGrades } = useMyDiaryGrades({ dateFrom: today, dateTo: today });
  const { subjects, reload: reloadSubjects } = useMySubjectGrades();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reload(true), reloadGrades(), reloadSubjects({ silent: true })]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadGrades, reloadSubjects]);

  const openLesson = useCallback(
    (lesson) => nav?.('lesson', { ...lesson, childId: null, childName: null }),
    [nav],
  );

  if (error && !data) {
    return (
      <Screen>
        <View style={{ paddingTop: 80 }}>
          <StateView
            icon="alertTriangle"
            tone="error"
            title="Не удалось загрузить"
            subtitle={error}
            actionLabel="Повторить"
            onAction={() => reload()}
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
        paddingBottom: insets.bottom + 100,
      }}>
      <HomeHeader
        title={`Привет, ${greetingName(profile, displayName)}!`}
        subtitle={formatHomeDate(data?.date)}
      />

      <View style={{ gap: 10 }}>
        <HomeSectionTitle>Сегодня</HomeSectionTitle>
        <LearnerLessonsCard
          lessons={lessons}
          gradesByLesson={grades}
          onOpenLesson={openLesson}
          onShowAll={() => nav?.('schedule')}
          emptyText={loading ? 'Загружаем расписание…' : emptyMessage || 'Сегодня уроков нет'}
        />
      </View>

      <View style={{ gap: 10 }}>
        <HomeSectionTitle>Оценки</HomeSectionTitle>
        <GradesTile
          title="Оценки по предметам"
          subtitle={gradeLine || 'Оценок за четверть пока нет'}
          onPress={() => nav?.('diary')}
        />
      </View>
    </Screen>
  );
}
