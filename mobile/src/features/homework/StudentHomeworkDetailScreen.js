import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { ConfirmDialog } from '@shared/components/ui';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkFiles, authHeaders } from '@shared/api/homeworkApi';
import {
  closedNotice,
  dueLong,
  excerpt,
  isClosed,
  stamp,
  subjectLine,
} from '@shared/api/homeworkMap';
import { useMyHomework, useHomeworkSubmit } from '@shared/hooks/useHomework';
import {
  ChipRow,
  Divider,
  FeedbackBox,
  FileChip,
  Notice,
  PhotoStrip,
  SectionLabel,
  StatusChip,
  StatusHint,
} from './components';
import { HomeworkCardSkeleton, HomeworkError, HomeworkMissing } from './HomeworkStates';
import { pickFiles, pickPhotos, sizeLabel } from './attachments';

/**
 * Задание ученика: просмотр и отправка (ТЗ HOMEWORK-003, Figma «Ученик ДЗ — …»
 * 897:26384…27721 и 901:14521…14616).
 *
 * Один экран на все состояния работы, а не пять: задание, срок и материалы в них
 * одинаковы, различается только нижняя половина. Что именно там показать, решает не
 * набор флагов, а два ответа бэка — `submission.status` и `submission.canSubmit`;
 * своей логики «можно ли сдавать» экран не заводит, иначе она разошлась бы с сервером
 * ровно в момент, когда учитель завершил задание.
 */
export function StudentHomeworkDetailScreen({ nav, payload }) {
  const homeworkId = payload?.homeworkId;
  const { c } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { loading, error, data, reload } = useMyHomework(homeworkId);

  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState([]);
  const [files, setFiles] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);

  const onSuccess = useCallback(() => {
    setBody('');
    setPhotos([]);
    setFiles([]);
    setSent(true);
    reload(true);
  }, [reload]);

  const { submit, sending, error: sendError, clearError } = useHomeworkSubmit(homeworkId, { onSuccess });

  // Выбор идёт до setState: `await` внутри обновляющей функции не работает — она
  // синхронная, и React вызвал бы её (возможно, дважды) до того, как пикер ответит.
  const addPhotos = useCallback(async () => {
    const picked = await pickPhotos();
    if (picked.length) setPhotos((prev) => [...prev, ...picked]);
  }, []);

  const addFiles = useCallback(async () => {
    const picked = await pickFiles();
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
  }, []);

  const submission = data?.submission;
  const canSubmit = submission?.canSubmit === true;
  const headers = useMemo(() => authHeaders(token), [token]);
  // Пустую работу отправлять нечем: ни текста, ни вложений — отправлять нечего.
  const hasAnswer = body.trim().length > 0 || photos.length > 0 || files.length > 0;

  if (loading) {
    return (
      <Screen scroll={false}>
        <BackRow onPress={nav.back} />
        <HomeworkCardSkeleton />
      </Screen>
    );
  }

  if (error === 'missing' || (!data && !error)) {
    return (
      <Screen scroll={false}>
        <BackRow onPress={nav.back} />
        <HomeworkMissing onBack={nav.back} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false}>
        <BackRow onPress={nav.back} />
        <HomeworkError onRetry={() => reload()} />
      </Screen>
    );
  }

  const notice = closedNotice(data);
  const showForm = canSubmit;

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <BackRow onPress={nav.back} />

        <ScrollView
          contentContainerStyle={{ paddingBottom: showForm ? 24 : 130 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CardHeader homework={data} submission={submission} />

          {notice ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <Notice tone="danger">{notice}</Notice>
            </View>
          ) : null}

          {/* «Задание обновлено» — учитель правил условие после публикации (HOMEWORK-002 §7).
              Плашка нужна и на уже отправленной работе: возможно, сдавали по старому тексту. */}
          {data.updatedAfterPublish && !notice ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <Notice tone="warn">Задание обновлено</Notice>
            </View>
          ) : null}

          <Assignment homework={data} />

          <Divider style={{ marginHorizontal: 16 }} />

          <Work
            homework={data}
            submission={submission}
            headers={headers}
            showForm={showForm}
            body={body}
            onBody={setBody}
            photos={photos}
            files={files}
            onAddPhotos={addPhotos}
            onAddFiles={addFiles}
            onDropPhoto={(i) => setPhotos((prev) => prev.filter((_, k) => k !== i))}
            onDropFile={(i) => setFiles((prev) => prev.filter((_, k) => k !== i))}
          />

          {sendError ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <Notice tone="danger">{sendError}</Notice>
              <Pressable onPress={clearError} style={{ paddingTop: 8, alignSelf: 'center' }}>
                <Txt style={{ fontSize: 13, fontWeight: '600', color: c.blue }}>Скрыть</Txt>
              </Pressable>
            </View>
          ) : null}

          {/* Успех подтверждается отдельно от статуса: чип «На проверке» появится и сам,
              а «Работа отправлена» отвечает на вопрос «дошло ли только что нажатое». */}
          {sent && !sendError ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <SuccessNotice onHide={() => setSent(false)} />
            </View>
          ) : null}
        </ScrollView>

        {showForm ? (
          <SubmitBar
            disabled={!hasAnswer}
            busy={sending}
            onPress={() => setConfirming(true)}
          />
        ) : null}
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirming}
        title="Отправить работу?"
        message="После отправки изменить ответ можно будет только если учитель вернёт работу на исправление."
        cancelLabel="Отмена"
        confirmLabel="Отправить"
        busy={sending}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          const ok = await submit({ body: body.trim() || undefined, photos, files });
          setConfirming(false);
          return ok;
        }}
      />
    </Screen>
  );
}

