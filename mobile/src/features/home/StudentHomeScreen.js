import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_CHROME_HEIGHT, Screen } from '@shared/components/Screen';
import { StateView } from '@shared/components/ui';
import { useMySchedule } from '@shared/hooks/useSchedule';
import { useMyProfile } from '@shared/hooks/useProfile';
import { useMyDiaryGrades, useMySubjectGrades } from '@shared/hooks/useGrades';
import { useMySurveys } from '@shared/hooks/useSurveys';
import { useAttendanceSummary } from '@shared/hooks/useAttendance';
import { summaryTileLine } from '@shared/api/learnerAttendanceMap';
import {
  ActivePsychTestsBlock, ActiveSurveysBlock, HomeHeader, HomeSectionTitle, LearnerLessonsCard, LearnerHomeTile,
  ScanQrTile,
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
  // Блок опроса не должен ронять остальную главную своей ошибкой — при неудаче хук
  // отдаёт пустой список, и блок просто не появляется (как и когда опросов нет).
  // Тесты школьного психолога — опросы той же ленты (PSYCHOLOGIST-002): баннер и плитка
  // теста разбирают один ответ, каждый — своё.
  const { surveys, reload: reloadSurveys } = useMySurveys();
  // Подпись плитки «Посещаемость» — счётчики текущего месяца. Ошибка молчит: плитка
  // остаётся входом в календарь с нейтральной подписью.
  const attendance = useAttendanceSummary();
  const reloadAttendance = attendance.reload;

  // Пройденный опрос или тест должен уйти с главной сразу по возвращении, а не после ручного
  // обновления: вкладка остаётся смонтированной, и без этого баннер и плитка вели бы в «Ответы
  // уже приняты». Первый показ пропускается — хук уже сходил за данными при монтировании
  // (тот же приём, что у `LessonCardScreen`).
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) reloadSurveys(true);
      else focusedBefore.current = true;
    }, [reloadSurveys]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        reload(true), reloadGrades(), reloadSubjects({ silent: true }), reloadSurveys(true),
        reloadAttendance(true),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [reload, reloadGrades, reloadSubjects, reloadSurveys, reloadAttendance]);

  const openLesson = useCallback(
    (lesson) => nav?.('lesson', { ...lesson, childId: null, childName: null }),
    [nav],
  );

  // `origin` едет вместе с названием: экран прохождения называет тест тестом ещё до того, как
  // загрузил его сам.
  const openSurvey = useCallback(
    (survey) => nav?.('survey-take', { surveyId: survey.surveyId, title: survey.title, origin: survey.origin }),
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
        paddingBottom: insets.bottom + BOTTOM_CHROME_HEIGHT,
      }}>
      <HomeHeader
        title={`Привет, ${greetingName(profile, displayName)}!`}
        subtitle={formatHomeDate(data?.date)}
      />

      <ScanQrTile onPress={() => nav?.('attendance-scan')} />

      {/* Опрос — сразу под сканером и над «Сегодня», как в макете: ниже он оказался бы
          под прокруткой расписания и оценок. Сканер при этом остаётся первым — его
          открывают каждый день и по звонку, а опрос раз в четверть. */}
      <ActiveSurveysBlock surveys={surveys} onOpenSurvey={openSurvey} />

      <ActivePsychTestsBlock surveys={surveys} onOpenSurvey={openSurvey} />

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

      {/* Разделы — плитками подряд, без заголовка секции (Figma 2170:5003). */}
      <LearnerHomeTile
        icon="award"
        title="Оценки по предметам"
        subtitle={gradeLine || 'Оценок за четверть пока нет'}
        onPress={() => nav?.('diary')}
      />
      <LearnerHomeTile
        icon="calendarCheck"
        tone="markPresent"
        iconSize={20}
        title="Посещаемость"
        subtitle={summaryTileLine(attendance.summary) || 'Календарь за месяц'}
        onPress={() => nav?.('attendance')}
      />
    </Screen>
  );
}
