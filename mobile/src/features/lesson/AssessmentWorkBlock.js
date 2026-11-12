import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  Banner,
  ConfirmDialog,
  FieldLabel,
  OutlineButton,
  PickerSheet,
  PrimaryButton,
  SegmentedSwitch,
  SelectPill,
  TextField,
} from '@shared/components/ui';
import {
  CONDUCTED_MOVE_HINT,
  KIND_LABELS,
  LOCKED_HINT,
  MAX_LOCKED_HINT,
  REMINDER_OPTIONS,
  activeWorks,
  canCancel,
  canReschedule,
  isLockedByResults,
  maxScoreProblem,
  nextWorkHint,
  reminderLabel,
  workStateLabel,
  workTitle,
} from '@shared/api/assessmentMap';
import { useAssessmentLimits, useRescheduleCandidates } from '@shared/hooks/useAssessmentWork';

/**
 * Работа СОР/СОЧ в карточке урока учителя (Figma Mobile M2, M4–M11).
 *
 * Сервер решает всё: лимиты, «можно ли перенести», статусы и право. Блок показывает недоступное с
 * причиной, а закрытие после первого балла берёт из `hasResults`. «Проведена» — только явное действие,
 * от даты урока статус не зависит. Баллы на телефоне не вносятся — подсказка ведёт в журнал на компьютере.
 *
 * `canEdit` — право учителя на учебную часть урока (`EDIT_TEACHING_PART`, без закрытого периода);
 * остальные роли видят работу только на чтение.
 */
export function AssessmentWorkBlock({ lesson, canEdit, actions, nav }) {
  const works = activeWorks(lesson.assessmentWorks);
  const [assignOpen, setAssignOpen] = useState(false);
  const canAssign = canEdit && lesson.status === 'ACTIVE';

  if (works.length === 0) {
    if (!canAssign) return null;
    return (
      <>
        <AssignEntry onPress={() => setAssignOpen(true)} />
        <AssignSheet
          visible={assignOpen}
          lesson={lesson}
          actions={actions}
          onClose={() => setAssignOpen(false)}
        />
      </>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {works.map((work) => (
        <WorkCard key={work.id} work={work} lesson={lesson} canEdit={canEdit} actions={actions} nav={nav} />
      ))}
    </View>
  );
}

/** M4: на обычном уроке — «Назначить СОР/СОЧ» с пояснением, что по КТП работы нет. */
function AssignEntry({ onPress }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, gap: 10 }}>
      <Txt style={{ fontSize: 13, fontWeight: '400', color: c.ink3 }}>
        По КТП на этом уроке нет суммативной работы. Назначьте её вручную, если она проходит вне плана.
      </Txt>
      <OutlineButton size="lg" icon="clipboardCheck" onPress={onPress}>
        Назначить СОР/СОЧ
      </OutlineButton>
    </View>
  );
}

