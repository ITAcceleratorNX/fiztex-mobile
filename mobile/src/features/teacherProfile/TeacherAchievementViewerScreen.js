import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { ScreenHeader, StateView } from '@shared/components/ui';
import { useAuth } from '@features/auth/AuthContext';
import { API_BASE_URL } from '@shared/api/config';
import { authHeaders } from '@shared/api/upload';
import { achievementFileUrl } from '@shared/api/teacherProfileApi';
import { PdfPageViewer } from '@shared/pdf/PdfPageViewer';

/**
 * PDF достижения — тем же pdf.js-просмотрщиком, что учебник урока. Файл идёт под токеном
 * родителя и каждый раз заново проверяется сервером: закрытый или удалённый документ не
 * откроется, даже если профиль на экране ещё старый.
 */
export function TeacherAchievementViewerScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const achievement = payload?.achievement ?? null;
  const uri = achievement
    ? achievementFileUrl(payload?.childId, payload?.teacherId, achievement.id)
    : null;
  const headers = useMemo(() => authHeaders(token) ?? {}, [token]);

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  const onReady = useCallback((count) => { setPageCount(count); setPhase('ready'); }, []);
  const onError = useCallback(() => setPhase('error'), []);
  const retry = useCallback(() => { setPhase('loading'); setAttempt((value) => value + 1); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, backgroundColor: c.surface }}>
        <ScreenHeader
          title={achievement?.title || 'Документ'}
          sub={pageCount ? `Страница ${page} из ${pageCount}` : undefined}
          back={() => nav?.back?.()}
        />
      </View>

      <View style={{ flex: 1 }}>
        {uri ? (
          <PdfPageViewer
            key={attempt}
            uri={uri}
            headers={headers}
            baseUrl={API_BASE_URL}
            page={page}
            onReady={onReady}
            onPage={setPage}
            onError={onError}
          />
        ) : null}

        {phase === 'loading' && uri ? (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.blue} />
          </View>
        ) : null}

        {phase === 'error' || !uri ? (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
            <StateView
              icon="alertTriangle"
              tone="error"
              title="Документ недоступен"
              subtitle="Его могли закрыть или удалить. Если связь пропала — попробуйте ещё раз."
              actionLabel="Повторить"
              onAction={retry}
            />
          </View>
        ) : null}
      </View>

      {phase === 'ready' && pageCount > 1 ? (
        <View
          style={{
            flexDirection: 'row', height: 52, paddingBottom: insets.bottom,
            backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
          }}
        >
          <PageButton label="←" disabled={page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} c={c} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 16, fontWeight: '700', color: c.blue }}>{page}</Txt>
          </View>
          <PageButton label="→" disabled={page >= pageCount} onPress={() => setPage((value) => Math.min(pageCount, value + 1))} c={c} />
        </View>
      ) : null}
    </View>
  );
}

function PageButton({ label, disabled, onPress, c }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '←' ? 'Предыдущая страница' : 'Следующая страница'}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ width: 72, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : pressed ? 0.6 : 1 })}
    >
      <Txt style={{ fontSize: 20, fontWeight: '700', color: c.blue }}>{label}</Txt>
    </Pressable>
  );
}
