import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@shared/components/Screen';
import { StateView } from '@shared/components/ui';
import { useMySchedule } from '@shared/hooks/useSchedule';
import { useMyProfile } from '@shared/hooks/useProfile';
import { HomeHeader, HomeSectionTitle, TeacherAgendaCard, TeacherGradesTile } from './HomeParts';
import { formatHomeDate, teacherName } from './homeDate';

/**
 * Главная учителя (Figma `glavnaya-teacher`).
 *
 * Учителю на главной нужен день, а не неделя: куда идти, в каком классе и в каком
 * кабинете. Поэтому строка сжата до трёх колонок, а всё остальное — во вкладках.
 *
 * Чипов оценок здесь нет намеренно: у учителя на уроке их два десятка, и одна оценка
 * в строке не значила бы ничего. Оценки живут на карточке урока и в журнале.
 */
export function TeacherHomeScreen({ nav }) {
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload, emptyMessage } = useMySchedule();
  const { profile, displayName } = useMyProfile();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload(true);
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const openLesson = useCallback((lesson) => nav?.('lesson', lesson), [nav]);

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

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} contentStyle={{
        gap: 24,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 100,
      }}>
      <HomeHeader
        title={teacherName(profile, displayName)}
        subtitle={formatHomeDate(data?.date)}
        topGap={16}
      />

      <View style={{ gap: 12 }}>
        <HomeSectionTitle compact>Расписание на сегодня</HomeSectionTitle>
        <TeacherAgendaCard
          lessons={lessons}
          onOpenLesson={openLesson}
          onShowAll={() => nav?.('schedule')}
          emptyText={loading ? 'Загружаем расписание…' : emptyMessage || 'Сегодня уроков нет'}
        />
      </View>

      <TeacherGradesTile
        title="Оценки"
        subtitle="Журнал и итоги четверти"
        onPress={() => nav?.('journal')}
      />
    </Screen>
  );
}
