import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card, Pill, ScreenHeader, PrimaryButton } from '@shared/components/ui';
import { useAuth } from '@features/auth/AuthContext';
import { authHeaders } from '@shared/api/upload';
import { lessonFiles } from '@shared/api/lessonApi';
import { useLessonMaterials } from '@shared/hooks/useLesson';

/**
 * Материалы урока — конспект, презентация, фотография доски, ссылка.
 *
 * <p><b>Экран один на три роли.</b> Кто что видит, решает бэкенд: ученику и родителю
 * скрытые материалы не приходят вовсе, и счётчик на карточке урока считается по тому же
 * правилу. Отбирать список здесь ещё раз нельзя — это было бы второе место, где живёт
 * видимость, и первое же расхождение показало бы ученику чужой файл.
 *
 * <p><b>Экран только читает.</b> Загрузка, видимость и удаление остаются в вебе: урок
 * готовят за компьютером, а с телефона смотрят. Поэтому у учителя пустое состояние прямо
 * говорит, где материалы прикладывают, — иначе экран выглядит сломанным.
 *
 * Контракт — `.cursor/tasks/ai-homework/screens/LessonMaterialsMobile.md`.
 */
export function LessonMaterialsScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const lessonId = payload?.lessonInstanceId ?? null;
  const canManage = Boolean(payload?.canManage);
  const { loading, error, materials, reload } = useLessonMaterials(lessonId);
  const headers = useMemo(() => authHeaders(token), [token]);

  const [opened, setOpened] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload(true);
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const onOpen = useCallback((material) => {
    // Ссылка ведёт наружу и токена не требует — её отдаём системе. Файл, наоборот,
    // отдаётся только с заголовком авторизации, поэтому открывается внутри.
    if (material.isLink) {
      if (material.url) Linking.openURL(material.url).catch(() => {});
      return;
    }
    setOpened(material);
  }, []);

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + 32 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScreenHeader title="Материалы урока" back={() => nav?.back?.()} />

      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {loading ? (
          <View style={{ paddingVertical: 56, alignItems: 'center' }}>
            <ActivityIndicator color={c.blue} />
          </View>
        ) : error ? (
          <EmptyBody
            icon="alertTriangle"
            title="Не удалось загрузить материалы"
            subtitle={error}
            action={<PrimaryButton title="Повторить" onPress={() => reload()} />}
          />
        ) : materials.length === 0 ? (
          <EmptyBody
            icon="paperclip"
            title={canManage ? 'Материалов нет' : 'Учитель не приложил материалов'}
            subtitle={
              canManage
                ? 'Конспект, презентацию или ссылку прикладывают в веб-версии — там же по ним генерируется задание.'
                : 'Если они появятся, вы увидите их здесь.'
            }
          />
        ) : (
          materials.map((material) => (
            <MaterialRow key={material.id} material={material} onPress={() => onOpen(material)} />
          ))
        )}
      </View>

      <MaterialViewer
        material={opened}
        lessonId={lessonId}
        headers={headers}
        onClose={() => setOpened(null)}
      />
    </Screen>
  );
}

/**
 * Строка материала. Скрытый помечен словом, а не иконкой глаза: перечёркнутый глаз
 * требует догадки, подпись — нет. Пометка рисуется по самому полю без вопросов о роли —
 * скрытый материал доходит только до того, кому он положен.
 */
function MaterialRow({ material, onPress }) {
  const { c } = useTheme();
  const icon = material.isLink ? 'link' : material.isImage ? 'camera' : 'paperclip';

  return (
    <Card
      elevated
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.blueSoft,
        }}
      >
        <Icon name={icon} size={18} color={c.blue} strokeWidth={2} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink }} numberOfLines={1}>
          {material.title}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {material.sizeLabel ? (
            <Txt style={{ fontSize: 12, fontWeight: '400', color: c.ink3 }}>
              {material.sizeLabel}
            </Txt>
          ) : null}
          {material.hidden ? (
            <Pill color="gold" style={{ paddingVertical: 2, paddingHorizontal: 8, fontSize: 10 }}>
              Только для учителя
            </Pill>
          ) : null}
        </View>
      </View>

      <Icon name="chevronRight" size={16} color={c.ink3} />
    </Card>
  );
}

/**
 * Просмотр содержимого — наложением внутри приложения, а не системным браузером.
 *
 * <p>Причина техническая и жёсткая: файл отдаётся только с заголовком `Authorization`, а
 * `Linking.openURL` открывает браузер, который заголовка не пошлёт, — вместо конспекта
 * человек получил бы страницу с ошибкой. `Image` и `WebView` заголовки передавать умеют.
 *
 * <p>Оговорка: PDF внутри `WebView` рисует WKWebView на iOS, а Android — нет. Чинится
 * загрузкой во временный файл (`expo-file-system` + `expo-sharing`), это отдельное
 * решение с двумя новыми зависимостями.
 */
function MaterialViewer({ material, lessonId, headers, onClose }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!material || lessonId == null) return null;

  const uri = lessonFiles.material(lessonId, material.id);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: material.isImage ? 'rgba(0,0,0,0.9)' : c.bg }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Txt
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: '600',
              color: material.isImage ? '#fff' : c.ink,
            }}
          >
            {material.title}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть"
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: material.isImage ? 'rgba(255,255,255,0.15)' : c.surface,
            }}
          >
            <Icon name="x" size={18} color={material.isImage ? '#fff' : c.ink} />
          </Pressable>
        </View>

        {material.isImage ? (
          <Image
            source={{ uri, headers }}
            resizeMode="contain"
            style={{ flex: 1, width: '100%' }}
          />
        ) : (
          <WebView
            source={{ uri, headers }}
            style={{ flex: 1, backgroundColor: c.bg }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={c.blue} />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

/** Пустое состояние экрана. Своё, а не из `features/grades`: разделы не должны друг о друге знать. */
function EmptyBody({ icon, title, subtitle, action }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 56, gap: 20 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.bg2,
        }}
      >
        <Icon name={icon} size={26} color={c.ink3} strokeWidth={2} />
      </View>
      <View style={{ gap: 8 }}>
        <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center' }}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt
            style={{
              fontSize: 13,
              fontWeight: '400',
              lineHeight: 19,
              color: c.ink3,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {action}
    </View>
  );
}
