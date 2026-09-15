import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { shadowSm } from '@shared/components/Screen';
import { initialsOf, childPillLabel, homeLessonWindow } from './homeDate';

/**
 * Общие блоки главного экрана (Figma `glavnaya-*`).
 *
 * Три роли делят шапку, карточку расписания и плитку оценок — различаются только
 * данными и составом строки. Поэтому здесь примитивы, а роли живут отдельными
 * экранами: развилка `if (role === …)` внутри одного экрана разошлась бы с макетами
 * при первой же правке одного из них.
 */

/** Шапка: имя и школьная дата. */
export function HomeHeader({ title, subtitle, topGap = 8 }) {
  const { c } = useTheme();
  // Отступ сверху — только этот: сам безопасный отступ под чёлку добавляет `Screen`,
  // и дублировать его в contentStyle нельзя — там он затирает системный.
  return (
    <View style={{ gap: 4, paddingLeft: 4, marginTop: topGap }}>
      <Txt style={{ fontSize: 24, fontWeight: '800', color: c.blue, letterSpacing: -0.4 }}>
        {title}
      </Txt>
      {subtitle ? (
        <Txt style={{ fontSize: 14, fontWeight: '500', color: c.inkMuted }}>{subtitle}</Txt>
      ) : null}
    </View>
  );
}

/**
 * Заголовок секции. У учителя он мельче (16/600) — так в макете: его экран плотнее,
 * и одинаковый с ученическим кегль ломал бы ритм пятистрочного расписания.
 */
export function HomeSectionTitle({ children, compact = false }) {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        fontSize: compact ? 16 : 18,
        fontWeight: compact ? '600' : '700',
        color: c.ink,
        paddingLeft: compact ? 0 : 4,
      }}
    >
      {children}
    </Txt>
  );
}

/** Белая карточка со скруглением 20 — контейнер расписания и плитки оценок. */
function SurfaceCard({ children, radius = 20, padding = 16, style }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radius,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Строка урока у ученика и родителя: предмет, время с кабинетом, учитель.
 *
 * Чип оценки справа появляется только там, где оценка уже выставлена и опубликована —
 * пустой чип на каждом уроке превратил бы список в сетку прочерков.
 */
function LearnerLessonRow({ lesson, grades, last, onPress }) {
  const { c } = useTheme();
  const meta = [
    lesson.time && lesson.end ? `${lesson.time} - ${lesson.end}` : lesson.time,
    lesson.roomLabel,
  ].filter(Boolean).join(' · ');
  const teacher = lesson.substituteTeacherShort || lesson.teacherShort;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <Txt
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: lesson.cancelled ? c.ink3 : c.ink,
            textDecorationLine: lesson.cancelled ? 'line-through' : 'none',
          }}
        >
          {lesson.subject}
        </Txt>
        {meta ? (
          <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink2 }}>{meta}</Txt>
        ) : null}
        {teacher ? (
          <Txt style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>
            {lesson.substituteTeacherShort ? `Замена · ${teacher}` : teacher}
          </Txt>
        ) : null}
      </View>
      {grades?.length ? <GradeChip code={grades[grades.length - 1]} /> : null}
    </Pressable>
  );
}

function GradeChip({ code }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        minWidth: 32,
        height: 32,
        paddingHorizontal: 6,
        borderRadius: 8,
        backgroundColor: c.blue,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{code}</Txt>
    </View>
  );
}

/** Карточка «Сегодня» ученика и родителя. */
export function LearnerLessonsCard({ lessons, gradesByLesson, onOpenLesson, onShowAll, emptyText }) {
  const { c } = useTheme();
  const { visible, hidden, fromStart } = homeLessonWindow(lessons);
  return (
    <SurfaceCard>
      {visible.length === 0 ? (
        <Txt style={{ fontSize: 14, color: c.inkMuted, paddingVertical: 12 }}>{emptyText}</Txt>
      ) : (
        <>
          {!fromStart ? <EarlierLessonsHint /> : null}
          {visible.map((lesson, i) => (
            <LearnerLessonRow
              key={lesson.lessonInstanceId ?? `${lesson.lessonId}-${i}`}
              lesson={lesson}
              grades={gradesByLesson?.[lesson.lessonInstanceId]}
              last={i === visible.length - 1}
              onPress={lesson.lessonInstanceId ? () => onOpenLesson?.(lesson) : null}
            />
          ))}
        </>
      )}
      <Pressable
        onPress={onShowAll}
        style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 2 }}
      >
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.green }}>
          {hidden > 0 ? showAllLabel(hidden) : 'Показать всё расписание'}
        </Txt>
      </Pressable>
    </SurfaceCard>
  );
}