function BackRow({ onPress }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Назад"
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          paddingVertical: 4,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.4} />
        <Txt style={{ fontSize: 14, fontWeight: '500', color: c.blue }}>Назад</Txt>
      </Pressable>
    </View>
  );
}

/** Шапка: название, предмет с классом и чип статуса работы. */
function CardHeader({ homework, submission }) {
  const { c } = useTheme();
  const row = { status: homework?.status, submissionStatus: submission?.status };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt style={{ fontSize: 18, fontWeight: '800', lineHeight: 22, color: c.ink }}>
          {homework?.title}
        </Txt>
        <Txt style={{ fontSize: 13, fontWeight: '400', color: c.inkMuted }}>
          {subjectLine(homework)}
        </Txt>
      </View>
      <StatusChip row={row} size="md" />
    </View>
  );
}

/** Условие задания: срок, текст и материалы учителя. */
function Assignment({ homework }) {
  const { c } = useTheme();
  const materials = homework?.materials ?? [];

  return (
    <View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 6 }}>
        <Txt style={{ fontSize: 13, fontWeight: '400', color: c.ink3 }}>{dueLong(homework)}</Txt>
        {homework?.description ? (
          <Txt style={{ fontSize: 14, fontWeight: '400', lineHeight: 20, color: c.inkMuted }}>
            {homework.description}
          </Txt>
        ) : null}
      </View>

      {materials.length > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
          <SectionLabel>Материалы учителя</SectionLabel>
          <ChipRow>
            {materials.map((material) => (
              <MaterialChip key={material.id} homeworkId={homework.id} material={material} />
            ))}
          </ChipRow>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Материал учителя. Ссылка уходит в браузер, файл — в системный просмотрщик по своему
 * адресу; заголовок авторизации к внешнему открытию не приложить, поэтому файл
 * открывается только там, где ссылка сама несёт доступ.
 */
function MaterialChip({ homeworkId, material }) {
  const isLink = material.kind === 'LINK';
  const label = isLink ? material.url : material.fileName || 'Файл';
  return (
    <FileChip
      label={label}
      icon={isLink ? 'chevronRight' : material.kind === 'PHOTO' ? 'camera' : 'paperclip'}
      onPress={() => {
        const url = isLink ? material.url : homeworkFiles.material(homeworkId, material.id);
        Linking.openURL(url).catch(() => {});
      }}
    />
  );
}

/**
 * Нижняя половина карточки — работа ученика.
 *
 * Порядок блоков задан состоянием, а не набором условий подряд: на возвращённой работе
 * первым идёт комментарий учителя (без него непонятно, что исправлять), на принятой —
 * свой ответ, а обратная связь под ним как итог.
 */
function Work({
  homework,
  submission,
  headers,
  showForm,
  body,
  onBody,
  photos,
  files,
  onAddPhotos,
  onAddFiles,
  onDropPhoto,
  onDropFile,
}) {
  const { c } = useTheme();
  const status = submission?.status ?? 'NOT_SUBMITTED';
  const history = submission?.history ?? [];
  const current = submission?.currentAttempt;
  const lastReview = lastReviewOf(current);
  const closed = isClosed(homework);

  // Возврат: сначала комментарий учителя, потом прошлые ответы, потом форма.
  if (status === 'RETURNED') {
    const earlier = history.filter((attempt) => attempt.id !== current?.id);
    return (
      <View style={{ paddingTop: 12, gap: 12 }}>
        {lastReview ? (
          <View style={{ paddingHorizontal: 16 }}>
            <FeedbackBox text={lastReview.comment}>
              <PhotoStrip
                photos={lastReview.photos ?? []}
                label="Фото от учителя"
                headers={headers}
                uriFor={(photo) => homeworkFiles.myReviewPhoto(homework.id, photo.id)}
              />
            </FeedbackBox>
          </View>
        ) : null}

        <PreviousAttempts
          attempts={[...history].reverse()}
          homeworkId={homework.id}
          headers={headers}
        />

        {showForm ? (
          <AnswerForm
            title="Новый ответ"
            body={body}
            onBody={onBody}
            photos={photos}
            files={files}
            onAddPhotos={onAddPhotos}
            onAddFiles={onAddFiles}
            onDropPhoto={onDropPhoto}
            onDropFile={onDropFile}
          />
        ) : closed ? (
          <StatusHint>Задание закрыто — исправить ответ уже нельзя</StatusHint>
        ) : null}
      </View>
    );
  }

  // Работы нет вовсе.
  if (status === 'NOT_SUBMITTED') {
    if (showForm) {
      return (
        <View style={{ paddingTop: 12 }}>
          <AnswerForm
            title="Ваш ответ"
            body={body}
            onBody={onBody}
            photos={photos}
            files={files}
            onAddPhotos={onAddPhotos}
            onAddFiles={onAddFiles}
            onDropPhoto={onDropPhoto}
            onDropFile={onDropFile}
          />
        </View>
      );
    }
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
        <SectionLabel>Ваш ответ</SectionLabel>
        <Txt style={{ fontSize: 14, fontStyle: 'italic', color: c.ink3 }}>
          Ответ не был отправлен
        </Txt>
      </View>
    );
  }

  // Отправлено или принято: свой ответ, затем — если есть — обратная связь.
  return (
    <View style={{ paddingTop: 16, gap: 16 }}>
      <AttemptBlock attempt={current} homeworkId={homework.id} title="Ваш ответ" />

      {history.length > 1 ? (
        <PreviousAttempts
          attempts={[...history].reverse().filter((attempt) => attempt.id !== current?.id)}
          homeworkId={homework.id}
          headers={headers}
        />
      ) : null}

      {status === 'DONE' && lastReview ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Divider />
          <SectionLabel>Обратная связь</SectionLabel>
          <FeedbackBox title="Комментарий" text={lastReview.comment} highlighted={false}>
            <PhotoStrip
              photos={lastReview.photos ?? []}
              label="Фото от учителя"
              headers={headers}
              uriFor={(photo) => homeworkFiles.myReviewPhoto(homework.id, photo.id)}
            />
          </FeedbackBox>
        </View>
      ) : null}

      {status === 'SUBMITTED' ? <StatusHint>Ожидает проверки учителем</StatusHint> : null}
    </View>
  );
}

