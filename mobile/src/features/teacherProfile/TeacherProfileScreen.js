import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Avatar, Card, ScreenHeader, StateView } from '@shared/components/ui';
import { useAuth } from '@features/auth/AuthContext';
import { fetchChildTeacherProfile } from '@shared/api/teacherProfileApi';
import { mapTeacherProfile, profileErrorText } from '@shared/api/teacherProfileMap';

/**
 * Профиль преподавателя для родителя (ТЗ «Достижения и сертификаты учителя» §5). Вход — имя
 * учителя в карточке урока. Отдельного профиля учителя в приложении не было, поэтому экран
 * минимальный: имя, предметы в классе ребёнка и открытые этому классу документы.
 *
 * Всё считается в контексте выбранного ребёнка (`childId` из карточки урока): у другого
 * ребёнка тот же учитель может открыть другие документы. Закрытые и аудитория публикации сюда
 * не приходят вовсе — фильтрует сервер.
 */
export function TeacherProfileScreen({ nav, payload }) {
  const { c } = useTheme();
  const { token } = useAuth();
  const childId = payload?.childId ?? null;
  const teacherId = payload?.teacherId ?? null;
  const [state, setState] = useState({ loading: true, error: null, profile: null });

  const load = useCallback(async () => {
    if (!childId || !teacherId) {
      setState({ loading: false, error: profileErrorText({ status: 404 }), profile: null });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const profile = mapTeacherProfile(await fetchChildTeacherProfile(childId, teacherId, token));
      setState({ loading: false, error: null, profile });
    } catch (error) {
      setState({ loading: false, error: profileErrorText(error), profile: null });
    }
  }, [childId, teacherId, token]);

  useEffect(() => { void load(); }, [load]);

  const { loading, error, profile } = state;
  const name = profile?.fullName || payload?.teacherName || 'Преподаватель';

  return (
    <Screen refreshing={loading && profile != null} onRefresh={() => void load()} contentStyle={{ padding: 16, gap: 16 }}>
      <ScreenHeader title="Преподаватель" back={() => nav?.back?.()} />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={name} size={48} color="blue" />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{name}</Txt>
            {profile?.subjects ? <Txt style={{ fontSize: 13, color: c.inkMuted }}>{profile.subjects}</Txt> : null}
          </View>
        </View>
      </Card>

      {loading && !profile ? <StateView title="Загрузка…" /> : null}
      {error ? (
        <StateView icon="alertTriangle" tone="error" title={error} actionLabel="Повторить" onAction={() => void load()} />
      ) : null}

      {profile ? (
        <View style={{ gap: 10 }}>
          <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Достижения</Txt>
          {profile.achievements.length === 0 ? (
            <StateView icon="award" title="Преподаватель пока не поделился достижениями" />
          ) : (
            profile.achievements.map((item) => (
              <Card
                key={item.id}
                onPress={() => nav('teacher-achievement', { childId, teacherId, achievement: item })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: c.blueSoft,
                    }}
                  >
                    <Icon name="fileText" size={20} color={c.blue} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{item.title}</Txt>
                    {item.meta ? <Txt style={{ fontSize: 12, color: c.inkMuted }}>{item.meta}</Txt> : null}
                    {item.description ? (
                      <Txt numberOfLines={2} style={{ fontSize: 13, color: c.ink2 || c.ink }}>{item.description}</Txt>
                    ) : null}
                  </View>
                  <Icon name="chevronRight" size={18} color={c.inkMuted} />
                </View>
              </Card>
            ))
          )}
        </View>
      ) : null}
    </Screen>
  );
}
