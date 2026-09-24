import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { Banner, Card, PrimaryButton, ScreenHeader } from '@shared/components/ui';
import { SummaryDocument } from '@shared/components/SummaryDocument';
import { useTheme } from '@shared/theme/ThemeContext';
import { DOCUMENT as d } from '@shared/theme/tokens';
import { useLessonSummary } from '@shared/hooks/useLessonSummary';

export function LessonSummaryScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useLessonSummary(payload?.lessonInstanceId, payload?.childId);
  const [refreshing, setRefreshing] = useState(false);
  // Staff see the draft first. Learners receive only the published content from the API.
  const staff = payload?.staff || data?.latestJob != null || data?.canEdit || data?.publishedContent != null || data?.hasUnpublishedChanges;
  return (
    <Screen scroll style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + d.sectionGap }}
      refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true);
        try { await reload(true); } finally { setRefreshing(false); }
      }}>
      <ScreenHeader title="Конспект урока" back={() => nav?.back?.()} />
      <View style={{ width: '100%', maxWidth: d.maxWidth, alignSelf: 'center', paddingHorizontal: d.gutter, gap: d.gap }}>
        {loading ? <ActivityIndicator accessibilityLabel="Загружаем конспект" color={c.blue} /> :
          error ? <Card>
            <Txt style={{ color: c.ink, fontSize: d.bodySize, lineHeight: d.bodyLine }}>{error}</Txt>
            <PrimaryButton title="Повторить" onPress={() => reload()} />
          </Card> : <>
            {staff ? <Banner tone="soft" icon="textbook">
              {data.publishedAt
                ? data.hasUnpublishedChanges ? 'Показан черновик. Ученики видят предыдущую опубликованную версию.' : 'Оба блока опубликованы для учеников.'
                : 'Черновик виден только сотрудникам.'}
              {' '}Редактировать и публиковать конспект можно в веб-версии.
            </Banner> : null}
            {data?.content ? <Card style={{ padding: d.inset }}>
              <SummaryDocument content={data.content} />
            </Card> : <Card>
              <Txt style={{ color: c.ink, fontSize: d.headingSize, lineHeight: d.headingLine, fontWeight: '700' }}>
                {staff ? 'Конспект ещё не создан' : 'Конспект пока не опубликован'}
              </Txt>
              <Txt style={{ color: c.ink, fontSize: d.bodySize, lineHeight: d.bodyLine }}>
                {staff ? 'Создайте его из учебника или материала урока в веб-версии.' : 'Оба блока появятся здесь после публикации учителем.'}
              </Txt>
            </Card>}
          </>}
      </View>
    </Screen>
  );
}