/**
 * Подпись ссылки, когда день не поместился. Число в ней важнее слова «всё»:
 * «ещё 6 уроков» отвечает на вопрос «я всё увидел?», а «показать всё» — нет.
 */
function showAllLabel(hidden) {
  const n = Math.abs(hidden) % 100;
  const tail = n % 10;
  let word = 'уроков';
  if (n < 11 || n > 14) {
    if (tail === 1) word = 'урок';
    else if (tail >= 2 && tail <= 4) word = 'урока';
  }
  return `Ещё ${hidden} ${word} · всё расписание`;
}

/** Окно начинается не с утра — говорим об этом, иначе список выглядит обрезанным. */
function EarlierLessonsHint() {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        fontSize: 12,
        fontWeight: '500',
        color: c.ink3,
        paddingBottom: 8,
      }}
    >
      Прошедшие уроки — в расписании
    </Txt>
  );
}

/**
 * Строка расписания учителя: время, «класс предмет», кабинет.
 *
 * Учителю важно не «что за предмет», а «куда идти и к кому»: класс стоит перед
 * предметом, кабинет вынесен вправо отдельной колонкой.
 */
export function TeacherAgendaCard({ lessons, onOpenLesson, onShowAll, emptyText }) {
  const { c } = useTheme();
  const { visible, hidden, fromStart } = homeLessonWindow(lessons);
  return (
    <SurfaceCard radius={12} style={shadowSm}>
      {visible.length === 0 ? (
        <Txt style={{ fontSize: 14, color: c.inkMuted, paddingVertical: 12 }}>{emptyText}</Txt>
      ) : (
        <>
        {!fromStart ? <EarlierLessonsHint /> : null}
        {visible.map((lesson, i) => (
          <View key={lesson.lessonInstanceId ?? `${lesson.lessonId}-${i}`}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: c.border }} /> : null}
            <Pressable
              onPress={lesson.lessonInstanceId ? () => onOpenLesson?.(lesson) : null}
              disabled={!lesson.lessonInstanceId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                paddingVertical: 12,
              }}
            >
              <Txt style={{ fontSize: 13, fontWeight: '500', color: c.inkMuted }}>
                {lesson.time}{lesson.end ? ` – ${lesson.end}` : ''}
              </Txt>
              <Txt
                numberOfLines={1}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: '600',
                  color: lesson.cancelled ? c.ink3 : c.ink,
                  textDecorationLine: lesson.cancelled ? 'line-through' : 'none',
                }}
              >
                {[lesson.className, lesson.subject].filter(Boolean).join(' ')}
              </Txt>
              <Txt style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>
                {lesson.roomLabel}
              </Txt>
            </Pressable>
          </View>
        ))}
        </>
      )}
      {hidden > 0 ? (
        <Pressable onPress={onShowAll} style={{ alignItems: 'center', paddingTop: 10 }}>
          <Txt style={{ fontSize: 13, fontWeight: '600', color: c.green }}>
            {showAllLabel(hidden)}
          </Txt>
        </Pressable>
      ) : null}
    </SurfaceCard>
  );
}

/** Плитка «Оценки» ученика и родителя: иконка в кружке, подпись, шеврон. */
export function GradesTile({ title, subtitle, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <SurfaceCard
        radius={16}
        padding={12}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.blueSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="award" size={18} color={c.blue} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{title}</Txt>
          <Txt numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>
            {subtitle}
          </Txt>
        </View>
        <Icon name="chevronRight" size={20} color={c.ink3} strokeWidth={2} />
      </SurfaceCard>
    </Pressable>
  );
}

/**
 * «Отметиться на уроке» — вход в сканер (ТЗ ATTENDANCE-QR-FE-002 §2).
 *
 * Стоит первой на главной, сразу под приветствием: сканируют в начале урока, и это
 * первое, зачем ученик открывает приложение на перемене. Ниже — список сегодняшних
 * уроков, то есть контекст на месте.
 *
 * Не плавающая кнопка: она перекрыла бы этот список ради действия, которое совершают
 * раз в день.
 */