/** Одна отправка: текст, вложения и время. */
function AttemptBlock({ attempt, homeworkId, title }) {
  const { c } = useTheme();
  if (!attempt) return null;
  const attachments = [...(attempt.photos ?? []), ...(attempt.files ?? [])];

  return (
    <View style={{ paddingHorizontal: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>{title}</SectionLabel>
        <Txt style={{ fontSize: 13, fontWeight: '400', color: c.ink3 }}>
          {stamp(attempt.submittedAt)}
        </Txt>
      </View>

      {attempt.body ? (
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Txt style={{ fontSize: 14, fontWeight: '400', lineHeight: 20, color: c.ink }}>
            {attempt.body}
          </Txt>
        </View>
      ) : null}

      {attachments.length > 0 ? (
        <ChipRow>
          {attachments.map((file) => (
            <FileChip
              key={file.id}
              label={file.fileName}
              onPress={() =>
                Linking.openURL(homeworkFiles.myAttachment(homeworkId, file.id)).catch(() => {})
              }
            />
          ))}
        </ChipRow>
      ) : null}
    </View>
  );
}

/**
 * Свои прошлые отправки. Свёрнуты, а не показаны целиком: актуален последний ответ,
 * а предыдущие нужны, только когда сверяешь, что уже исправлял (Figma «Множественный
 * возврат»). Комментарий последнего возврата подсвечен — это то, из-за чего работу
 * вернули в этот раз.
 */
function PreviousAttempts({ attempts, homeworkId, headers }) {
  const { c } = useTheme();
  const [openId, setOpenId] = useState(null);
  if (!attempts || attempts.length === 0) return null;

  const single = attempts.length === 1;

  return (
    <View style={{ paddingHorizontal: 16, gap: 8 }}>
      {/* Одна прошлая версия в заголовке не нуждается: он повторял бы подпись самой
          карточки. Список — нуждается: иначе непонятно, что это за стопка. */}
      {single ? null : (
        <Txt style={{ fontSize: 13, fontWeight: '400', color: c.inkMuted }}>Предыдущие ответы</Txt>
      )}

      {attempts.map((attempt, index) => {
        const open = openId === attempt.id;
        const review = lastReviewOf(attempt);
        const latestReturn = index === 0 && review?.decision === 'RETURNED';
        return (
          <View
            key={attempt.id}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              overflow: 'hidden',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpenId(open ? null : attempt.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                backgroundColor: pressed ? c.bg2 : 'transparent',
              })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>
                  {single
                    ? 'Предыдущий ответ'
                    : `Ответ ${attempt.attemptNumber} — ${stamp(attempt.submittedAt)}`}
                </Txt>
                {/* У единственной версии в подписи стоит сам ответ: комментарий, из-за
                    которого её вернули, уже показан выше целиком, и повторять его здесь
                    значит занять две строки тем, что читатель только что прочёл. */}
                {single ? (
                  <Txt style={{ fontSize: 13, fontWeight: '400', color: c.ink3 }} numberOfLines={1}>
                    {[stamp(attempt.submittedAt), excerpt(attempt.body)].filter(Boolean).join(' · ')}
                  </Txt>
                ) : review?.comment ? (
                  <Txt
                    style={{
                      fontSize: 13,
                      fontWeight: '400',
                      lineHeight: 18,
                      color: latestReturn ? c.red : c.inkMuted,
                    }}
                    numberOfLines={open ? undefined : 2}
                  >
                    Комментарий учителя: {review.comment}
                  </Txt>
                ) : (
                  <Txt style={{ fontSize: 13, fontWeight: '400', color: c.ink3 }} numberOfLines={1}>
                    {[stamp(attempt.submittedAt), excerpt(attempt.body)].filter(Boolean).join(' · ')}
                  </Txt>
                )}
              </View>
              <Icon
                name={open ? 'chevronDown' : 'chevronRight'}
                size={16}
                color={c.ink3}
                strokeWidth={2}
              />
            </Pressable>

            {open ? (
              <View style={{ paddingBottom: 12, gap: 8 }}>
                <Divider style={{ marginHorizontal: 12 }} />
                <View style={{ paddingTop: 4 }}>
                  <AttemptBlock
                    attempt={attempt}
                    homeworkId={homeworkId}
                    title={`Ответ ${attempt.attemptNumber}`}
                  />
                </View>
                {review?.photos?.length ? (
                  <View style={{ paddingHorizontal: 16 }}>
                    <PhotoStrip
                      photos={review.photos}
                      label="Фото от учителя"
                      headers={headers}
                      uriFor={(photo) => homeworkFiles.myReviewPhoto(homeworkId, photo.id)}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Форма ответа: текст и вложения. */
function AnswerForm({
  title,
  body,
  onBody,
  photos,
  files,
  onAddPhotos,
  onAddFiles,
  onDropPhoto,
  onDropFile,
}) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, gap: 10 }}>
      <SectionLabel>{title}</SectionLabel>

      <TextInput
        value={body}
        onChangeText={onBody}
        multiline
        textAlignVertical="top"
        placeholder="Напишите ваш ответ..."
        placeholderTextColor={c.ink3}
        style={{
          minHeight: 110,
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          color: c.ink,
          fontSize: 14,
          lineHeight: 20,
        }}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <AttachButton label="+ Прикрепить файл" onPress={onAddFiles} />
        <AttachButton label="+ Прикрепить фото" onPress={onAddPhotos} />
      </View>

      <PendingAttachments items={photos} onDrop={onDropPhoto} />
      <PendingAttachments items={files} onDrop={onDropFile} />
    </View>
  );
}

function AttachButton({ label, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: c.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink2 }}>{label}</Txt>
    </Pressable>
  );
}

/** Выбранные, но ещё не отправленные вложения — их можно убрать до отправки. */
function PendingAttachments({ items, onDrop }) {
  const { c } = useTheme();
  if (!items || items.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      {items.map((item, index) => (
        <View
          key={`${item.uri}-${index}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: c.hwChipBg,
          }}
        >
          <Icon name={item.kind === 'photo' ? 'camera' : 'paperclip'} size={14} color={c.ink2} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink }} numberOfLines={1}>
              {item.name}
            </Txt>
            {sizeLabel(item.sizeBytes) ? (
              <Txt style={{ fontSize: 11, color: c.ink3 }}>{sizeLabel(item.sizeBytes)}</Txt>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Убрать ${item.name}`}
            hitSlop={8}
            onPress={() => onDrop(index)}
          >
            <Icon name="x" size={16} color={c.ink3} strokeWidth={2.2} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/** Подтверждение успешной отправки — гасится вручную и при следующей загрузке карточки. */
function SuccessNotice({ onHide }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onHide}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: c.hwDoneTint,
      }}
    >
      <Icon name="check" size={16} color={c.hwDoneInk} strokeWidth={2.6} />
      <Txt style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.hwDoneInk }}>
        Работа отправлена учителю
      </Txt>
    </Pressable>
  );
}

/** Кнопка отправки на белой подложке — она не должна теряться в длинной карточке. */
function SubmitBar({ disabled, busy, onPress }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(16, insets.bottom + 8),
        backgroundColor: c.surface,
        borderTopWidth: 1,
        borderTopColor: c.border,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || busy }}
        onPress={disabled || busy ? undefined : onPress}
        style={({ pressed }) => ({
          height: 52,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled ? c.bg2 : c.green,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Txt style={{ fontSize: 16, fontWeight: '600', color: disabled ? c.ink3 : '#fff' }}>
            Отправить
          </Txt>
        )}
      </Pressable>
    </View>
  );
}

/** Последнее решение учителя по отправке: их может быть несколько, актуально последнее. */
function lastReviewOf(attempt) {
  const reviews = attempt?.reviews ?? [];
  return reviews.length > 0 ? reviews[reviews.length - 1] : null;
}