function WorkCard({ work, lesson, canEdit, actions, nav }) {
  const { c } = useTheme();
  const locked = isLockedByResults(work);
  const manage = canEdit && work.id != null;
  const [maxText, setMaxText] = useState(String(work.maxScore ?? ''));
  const [maxError, setMaxError] = useState(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const state = workStateLabel(work);
  const subtitle = locked
    ? `Выставлено баллов: ${work.resultsCount ?? 0}`
    : work.status === 'CONDUCTED'
      ? 'Баллы ещё не выставлены'
      : 'Ученики и родители видят её в расписании';

  // Серверное значение — источник: после перечитывания карточки поле показывает то, что сохранено.
  useEffect(() => { setMaxText(String(work.maxScore ?? '')); }, [work.maxScore]);

  async function saveMax() {
    const problem = maxScoreProblem(maxText);
    setMaxError(problem);
    if (problem) return;
    if (Number(maxText) === work.maxScore) return;
    const ok = await actions.update(work.id, { maxScore: Number(maxText), expectedVersion: work.version ?? undefined });
    if (!ok) setMaxText(String(work.maxScore ?? ''));
  }

  const title = KIND_LABELS[work.kind];

  return (
    <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={locked ? 'check' : 'clipboardCheck'} size={20} color={c.blue} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>
            {work.status === 'PLANNED' ? 'Работа запланирована' : state}
          </Txt>
          <Txt style={{ fontSize: 12, fontWeight: '400', color: c.ink3 }}>{`${workTitle(work)} · ${subtitle}`}</Txt>
        </View>
      </View>

      {work.needsReschedule ? (
        <Banner icon="alertTriangle" tone="soft">
          Урок работы отменён или изменён. Выберите новый урок — иначе ученики не получат напоминание.
        </Banner>
      ) : null}

      <View style={{ backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          <Txt style={{ fontSize: 14, color: c.ink }}>Максимальный балл</Txt>
          {manage && !locked ? (
            <View style={{ width: 72 }}>
              <TextField
                value={maxText}
                onChangeText={setMaxText}
                onEndEditing={saveMax}
                keyboardType="number-pad"
                invalid={maxError != null}
                editable={!actions.saving}
                accessibilityLabel="Максимальный балл"
                inputStyle={{ textAlign: 'center' }}
              />
            </View>
          ) : (
            <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{work.maxScore}</Txt>
          )}
        </View>
        {maxError ? <Txt style={{ fontSize: 12, color: c.red }}>{maxError}</Txt> : null}
        {locked && manage ? <Txt style={{ fontSize: 12, color: c.ink3 }}>{MAX_LOCKED_HINT}</Txt> : null}
        <View style={{ height: 1, backgroundColor: c.border }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          <Txt style={{ fontSize: 14, color: c.ink }}>Напоминание</Txt>
          {manage && work.status === 'PLANNED' ? (
            <SelectPill label={reminderLabel(work.reminderDaysBefore)} disabled={actions.saving} onPress={() => setReminderOpen(true)} />
          ) : (
            <Txt style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{reminderLabel(work.reminderDaysBefore)}</Txt>
          )}
        </View>
      </View>

      {manage && !locked && work.status === 'PLANNED' ? (
        <PrimaryButton disabled={actions.saving} onPress={() => actions.conduct(work.id)}>
          Отметить как проведён
        </PrimaryButton>
      ) : null}

      {/* Баллы — своим экраном: весь состав, ввод «из максимума», «Сохранить баллы». Право — у сервера. */}
      {work.id != null && work.status !== 'CANCELLED' && nav ? (
        <OutlineButton
          size="lg"
          icon="award"
          onPress={() => nav('assessment-scores', { workId: work.id, lessonInstanceId: lesson.id, title: workTitle(work) })}
        >
          {locked ? 'Баллы работы' : 'Выставить баллы'}
        </OutlineButton>
      ) : null}

      {locked ? (
        <Txt style={{ fontSize: 13, color: c.ink3 }}>{LOCKED_HINT}</Txt>
      ) : manage ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28 }}>
            {canReschedule(work) ? (
              <Pressable onPress={() => setMoveOpen(true)} hitSlop={8}>
                <Txt style={{ fontSize: 14, fontWeight: '600', color: c.blue }}>Изменить дату</Txt>
              </Pressable>
            ) : null}
            {canCancel(work) ? (
              <Pressable onPress={() => setCancelOpen(true)} hitSlop={8}>
                <Txt style={{ fontSize: 14, fontWeight: '600', color: c.red }}>{`Отменить ${title}`}</Txt>
              </Pressable>
            ) : null}
          </View>
          {!canReschedule(work) ? <Txt style={{ fontSize: 12, color: c.ink3, textAlign: 'center' }}>{CONDUCTED_MOVE_HINT}</Txt> : null}
        </>
      ) : null}

      {actions.error && !moveOpen && !cancelOpen ? (
        <Txt style={{ fontSize: 13, color: c.red }} accessibilityRole="alert">{actions.error}</Txt>
      ) : null}

      <PickerSheet
        visible={reminderOpen}
        title="Напоминание ученикам и родителям"
        options={REMINDER_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        value={work.reminderDaysBefore}
        onSelect={(value) => {
          setReminderOpen(false);
          if (value !== work.reminderDaysBefore) {
            actions.update(work.id, { reminderDaysBefore: value, expectedVersion: work.version ?? undefined });
          }
        }}
        onClose={() => setReminderOpen(false)}
      />
      <ConfirmDialog
        visible={cancelOpen}
        title={`Отменить ${title}?`}
        message="Ученики и родители получат уведомление об отмене. Тема и цели урока из КТП останутся."
        cancelLabel="Не отменять"
        confirmLabel={`Отменить ${title}`}
        confirmTone="danger"
        busy={actions.saving}
        onCancel={() => { setCancelOpen(false); actions.clearError(); }}
        onConfirm={async () => {
          if (await actions.cancel(work.id, { expectedVersion: work.version ?? undefined })) setCancelOpen(false);
        }}
      />
      <RescheduleSheet
        visible={moveOpen}
        work={work}
        lesson={lesson}
        actions={actions}
        onClose={() => { setMoveOpen(false); actions.clearError(); }}
      />
    </View>
  );
}

/** Нижний лист: общий каркас окон назначения и переноса. */
function Sheet({ visible, title, subtitle, onClose, busy, footer, children }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const close = busy ? undefined : onClose;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close ?? (() => {})}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' }} onPress={close}>
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 8,
              paddingHorizontal: 16,
              paddingBottom: Math.max(24, insets.bottom + 12),
              gap: 14,
              maxHeight: '88%',
            }}
          >
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.stripeIdle }} />
            </View>
            <View style={{ gap: 2 }}>
              <Txt style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{title}</Txt>
              {subtitle ? <Txt style={{ fontSize: 13, color: c.ink3 }}>{subtitle}</Txt> : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
              {children}
            </ScrollView>
            {footer}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** «Назначить СОР/СОЧ» (M5–M7): вид, максимум, напоминание; недоступное — с причиной. */
function AssignSheet({ visible, lesson, actions, onClose }) {
  const { c } = useTheme();
  const { limits, loading, problem } = useAssessmentLimits(lesson.scope, visible);
  const sorProblem = problem('SOR');
  const sochProblem = problem('SOCH');
  const [chosen, setChosen] = useState('SOR');
  const [maxText, setMaxText] = useState('20');
  const [reminder, setReminder] = useState(1);

  useEffect(() => {
    if (visible) { setChosen('SOR'); setMaxText('20'); setReminder(1); actions.clearError(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Недоступный вид выбрать нельзя: закрытый лимитом уступает свободному.
  const kind = chosen === 'SOR' && sorProblem && !sochProblem ? 'SOCH'
    : chosen === 'SOCH' && sochProblem && !sorProblem ? 'SOR' : chosen;
  const kindProblem = kind === 'SOR' ? sorProblem : sochProblem;
  const maxProblem = maxScoreProblem(maxText);
  const blocked = kindProblem ?? maxProblem;

  async function save() {
    if (blocked) return;
    const ok = await actions.create({ kind, maxScore: Number(maxText), reminderDaysBefore: reminder });
    if (ok) onClose();
  }

  const subtitle = [lesson.subject, lesson.className, lesson.dateLabel].filter(Boolean).join(' · ');
  const hint = nextWorkHint(kind, limits);

  return (
    <Sheet
      visible={visible}
      title="Назначить СОР/СОЧ"
      subtitle={subtitle}
      busy={actions.saving}
      onClose={onClose}
      footer={(
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <OutlineButton size="lg" disabled={actions.saving} onPress={onClose}>Отмена</OutlineButton>
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton disabled={blocked != null || actions.saving} onPress={save}>Сохранить</PrimaryButton>
          </View>
        </View>
      )}
    >
      {loading ? <ActivityIndicator color={c.blue} /> : null}
      <View style={{ gap: 6 }}>
        <FieldLabel>Тип работы</FieldLabel>
        <SegmentedSwitch
          value={kind}
          onChange={setChosen}
          options={[
            { value: 'SOR', label: 'СОР', disabled: sorProblem != null },
            { value: 'SOCH', label: 'СОЧ', disabled: sochProblem != null },
          ]}
        />
        {hint ? <Txt style={{ fontSize: 12, color: c.ink3 }}>{hint}</Txt> : null}
      </View>
      {sorProblem || sochProblem ? (
        <Banner icon="alertTriangle" tone="soft">
          {[sorProblem, sochProblem].filter(Boolean).join('\n')}
        </Banner>
      ) : null}
      <TextField
        label="Максимальный балл"
        value={maxText}
        onChangeText={setMaxText}
        keyboardType="number-pad"
        invalid={maxProblem != null && maxText !== '20'}
        error={maxProblem && maxText !== '20' ? maxProblem : undefined}
      />
      <View style={{ gap: 6 }}>
        <FieldLabel>Напомнить ученикам и родителям</FieldLabel>
        <SegmentedSwitch
          value={reminder}
          onChange={setReminder}
          options={REMINDER_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        />
      </View>
      {actions.error ? <Txt style={{ fontSize: 13, color: c.red }} accessibilityRole="alert">{actions.error}</Txt> : null}
    </Sheet>
  );
}

/** «Изменить дату» (M8): другой урок той же связки класс — предмет — подгруппа — четверть. */
function RescheduleSheet({ visible, work, lesson, actions, onClose }) {
  const { c } = useTheme();
  const candidates = useRescheduleCandidates(lesson, visible);
  const [picked, setPicked] = useState(null);

  useEffect(() => { if (visible) setPicked(null); }, [visible]);

  async function confirm() {
    if (picked == null) return;
    const ok = await actions.reschedule(work.id, { lessonId: picked, expectedVersion: work.version ?? undefined });
    if (ok) onClose();
  }

  return (
    <Sheet
      visible={visible}
      title="Изменить дату"
      subtitle={`${workTitle(work)} · выберите другой урок`}
      busy={actions.saving}
      onClose={onClose}
      footer={(
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <OutlineButton size="lg" disabled={actions.saving} onPress={onClose}>Отмена</OutlineButton>
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton disabled={picked == null || actions.saving} onPress={confirm}>Перенести</PrimaryButton>
          </View>
        </View>
      )}
    >
      <Txt style={{ fontSize: 13, color: c.ink3 }}>
        Ученики и родители получат уведомление о переносе. Перенос возможен, пока не выставлен ни один балл.
      </Txt>
      {candidates.loading ? <ActivityIndicator color={c.blue} /> : null}
      {candidates.error ? <Txt style={{ fontSize: 13, color: c.red }}>{candidates.error}</Txt> : null}
      {!candidates.loading && !candidates.error && candidates.items.length === 0 ? (
        <Txt style={{ fontSize: 14, color: c.ink3 }}>Нет подходящих уроков</Txt>
      ) : null}
      {candidates.items.map((item) => {
        const active = picked === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => setPicked(item.id)}
            style={{
              borderWidth: 1,
              borderColor: active ? c.blue : c.border,
              backgroundColor: active ? c.blueSoft : c.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Txt style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{dayLabel(item.date)}</Txt>
            <Txt style={{ fontSize: 13, color: c.ink3 }}>
              {`${String(item.startTime || '').slice(0, 5)}–${String(item.endTime || '').slice(0, 5)}`}
              {item.lessonNumber ? ` · ${item.lessonNumber} урок` : ''}
            </Txt>
          </Pressable>
        );
      })}
      {actions.error ? <Txt style={{ fontSize: 13, color: c.red }} accessibilityRole="alert">{actions.error}</Txt> : null}
    </Sheet>
  );
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** «Чт, 12 ноября». */
function dayLabel(date) {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date || '';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