export function ScanQrTile({ onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Отметиться на уроке: открыть сканер QR-кода"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 64,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: c.green,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="qr" size={22} color="#fff" strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Txt style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Отметиться на уроке</Txt>
          <Txt style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>
            Сканируйте QR-код учителя
          </Txt>
        </View>
        <Icon name="chevronRight" size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
      </View>
    </Pressable>
  );
}

/**
 * Блок активного опроса на главной ученика и родителя (Figma «Дизайн блока активных
 * опросов для Student и Parent»: `Студент/Родитель — без опроса | один опрос | выбор
 * опроса`).
 *
 * Три состояния макета — это одно правило и один баннер, а не три вёрстки: непройденных
 * опросов нет — блока нет вовсе; один — баннер ведёт прямо в него; несколько — тот же
 * баннер открывает лист выбора. Правило живёт здесь, а не в двух главных экранах: у
 * ученика и родителя блок обязан вести себя одинаково, а продублированное «если один —
 * то сразу» разошлось бы при первой же правке одного из экранов.
 *
 * <p>Баннер ведёт в сам опрос, а не в раздел «Опросы»: по макету с главной попадают к
 * первому вопросу, и промежуточный экран со статусами — лишний шаг между «хочу помочь»
 * и ответом. Раздел от этого не пропадает — он и показывает то, чего в блоке нет:
 * уже пройденные опросы и сроки.
 */
