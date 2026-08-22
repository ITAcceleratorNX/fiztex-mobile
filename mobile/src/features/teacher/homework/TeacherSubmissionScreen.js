import React, { useCallback, useState } from 'react';
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { Banner, Card, FilledButton, OutlineButton, Pill, ScreenHeader, StateView } from '@shared/components/ui';
import { useAuth } from '@features/auth/AuthContext';
import { authHeaders, homeworkFiles } from '@shared/api/homeworkApi';
import { stamp } from '@shared/api/homeworkMap';
import { useSubmissionReview, useTeacherSubmission } from '@shared/hooks/useTeacherHomework';
import { ChipRow, Divider, FeedbackBox, FileChip, PhotoStrip, SectionLabel } from '@features/homework/components';
import { HomeworkCardSkeleton } from '@features/homework/HomeworkStates';
import { pickPhotos, sizeLabel } from '@features/homework/attachments';

const DECISION_LABELS = {
  DONE: 'Выполнено',
  RETURNED: 'Возвращено',
};

/**
 * Проверка работы ученика (ТЗ HOMEWORK-004 §5, §9).
 *
 * Решение всегда относится к конкретной версии работы: вместе с ним уходит
 * `expectedAttemptId`, и если ученик успел прислать новую, сервер откажет. Иначе учитель
 * принял бы одну работу, а подпись легла бы на другую.
 *
 * Возврат требует комментария не по прихоти экрана: «переделай» без объяснения — это
 * работа, которую ученик не знает, как исправить.
 */
