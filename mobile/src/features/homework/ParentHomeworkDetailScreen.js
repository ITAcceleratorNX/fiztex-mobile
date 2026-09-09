import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import { MathText } from '@shared/math/MathText';
import Icon from '@shared/components/Icon';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkFiles, authHeaders } from '@shared/api/homeworkApi';
import { closedNotice, dueLong, stamp, subjectLine } from '@shared/api/homeworkMap';
import { gradeTypeLabel } from '@shared/api/gradesMap';
import { useChildHomework } from '@shared/hooks/useHomework';
import { useMyHomeworkGrade } from '@shared/hooks/useGrades';
import { Pill } from '@shared/components/ui';
import { plural } from '@shared/format';
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

/**
 * Задание ребёнка глазами родителя (ТЗ HOMEWORK-005.3, Figma «Родитель ДЗ (деталь) — …»
 * 902:14745…15121).
 *
 * Экран только читает — и читает не всё. Родитель видит задание, состояние работы и
 * обратную связь учителя, но не сам ответ: ни текста, ни фотографий, ни файлов, ни
 * версий. Это не решение экрана: бэк отдаёт `ChildHomeworkView`, в котором содержимого
 * ответа нет вовсе, — и добавить сюда «ещё немного» нельзя, даже случайно.
 *
 * Отсюда же и отсутствие формы: симметричного действия у этой карточки не существует,
 * отправка живёт только у ученика.
 */
export function ParentHomeworkDetailScreen({ nav, payload }) {
  const homeworkId = payload?.homeworkId;
  const childId = payload?.childId;
  const { token } = useAuth();
  const { loading, error, data, reload } = useChildHomework(homeworkId, childId);
  // Оценка приходит своим запросом: карточка задания её не несёт, а учительский список
  // по заданию отдаёт весь класс и родителя туда не пускает.
  const { grade } = useMyHomeworkGrade(homeworkId, { childStudentProfileId: childId });
  const headers = useMemo(() => authHeaders(token), [token]);

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
  const work = data.work ?? {};
  const row = { status: data.status, submissionStatus: work.status };

  return (
    <Screen scroll={false}>
      <BackRow onPress={nav.back} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        <Header homework={data} row={row} />

        {notice ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Notice tone="danger">{notice}</Notice>
          </View>
        ) : null}

        {data.updatedAfterPublish && !notice ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Notice tone="warn">Задание обновлено</Notice>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 6 }}>
          <DueLine homework={data} />
          {data.description ? <Description text={data.description} /> : null}
        </View>

        {(data.materials ?? []).length > 0 ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
            <SectionLabel>Материалы учителя</SectionLabel>
            <ChipRow>
              {data.materials.map((material) => (
                <MaterialChip key={material.id} homeworkId={data.id} material={material} />
              ))}
            </ChipRow>
          </View>
        ) : null}

        <Divider style={{ marginHorizontal: 16 }} />

        <Work homework={data} childId={childId} work={work} headers={headers} grade={grade} />
      </ScrollView>
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

/** Шапка родительской карточки: к предмету и классу добавлен учитель — кому писать. */
function Header({ homework, row }) {
  const { c } = useTheme();
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
          {homework.title}
        </Txt>
        <Txt style={{ fontSize: 13, fontWeight: '400', color: c.inkMuted }}>
          {subjectLine(homework)}
        </Txt>
        {homework.teacherName ? (
          <Txt style={{ fontSize: 13, fontWeight: '400', color: c.ink3 }}>
            Учитель: {homework.teacherName}
          </Txt>
        ) : null}
        {/* Тест выглядит для родителя иначе не оформлением, а сутью: ребёнок отвечает в
            приложении, а не в тетради, и «сделал ли» проверяется отправкой, а не
            фотографией. Число вопросов — единственное, что об этом говорит, и бэк
            присылает его именно для этого (ChildHomeworkView.questionCount). */}
        {homework.answerFormat === 'TEST' ? (
          <View style={{ flexDirection: 'row', paddingTop: 2 }}>
            <Pill color="blue">
              {`Тест · ${homework.questionCount} ${plural(homework.questionCount, ['вопрос', 'вопроса', 'вопросов'])}`}
            </Pill>
          </View>
        ) : null}
      </View>
      <StatusChip row={row} size="md" />
    </View>
  );
}

function DueLine({ homework }) {
  const { c } = useTheme();
  return (
    <Txt style={{ fontSize: 13, fontWeight: '400', color: c.ink3 }}>{dueLong(homework)}</Txt>
  );
}

