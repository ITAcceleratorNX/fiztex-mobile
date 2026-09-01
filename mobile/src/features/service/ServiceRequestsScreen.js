import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { useAuth } from '@features/auth/AuthContext';
import { authHeaders } from '@shared/api/upload';
import { useAuth as useSession } from '@features/auth/AuthContext';
import { useMyProfile } from '@shared/hooks/useProfile';
import {
  useExecutorRequests, useServiceQueue, useServiceRequestList,
} from '@shared/hooks/useServiceRequests';
import { isExecutorRole } from '@shared/api/serviceRequestsMap';
import { CreateFab, SectionTabs, ServiceHeader, ServiceRequestCard } from './components';
import { ServiceListEmpty, ServiceListError, ServiceListSkeleton } from './ServiceStates';

/**
 * Разделы «Мои заявки» и «История» (ТЗ SERVICE-FE-002 §3–§5, Figma «Сервисные заявки»
 * 1114:7948 и 1118:19046).
 *
 * Один экран на два раздела, а не два: карточка в них одна и та же (§5), а различаются
 * они только набором статусов — и этот набор задан на сервере, не разбором пришедшей
 * страницы. Заявка не может оказаться сразу в обоих: наборы не пересекаются (§3), и
 * после смены статуса она уходит в свой раздел сама.
 *
 * @param {boolean} root экран открыт как вкладка (администратор, охрана) — тогда у него
 *   нет ни «Назад», ни места под ним: под ним стоит панель вкладок
 */
export function ServiceRequestsScreen({ nav, root = false }) {
  const { c } = useTheme();
  const { token } = useAuth();
  const { role } = useSession();
  const insets = useSafeAreaInsets();
  const executor = isExecutorRole(role);
  // Кем сотрудник приходится строке списка — по нему карточка подписывает «Вы автор» /
  // «Вы исполнитель» (§5).
  const { profile } = useMyProfile();
  const accountId = profile?.accountId ?? null;
  const [section, setSection] = useState('ACTIVE');

  // Разделов у исполнителя три (§2): к своим заявкам добавляется общая очередь службы.
  // Вкладки «В работе» среди них нет и не будет — это статус, а не раздел.
  const tabs = executor
    ? [
        { value: 'QUEUE', label: 'Общая очередь' },
        { value: 'ACTIVE', label: 'Мои заявки' },
        { value: 'HISTORY', label: 'История' },
      ]
    : [
        { value: 'ACTIVE', label: 'Мои заявки' },
        { value: 'HISTORY', label: 'История' },
      ];

  // Три источника, но экран один: очередь, свои заявки исполнителя (назначенные плюс
  // собственные, §5) и обычный авторский список. Хуки нельзя вызывать по условию,
  // поэтому вызываются все, а лишние сами ничего не грузят.
  const queue = useServiceQueue({ enabled: executor && section === 'QUEUE' });
  const mine = useExecutorRequests(section === 'QUEUE' ? 'ACTIVE' : section, {
    enabled: executor && section !== 'QUEUE',
  });
  const authored = useServiceRequestList(section === 'QUEUE' ? 'ACTIVE' : section, {
    enabled: !executor,
  });

  const source = section === 'QUEUE' ? queue : executor ? mine : authored;
  const { loading, error, rows, reload, refresh, refreshing } = source;
  const headers = useMemo(() => authHeaders(token), [token]);

  // Заявка, созданная или удалённая на другом экране, меняет этот список. Перечитывание
  // на фокусе — то же, что делают ленты ДЗ: возврат «назад» обязан показывать результат,
  // а не состояние, снятое до действия.
  //
  // Первый фокус пропускается: экран уже грузит себя сам при монтировании, и без этого
  // при каждом открытии раздела уходило бы по два запроса на статус.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) reload(true);
      else focusedBefore.current = true;
    }, [reload]),
  );

  return (
    <Screen scroll={false}>
      <ServiceHeader title="Сервисные заявки" onBack={root ? undefined : nav.back} />

      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <SectionTabs value={section} onChange={setSection} tabs={tabs} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + (root ? 190 : 120),
          gap: 14,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.ink3} />
        }
      >
        <Body
          loading={loading}
          error={error}
          rows={rows}
          section={section}
          headers={headers}
          accountId={accountId}
          onRetry={() => reload()}
          onOpen={(id) => nav('service-request', { requestId: id })}
        />
      </ScrollView>

      <CreateFab
        onPress={() => nav('service-request-create')}
        bottom={insets.bottom + (root ? 92 : 20)}
      />
    </Screen>
  );
}

function Body({ loading, error, rows, section, headers, accountId, onRetry, onOpen }) {
  if (loading) return <ServiceListSkeleton />;
  if (error) return <ServiceListError onRetry={onRetry} />;
  if (rows.length === 0) return <ServiceListEmpty section={section} />;

  return (
    <>
      {rows.map((request) => (
        <ServiceRequestCard
          key={request.id}
          request={request}
          headers={headers}
          accountId={accountId}
          onPress={() => onOpen(request.id)}
        />
      ))}
    </>
  );
}
