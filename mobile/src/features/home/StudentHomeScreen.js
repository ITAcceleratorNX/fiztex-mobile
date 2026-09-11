import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_CHROME_HEIGHT, Screen } from '@shared/components/Screen';
import { StateView } from '@shared/components/ui';
import { useMySchedule } from '@shared/hooks/useSchedule';
import { useMyProfile } from '@shared/hooks/useProfile';
import { useMyDiaryGrades, useMySubjectGrades } from '@shared/hooks/useGrades';
import { useMySurveys } from '@shared/hooks/useSurveys';
import {
  HomeHeader, HomeSectionTitle, LearnerLessonsCard, GradesTile, ScanQrTile, SurveysTile,
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
  // Плитка опросов не должна ронять остальную главную своей ошибкой — блок скрывается
  // сам, если счётчик посчитать не удалось (пустой список ведёт себя так же).
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
  // `canAnswer` уже решён сервером (не отправлен, окно открыто, опрос активен) — здесь
  // только считаем, сколько таких пришло, а не признаём отдельно.
  const pendingSurveys = (surveys ?? []).filter((s) => s.canAnswer).length;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} contentStyle={{
        gap: 20,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + BOTTOM_CHROME_HEIGHT,
      }}>
      <HomeHeader
        title={`Привет, ${greetingName(profile, displayName)}!`}
        subtitle={formatHomeDate(data?.date)}
      />

      {/* Пара «Сканер + Опросы», пока есть непройденный опрос: оба открывают в начале
          дня, и опросам не место внизу экрана под расписанием и оценками. Нет
          непройденных — сканер один на всю ширину, как и был. */}
      {pendingSurveys > 0 ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ScanQrTile compact onPress={() => nav?.('attendance-scan')} />
          <SurveysTile compact count={pendingSurveys} onPress={() => nav?.('survey-list')} />
        </View>
      ) : (
        <ScanQrTile onPress={() => nav?.('attendance-scan')} />
      )}

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