/**
 * Описание задания. Через MathText, а не Txt: конспект от модели приходит с формулами
 * в $…$ (так велит промпт генерации), и родителю незачем видеть \frac вместо дроби.
 * Для текста без формул MathText отдаёт тот же обычный Txt.
 */
function Description({ text }) {
  const { c } = useTheme();
  return (
    <MathText
      text={text}
      style={{ fontSize: 14, fontWeight: '400', lineHeight: 20, color: c.inkMuted }}
    />
  );
}

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
 * Состояние работы ребёнка.
 *
 * Показывается факт и обратная связь: сдал или нет, когда, что ответил учитель. Что
 * именно ребёнок написал и приложил, остаётся между ним и учителем — этого нет ни в
 * ответе бэка, ни здесь.
 */
function Work({ homework, childId, work, headers, grade }) {
  const { c } = useTheme();
  const review = work.lastReview;
  const photos = review?.photos ?? [];
  const uriFor = (photo) => homeworkFiles.childReviewPhoto(homework.id, childId, photo.id);

  return (
    <View style={{ paddingTop: 16, gap: 12 }}>
      {review ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {work.status === 'DONE' ? (
            <>
              <SectionLabel>Обратная связь</SectionLabel>
              <FeedbackBox title="Комментарий" text={review.comment} highlighted={false}>
                <PhotoStrip
                  photos={photos}
                  label="Фото от учителя"
                  headers={headers}
                  uriFor={uriFor}
                />
              </FeedbackBox>
            </>
          ) : (
            <FeedbackBox text={review.comment}>
              <PhotoStrip
                photos={photos}
                label="Фото от учителя"
                headers={headers}
                uriFor={uriFor}
              />
            </FeedbackBox>
          )}
        </View>
      ) : null}

      <GradeLine grade={grade} />

      <SubmittedLine homework={homework} work={work} />

      <StatusHint>{waitingFor(homework, work)}</StatusHint>
    </View>
  );
}

/**
 * Оценка за задание — то, ради чего родитель чаще всего сюда и заходит.
 *
 * Оценки может не быть по двум разным причинам — не проверили или её тут не ставят, — и
 * различить их родителю нечем: бэк не сообщает, собирается ли учитель оценивать это
 * задание. Поэтому строки просто нет: пустое «Оценка: —» читалось бы как «поставили
 * ничего».
 */
function GradeLine({ grade }) {
  const { c } = useTheme();
  if (!grade?.scaleCode) return null;
  return (
    <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          minWidth: 34,
          height: 34,
          paddingHorizontal: 8,
          borderRadius: 10,
          backgroundColor: c.blue,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{grade.scaleCode}</Txt>
      </View>
      <Txt style={{ fontSize: 13, fontWeight: '500', color: c.inkMuted }}>
        {gradeTypeLabel(grade.gradeType)}
      </Txt>
    </View>
  );
}

/**
 * «Отправлено 15 окт, 09:12» — единственный след ответа, доступный родителю. Число
 * попыток рядом только когда их было больше одной: «попытка 1 из 1» ничего не сообщает.
 */
function SubmittedLine({ homework, work }) {
  const { c } = useTheme();
  const at = stamp(work.lastSubmittedAt);
  if (!at) return null;
  // У теста «отправлено» звучит как отправленный файл, хотя ребёнок отвечал на вопросы
  // в приложении. Слово другое, факт тот же.
  const isTest = homework?.answerFormat === 'TEST';
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Txt style={{ fontSize: 13, fontWeight: '400', color: c.inkMuted }}>
        {isTest ? 'Пройден' : 'Отправлено'}: {at}
        {work.attemptCount > 1
          ? ` · ${isTest ? 'попыток' : 'отправок'}: ${work.attemptCount}`
          : ''}
      </Txt>
    </View>
  );
}

/** Чего ждёт эта работа — курсивная строка внизу карточки. */
function waitingFor(homework, work) {
  if (homework.status === 'CANCELLED') return 'Задание отменено';
  const isTest = homework.answerFormat === 'TEST';
  if (homework.status === 'COMPLETED') {
    return work.status === 'DONE' ? 'Работа принята учителем' : 'Задание закрыто';
  }
  switch (work.status) {
    case 'SUBMITTED':
      return 'Ожидает проверки учителем';
    case 'RETURNED':
      return 'Ожидает исправленного ответа от ученика';
    case 'DONE':
      return 'Работа принята учителем';
    default:
      // Для теста «ответ не отправлен» непонятно: ребёнок его не пишет, а проходит.
      return isTest ? 'Тест пока не пройден' : 'Ответ пока не отправлен';
  }
}
