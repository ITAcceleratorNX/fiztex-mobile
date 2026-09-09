import { useCallback, useEffect, useState } from 'react';
import { View, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkApi, homeworkFiles, authHeaders } from '@shared/api/homeworkApi';
import { pickPhotos } from './attachments';

/**
 * Сколько из выбранных снимков влезает и что сказать про остальные.
 *
 * Вынесено из компонента, потому что это единственное решение экрана, которое можно
 * ошибиться: отправлять четвёртую фотографию, зная, что разрешено три, значит платить
 * трафиком за гарантированный отказ, а промолчать про отброшенные — обещать ученику,
 * что приложено всё. Проверяется `scripts/verify-answer-photos.cjs`.
 *
 * Лимит здесь не решается, а повторяется: считает его сервер по `maxPhotos` вопроса.
 */
export function fitPickedPhotos(picked, remaining) {
  const accepted = picked.slice(0, Math.max(0, remaining));
  const dropped = picked.length - accepted.length;
  return {
    accepted,
    notice:
      dropped > 0
        ? `Приложено ${accepted.length} из выбранных ${picked.length}: больше к этому вопросу нельзя.`
        : null,
  };
}

/**
 * Фотографии решения к открытому вопросу теста (AIGRADE-003).
 *
 * <p><b>Почему снимок уезжает сразу, а не вместе с работой.</b> Тест отправляется одним
 * запросом, и вложить в него фотографии значило бы отправлять десять мегабайт вместе с
 * ответами: на школьном Wi-Fi такой запрос срывается и уносит с собой набранный текст.
 * Здесь снимок уходит сразу после выбора, маленьким запросом, и ждёт отправки на сервере.
 *
 * <p>Отсюда и главное поведение экрана: <b>к каждой карточке — своё состояние</b>. Загрузка
 * одной фотографии не блокирует ни ответ на вопрос, ни соседние вопросы; отказ показывается
 * строкой под лентой и не мешает сдать работу без фото.
 */
export function AnswerPhotos({ homeworkId, question }) {
  const { c } = useTheme();
  const { token } = useAuth();
  const maxPhotos = question.maxPhotos ?? 1;

  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setPhotos((await homeworkApi.answerPhotos(token, homeworkId, question.id)) ?? []);
    } catch {
      // Список — не то, ради чего стоит показывать ошибку на экране сдачи: ученик всё
      // равно увидит её при попытке приложить фото, и там она будет к месту.
    }
  }, [token, homeworkId, question.id]);

  useEffect(() => {
    load();
  }, [load]);

  const remaining = maxPhotos - photos.length;

  async function add() {
    if (busy || remaining <= 0) return;
    const picked = await pickPhotos();
    if (picked.length === 0) return;

    const { accepted, notice } = fitPickedPhotos(picked, remaining);

    setBusy(true);
    setError(null);
    try {
      // По одной и по порядку: страницы решения должны читаться в том порядке, в котором
      // их выбрал ученик, а параллельная загрузка его не сохраняет.
      for (const photo of accepted) {
        const saved = await homeworkApi.uploadAnswerPhoto(token, homeworkId, question.id, photo);
        setPhotos((prev) => [...prev, saved]);
      }
      if (notice) setError(notice);
    } catch (e) {
      setError(e?.message || 'Не удалось приложить фото. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(photoId) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await homeworkApi.deleteAnswerPhoto(token, homeworkId, photoId);
      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    } catch (e) {
      setError(e?.message || 'Не удалось удалить фото');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8, paddingTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt style={{ fontSize: 13, fontWeight: '600', color: c.inkMuted }}>Фото решения</Txt>
        <Txt style={{ fontSize: 12, color: c.inkMuted }}>
          {photos.length} из {maxPhotos}
        </Txt>
        {busy ? <ActivityIndicator size="small" color={c.inkMuted} /> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {photos.map((photo) => (
            <View key={photo.id}>
              <Image
                source={{
                  uri: homeworkFiles.myAnswerPhoto(homeworkId, photo.id),
                  headers: authHeaders(token),
                }}
                style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: c.bg2 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Удалить ${photo.fileName || 'фотографию'}`}
                onPress={() => remove(photo.id)}
                hitSlop={8}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.bg,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Icon name="x" size={14} color={c.inkMuted} />
              </Pressable>
            </View>
          ))}

          {remaining > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Приложить фото решения"
              onPress={add}
              disabled={busy}
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: c.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: busy ? 0.5 : 1,
              }}
            >
              <Icon name="camera" size={20} color={c.inkMuted} />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {error ? <Txt style={{ fontSize: 12, color: c.red }}>{error}</Txt> : null}
    </View>
  );
}