export function ActiveSurveysBlock({ surveys, onOpenSurvey }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // `canAnswer` решает сервер — не отправлен ли ответ, открыто ли окно между `startAt`
  // и `deadlineAt`, активен ли сам опрос. Здесь только отбор по готовому флагу, без
  // своей арифметики по датам.
  const pending = useMemo(() => (surveys ?? []).filter((s) => s?.canAnswer), [surveys]);

  const open = useCallback((survey) => {
    setPickerOpen(false);
    onOpenSurvey?.(survey);
  }, [onOpenSurvey]);

  if (pending.length === 0) return null;

  return (
    <>
      <ActiveSurveyBanner
        onPress={() => (pending.length === 1 ? open(pending[0]) : setPickerOpen(true))}
      />
      <TitlePickerSheet
        visible={pickerOpen}
        items={pending}
        keyOf={(survey) => survey.surveyId}
        titleOf={(survey) => survey.title}
        onSelect={open}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

/**
 * Баннер «Актуальный опрос» — призыв сразу под приветствием.
 *
 * Подпись не зависит от числа опросов: в макете и у одного, и у нескольких стоит одно и
 * то же «Пройти опрос». Счётчика здесь нет намеренно — это просьба помочь школе, а не
 * список дел с числом невыполненных (тем он и отличается от прежней плитки «Опросы»).
 *
 * <p><b>Подложка navy, а не оранжевая, как в макете.</b> Макет рисовался без плитки
 * сканера — на живой главной ученика она стоит выше и уже занимает оранжевый CTA
 * (`c.green`), и второй оранжевый баннер подряд читался бы как её продолжение. Цвет
 * здесь единственное, чем два соседних призыва различаются с одного взгляда.
 *
 * Кружок со значком задан цветом, а не токенами темы: подложка баннера navy в обеих
 * темах, а `blueSoft`, который в тёмной становится тёмно-синим, слился бы с ней.
 */
function ActiveSurveyBanner({ onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Помогите школе стать лучше: пройти опрос"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderRadius: 16,
          padding: 12,
          backgroundColor: c.blue,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#EFF6FF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="schoolGlobe" size={20} color={c.blue} />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Txt style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
            Помогите школе стать лучше
          </Txt>
          <Txt style={{ fontSize: 12, fontWeight: '500', color: '#FFFFFF' }}>Пройти опрос</Txt>
        </View>
        <Icon name="chevronRight" size={20} color="#FFFFFF" strokeWidth={2} />
      </View>
    </Pressable>
  );
}

/**
 * Лист выбора — только когда открытых несколько (Figma `выбор опроса`). Один на опросы и
 * психотесты: у обоих блоков один и тот же вопрос — какой из уже отобранных открыть.
 *
 * Ни статуса, ни срока, ни описания: всё, что сюда попало, уже отобрано по `canAnswer`,
 * и единственный оставшийся вопрос — какой из них открыть. Этим лист и отличается от
 * раздела «Опросы», где лента показывает в том числе пройденные.
 *
 * Хром листа — общий для приложения (скругление 24, полоска-ручка, затемнение
 * `rgba(15,23,42,.35)`), как у `PickerSheet` и `TextEditSheet`: в макете он взят из
 * готового шита экрана ключей, и повторять его пиксельно значило бы завести четвёртый
 * вариант одного и того же листа.
 */
function TitlePickerSheet({ visible, items, keyOf, titleOf, onSelect, onClose }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 8,
            paddingBottom: Math.max(24, insets.bottom + 12),
            gap: 12,
          }}
        >
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.stripeIdle }} />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16 }}>
            <ScrollView bounces={false} style={{ maxHeight: 380 }}>
              {items.map((item) => (
                <Pressable
                  key={String(keyOf(item))}
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть «${titleOf(item) ?? ''}»`}
                  onPress={() => onSelect?.(item)}
                  style={({ pressed }) => ({
                    padding: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                    backgroundColor: pressed ? c.bg2 : 'transparent',
                  })}
                >
                  <Txt style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>
                    {titleOf(item)}
                  </Txt>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Психологический тест на главной ученика (PSYCHOLOGIST-002). Правило то же, что у блока
 * опроса: открытых нет — блока нет; один — плитка ведёт прямо в него; несколько — лист выбора.
 *
 * <p>Белая плитка, а не цветной баннер: макета у блока нет, а выше на главной уже стоят два
 * цветных призыва — оранжевый сканер и синий опрос; третий подряд перестал бы выделять
 * любой из них. Вид — как у плитки «Оценки», с которой главная уже знакома.
 */
export function ActivePsychTestsBlock({ tests, onOpenTest }) {
  const { c } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  // `canAnswer` решает сервер: не отправлено, приём не закрыт, срок не прошёл.
  const pending = useMemo(() => (tests ?? []).filter((t) => t?.canAnswer), [tests]);

  const open = useCallback((test) => {
    setPickerOpen(false);
    onOpenTest?.(test);
  }, [onOpenTest]);

  if (pending.length === 0) return null;

  const single = pending.length === 1;
  const subtitle = single ? pending[0].title : `${pending.length} ${testsWord(pending.length)} ждут прохождения`;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Тест от школьного психолога: ${subtitle}`}
        onPress={() => (single ? open(pending[0]) : setPickerOpen(true))}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <SurfaceCard radius={16} padding={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: c.blueSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="face" size={20} color={c.blue} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>Тест от школьного психолога</Txt>
            <Txt numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: c.inkMuted }}>
              {subtitle}
            </Txt>
          </View>
          <Icon name="chevronRight" size={20} color={c.ink3} strokeWidth={2} />
        </SurfaceCard>
      </Pressable>
      <TitlePickerSheet
        visible={pickerOpen}
        items={pending}
        keyOf={(test) => test.assignmentId}
        titleOf={(test) => test.title}
        onSelect={open}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

function testsWord(count) {
  const n = Math.abs(count) % 100;
  const tail = n % 10;
  if (n >= 11 && n <= 14) return 'тестов';
  if (tail === 1) return 'тест';
  if (tail >= 2 && tail <= 4) return 'теста';
  return 'тестов';
}

/** Плитка «Оценки» учителя: заливка без рамки, иконка и шеврон в одну строку сверху. */
export function TeacherGradesTile({ title, subtitle, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: c.bg2, borderRadius: 12, padding: 16, gap: 12 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Icon name="award" size={24} color={c.blue} strokeWidth={2} />
        <Icon name="chevronRight" size={16} color={c.inkMuted} strokeWidth={2} />
      </View>
      <View style={{ gap: 2 }}>
        <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>{title}</Txt>
        <Txt style={{ fontSize: 12, color: c.inkMuted }}>{subtitle}</Txt>
      </View>
    </Pressable>
  );
}

/** Пилюля выбора ребёнка у родителя. Одна кнопка — лист выбора открывает экран. */
export function ChildSwitcherPill({ child, onPress, disabled }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 10,
          paddingRight: 14,
          paddingVertical: 6,
          borderRadius: 24,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
        },
        shadowSm,
      ]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: c.blue,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
          {initialsOf(child?.fullName)}
        </Txt>
      </View>
      <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink }}>
        {childPillLabel(child)}
      </Txt>
      {!disabled ? <Icon name="chevronDown" size={14} color={c.ink2} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}