export function TeacherSubmissionScreen({ nav, payload }) {
  const { homeworkId, studentProfileId, studentName } = payload ?? {};
  const { c } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const { loading, error, data, reload } = useTeacherSubmission(homeworkId, studentProfileId);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);

  const onSuccess = useCallback(async () => {
    setComment('');
    setPhotos([]);
    await reload(true);
  }, [reload]);

  const review = useSubmissionReview(homeworkId, studentProfileId, { onSuccess });

  const addPhotos = useCallback(async () => {
    const picked = await pickPhotos();
    if (picked.length) setPhotos((prev) => [...prev, ...picked]);
  }, []);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title={studentName || 'Работа ученика'} back={nav.back} />
        <HomeworkCardSkeleton />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ScreenHeader title={studentName || 'Работа ученика'} back={nav.back} />
        <StateView
          style={{ marginTop: 96 }}
          icon={error === 'load' ? 'alertTriangle' : 'lock'}
          tone={error === 'load' ? 'error' : 'default'}
          title={error === 'load' ? 'Не удалось загрузить' : 'Работа недоступна'}
          subtitle={
            error === 'load'
              ? 'Проверьте подключение к интернету'
              : 'Задание относится к урокам другого учителя'
          }
          actionLabel={error === 'load' ? 'Повторить' : 'Назад'}
          onAction={error === 'load' ? () => reload() : nav.back}
        />
      </Screen>
    );
  }

  const attempt = data.currentAttempt;
  const attemptId = attempt?.id;
  const decided = attempt?.reviews?.[attempt.reviews.length - 1] ?? null;
  const canDecide = Boolean(attemptId) && data.status !== 'NOT_SUBMITTED';
  const returning = review.sending === 'RETURNED';
  const accepting = review.sending === 'DONE';

  return (
    <Screen scroll={false}>
      <ScreenHeader
        title={studentName || data.studentFullName || 'Работа ученика'}
        back={nav.back}
        sub={data.attemptCount > 1 ? `Версия ${attempt?.attemptNumber ?? data.attemptCount}` : null}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 140, gap: 12 }}>
          {review.error ? <Banner icon="alertTriangle" tone="soft">{review.error}</Banner> : null}

          {!canDecide ? (
            <Banner icon="clock" tone="soft">
              Ученик ещё не отправил работу — решать нечего
            </Banner>
          ) : null}

          {attempt ? (
            <Card elevated style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionLabel>Ответ ученика</SectionLabel>
                <Txt style={{ fontSize: 12, color: c.ink3 }}>{stamp(attempt.submittedAt)}</Txt>
              </View>

              {attempt.body ? (
                <Txt style={{ fontSize: 14, lineHeight: 21, color: c.ink }}>{attempt.body}</Txt>
              ) : (
                <Txt style={{ fontSize: 14, color: c.ink3 }}>Текста в ответе нет</Txt>
              )}

              {attempt.photos?.length ? (
                <PhotoStrip
                  photos={attempt.photos}
                  uriFor={(photo) => homeworkFiles.submissionAttachment(homeworkId, studentProfileId, photo.id)}
                  headers={authHeaders(token)}
                  label="Фотографии работы"
                />
              ) : null}

              {attempt.files?.length ? (
                <ChipRow>
                  {attempt.files.map((file) => (
                    <FileChip
                      key={file.id}
                      label={`${file.fileName} · ${sizeLabel(file.sizeBytes)}`}
                    />
                  ))}
                </ChipRow>
              ) : null}

              {data.resubmitted ? (
                <Txt style={{ fontSize: 12, color: c.ink3 }}>
                  Это пересдача: предыдущие версии сохранены и не переписаны.
                </Txt>
              ) : null}
            </Card>
          ) : null}

          {decided ? (
            <Card elevated style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionLabel>Ваше решение</SectionLabel>
                <Pill color={decided.decision === 'DONE' ? 'green' : 'gold'}>
                  {DECISION_LABELS[decided.decision] ?? decided.decision}
                </Pill>
              </View>
              <Txt style={{ fontSize: 12, color: c.ink3 }}>{stamp(decided.createdAt)}</Txt>
              {decided.comment ? <FeedbackBox text={decided.comment} /> : null}
              {decided.photos?.length ? (
                <PhotoStrip
                  photos={decided.photos}
                  uriFor={(photo) => homeworkFiles.reviewPhoto(homeworkId, studentProfileId, photo.id)}
                  headers={authHeaders(token)}
                  label="Фотографии с пометками"
                />
              ) : null}
              <Divider />
              <Txt style={{ fontSize: 12, color: c.ink3, lineHeight: 17 }}>
                Решение не переписывается: новое ляжет рядом в историю проверок.
              </Txt>
            </Card>
          ) : null}

          {canDecide ? (
            <Card elevated style={{ gap: 10 }}>
              <SectionLabel>Комментарий ученику</SectionLabel>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Что исправить или за что похвалить"
                placeholderTextColor={c.ink3}
                multiline
                maxLength={2000}
                style={{
                  minHeight: 96,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 12,
                  textAlignVertical: 'top',
                  fontSize: 15,
                  color: c.ink,
                  backgroundColor: c.bg,
                }}
              />

              {photos.length ? (
                <ChipRow>
                  {photos.map((photo, index) => (
                    <FileChip
                      key={`${photo.uri}-${index}`}
                      icon="camera"
                      label={photo.name || `Фото ${index + 1}`}
                      onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                    />
                  ))}
                </ChipRow>
              ) : null}

              <OutlineButton onPress={addPhotos} disabled={review.sending != null}>
                Приложить фото с пометками
              </OutlineButton>
            </Card>
          ) : null}
        </ScrollView>

        {canDecide ? (
          <View
            style={{
              padding: 16,
              paddingBottom: insets.bottom + 16,
              gap: 10,
              borderTopWidth: 1,
              borderTopColor: c.border,
              backgroundColor: c.surface,
            }}
          >
            <FilledButton
              disabled={review.sending != null}
              onPress={() => review.decide('DONE', { expectedAttemptId: attemptId, comment, photos })}
            >
              {accepting ? 'Сохраняем…' : 'Принять работу'}
            </FilledButton>
            <OutlineButton
              size="lg"
              disabled={review.sending != null || comment.trim().length === 0}
              onPress={() => review.decide('RETURNED', { expectedAttemptId: attemptId, comment, photos })}
            >
              {returning ? 'Сохраняем…' : 'Вернуть на доработку'}
            </OutlineButton>
            {comment.trim().length === 0 ? (
              <Txt style={{ fontSize: 11, color: c.ink3, textAlign: 'center' }}>
                Возврат без комментария — это «переделай», из которого непонятно, что делать.
              </Txt>
            ) : null}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}
