import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { FieldLabel, OutlineButton, PrimaryButton, TextField } from '@shared/components/ui';
import {
  correctionDateLabel,
  correctionProblem,
  deadlineDays,
  initialTemporary,
  temporaryOptions,
  temporaryValue,
} from '@shared/api/gradeCorrectionMap';

/** Нижний лист — общий каркас обоих окон исправления. */
function Sheet({ visible, title, subtitle, busy, onClose, footer, children }) {
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
              maxHeight: '90%',
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

function Chip({ label, selected, dashed = false, disabled = false, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={disabled ? undefined : onPress}
      style={{
        minWidth: 44,
        height: 38,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: selected ? c.blue : c.border,
        backgroundColor: selected ? c.blueSoft : c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Txt style={{ fontSize: 14, fontWeight: selected ? '700' : '500', color: selected ? c.blue : c.ink2 }}>{label}</Txt>
    </Pressable>
  );
}

/**
 * Срок: «До следующего урока» (дату называет сервер по расписанию) или своя дата из ближайших трёх
 * недель. Раньше сегодняшней выбрать нельзя — и сервер такую не примет.
 */
function DeadlinePicker({ value, nextDate, noNext, onChange }) {
  const { c } = useTheme();
  const [custom, setCustom] = useState(value != null && value.kind === 'date');
  const days = deadlineDays();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Chip
          label="До следующего урока"
          selected={value?.kind === 'next'}
          disabled={!nextDate}
          onPress={() => { setCustom(false); onChange({ kind: 'next', date: nextDate }); }}
        />
        <Chip label="Выбрать дату" selected={custom || value?.kind === 'date'} onPress={() => setCustom(true)} />
      </View>
      {noNext ? <Txt style={{ fontSize: 12, color: c.ink3 }}>Следующего урока нет в расписании</Txt> : null}
      {value?.kind === 'next' && value.date ? (
        <Txt style={{ fontSize: 13, color: c.ink3 }}>{correctionDateLabel(value.date)}</Txt>
      ) : null}
      {custom ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((day) => (
            <Chip
              key={day.iso}
              label={day.label}
              selected={value?.kind === 'date' && value.date === day.iso}
              onPress={() => onChange({ kind: 'date', date: day.iso })}
            />
          ))}
        </ScrollView>
      ) : null}
      {value?.kind === 'date' && value.date ? (
        <Txt style={{ fontSize: 13, color: c.ink3 }}>{correctionDateLabel(value.date)}</Txt>
      ) : null}
    </View>
  );
}

/**
 * «Отметить исправление» (Figma 1987:22190, 1987:22379; веб — `CorrectionFormModal`): что нужно
 * исправить, необязательная временная оценка и срок. Та же форма открывается у активного
 * исправления с данными сервера и отправляет только изменённое — каждое поле на сервере становится
 * своим событием истории. Комментарий и срок обязательны. Ничего не вычисляется: статус и дату
 * «следующего урока» называет сервер.
 */
export function CorrectionFormSheet({
  visible, studentName, correction, options, nextDate, noNext, busy, error, onSubmit, onClose,
}) {
  const { c } = useTheme();
  const [comment, setComment] = useState('');
  const [temporary, setTemporary] = useState(null);
  const [deadline, setDeadline] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setComment(correction?.comment ?? '');
    setTemporary(initialTemporary(correction, options));
    setDeadline(correction?.deadline ? { kind: 'date', date: correction.deadline } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, correction?.id]);

  const problem = correctionProblem({ comment, deadline: deadline?.date });
  const values = temporaryOptions(options);

  return (
    <Sheet
      visible={visible}
      title={`${correction ? 'Исправление' : 'Отметить исправление'} — ${studentName}`}
      subtitle={correction
        ? 'Измените комментарий, временную оценку или срок исправления.'
        : 'Укажите, что нужно исправить, и задайте срок для повторной проверки.'}
      busy={busy}
      onClose={onClose}
      footer={(
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <OutlineButton size="lg" disabled={busy} onPress={onClose}>Отмена</OutlineButton>
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              disabled={problem != null || busy}
              onPress={() => onSubmit({
                comment: comment.trim(),
                deadline: deadline.date,
                temporaryGrade: temporary == null ? null : temporaryValue(temporary, options),
              })}
            >
              Сохранить
            </PrimaryButton>
          </View>
        </View>
      )}
    >
      <TextField
        label="Комментарий"
        placeholder="Что нужно исправить"
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={1000}
        editable={!busy}
      />
      <View style={{ gap: 8 }}>
        <FieldLabel optional>Временная оценка</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {values.map((item) => (
            <Chip
              key={item}
              label={item}
              dashed
              selected={item === temporary}
              onPress={() => setTemporary(item === temporary ? null : item)}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <FieldLabel>Срок</FieldLabel>
        <DeadlinePicker value={deadline} nextDate={nextDate} noNext={noNext} onChange={setDeadline} />
      </View>
      {error ? <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{error}</Txt> : null}
    </Sheet>
  );
}

/**
 * «Срок истёк» (Figma 1987:23005): комментарий, исходный срок и два действия. «Продлить срок»
 * раскрывает выбор нового срока здесь же; «Выставить итоговую оценку» закрывает окно и открывает
 * выбор оценки в строке ученика — там же, где её ставят всегда.
 */
export function CorrectionExpiredSheet({
  visible, correction, nextDate, noNext, busy, error, onExtend, onGrade, onClose,
}) {
  const { c } = useTheme();
  const [extending, setExtending] = useState(false);
  const [deadline, setDeadline] = useState(null);

  useEffect(() => {
    if (visible) { setExtending(false); setDeadline(null); }
  }, [visible, correction?.id]);

  return (
    <Sheet
      visible={visible}
      title="Срок истёк"
      subtitle="Исправление не было завершено в установленный срок."
      busy={busy}
      onClose={onClose}
      footer={extending ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <OutlineButton size="lg" disabled={busy} onPress={() => setExtending(false)}>Отмена</OutlineButton>
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton disabled={!deadline?.date || busy} onPress={() => onExtend(deadline.date)}>Сохранить</PrimaryButton>
          </View>
        </View>
      ) : null}
    >
      <View style={{ gap: 6 }}>
        <FieldLabel>Комментарий</FieldLabel>
        <Txt style={{ fontSize: 14, color: c.ink2, backgroundColor: c.bg2, borderRadius: 10, padding: 12 }}>
          {correction?.comment}
        </Txt>
      </View>
      <View style={{ gap: 6 }}>
        <FieldLabel>Исходный срок</FieldLabel>
        <Txt style={{ fontSize: 14, fontWeight: '700', color: c.red }}>
          {`${correctionDateLabel(correction?.deadline)} · срок истёк`}
        </Txt>
      </View>
      {extending ? (
        <View style={{ gap: 8 }}>
          <FieldLabel>Новый срок</FieldLabel>
          <DeadlinePicker value={deadline} nextDate={nextDate} noNext={noNext} onChange={setDeadline} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <FieldLabel>Что сделать дальше</FieldLabel>
          <OutlineButton size="lg" onPress={() => setExtending(true)}>Продлить срок</OutlineButton>
          <PrimaryButton onPress={onGrade}>Выставить итоговую оценку</PrimaryButton>
        </View>
      )}
      {error ? <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{error}</Txt> : null}
    </Sheet>
  );
}
