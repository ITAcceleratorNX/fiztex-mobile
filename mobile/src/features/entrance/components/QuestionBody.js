import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Pill } from '@shared/components/ui';
import { useTheme } from '@shared/theme/ThemeContext';
import { PhotoAnswerBlock } from './PhotoAnswerBlock';

const NAVY = '#274185';
const SELECTED_BG = '#EFF6FF';
const BORDER = '#E2E8F0';
const INK = '#1E293B';
const MUTED = '#64748B';
const GREEN = '#22C55E';

function OptionRow({ label, selected, onPress, multi }) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          marginBottom: 12,
          minHeight: 64,
          borderRadius: 16,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? NAVY : BORDER,
          backgroundColor: selected ? SELECTED_BG : '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: multi ? 6 : 12,
            borderWidth: 2,
            borderColor: selected ? NAVY : BORDER,
            backgroundColor: multi && selected ? NAVY : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected && !multi ? (
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: NAVY }} />
          ) : null}
          {selected && multi ? <Icon name="check" size={12} color="#fff" strokeWidth={3} /> : null}
        </View>
        <Txt
          style={{
            flex: 1,
            fontSize: 17,
            lineHeight: 22,
            fontWeight: selected ? '700' : '500',
            color: INK,
          }}
        >
          {label}
        </Txt>
      </View>
    </Pressable>
  );
}

export function QuestionBody({
  question,
  value,
  onChange,
  onPhotosChange,
  photoProps,
}) {
  const { c } = useTheme();
  if (!question) return null;

  const type = question.type;
  const photos = value?.photos || [];

  if (type === 'SINGLE_CHOICE') {
    const selected = value?.selectedOptionIds?.[0];
    return (
      <View>
        {(question.options || []).map((opt) => (
          <OptionRow
            key={opt.id}
            label={opt.text}
            selected={selected === opt.id}
            onPress={() =>
              onChange({
                selectedOptionIds: [opt.id],
                openTextAnswer: value?.openTextAnswer || '',
                photos,
              })
            }
          />
        ))}
        {question.allowPhoto && photoProps ? (
          <PhotoAnswerBlock
            {...photoProps}
            photos={photos}
            onPhotosChange={(next) => onPhotosChange?.(next) ?? onChange({
                selectedOptionIds: value?.selectedOptionIds || [],
                openTextAnswer: value?.openTextAnswer || '',
                photos: next,
              })}
          />
        ) : null}
      </View>
    );
  }

  if (type === 'MULTIPLE_CHOICE') {
    const selected = value?.selectedOptionIds || [];
    const toggle = (id) => {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      onChange({ selectedOptionIds: next, openTextAnswer: value?.openTextAnswer || '', photos });
    };
    return (
      <View>
        <Txt style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>Можно выбрать несколько вариантов</Txt>
        {(question.options || []).map((opt) => (
          <OptionRow
            key={opt.id}
            label={opt.text}
            selected={selected.includes(opt.id)}
            multi
            onPress={() => toggle(opt.id)}
          />
        ))}
        {question.allowPhoto && photoProps ? (
          <PhotoAnswerBlock
            {...photoProps}
            photos={photos}
            onPhotosChange={(next) => onPhotosChange?.(next) ?? onChange({
                selectedOptionIds: value?.selectedOptionIds || [],
                openTextAnswer: value?.openTextAnswer || '',
                photos: next,
              })}
          />
        ) : null}
      </View>
    );
  }

  if (type === 'OPEN_TEXT') {
    return (
      <View style={{ gap: 12 }}>
        <TextInput
          value={value?.openTextAnswer || ''}
          onChangeText={(t) =>
            onChange({ openTextAnswer: t, selectedOptionIds: value?.selectedOptionIds || [], photos })
          }
          placeholder="Введите развёрнутый ответ…"
          placeholderTextColor={MUTED}
          multiline
          style={{
            minHeight: 140,
            borderWidth: 1,
            borderColor: BORDER,
            borderRadius: 16,
            padding: 16,
            fontSize: 16,
            color: INK,
            backgroundColor: '#fff',
            textAlignVertical: 'top',
          }}
        />
        {question.allowPhoto && photoProps ? (
          <PhotoAnswerBlock
            {...photoProps}
            photos={photos}
            onPhotosChange={(next) =>
              onPhotosChange?.(next) ??
              onChange({
                openTextAnswer: value?.openTextAnswer || '',
                selectedOptionIds: value?.selectedOptionIds || [],
                photos: next,
              })
            }
          />
        ) : null}
      </View>
    );
  }

  if (type === 'PHOTO') {
    if (!question.allowPhoto) {
      return (
        <Txt style={{ fontSize: 14, color: c.goldDeep }}>
          Этот вопрос настроен некорректно. Обратитесь к сотруднику школы.
        </Txt>
      );
    }
    return photoProps ? (
      <PhotoAnswerBlock
        {...photoProps}
        photos={photos}
        onPhotosChange={(next) =>
          onPhotosChange?.(next) ??
          onChange({ selectedOptionIds: [], openTextAnswer: '', photos: next })
        }
      />
    ) : null;
  }

  return <Txt style={{ color: MUTED }}>Тип вопроса не поддерживается</Txt>;
}

export function QuestionMeta({ question }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {question.topic ? <Pill color="blue">{question.topic}</Pill> : null}
      {question.difficulty ? <Pill color="gray">{question.difficulty}</Pill> : null}
      {question.maxScore ? <Pill color="gold">{question.maxScore} б.</Pill> : null}
    </View>
  );
}

export function SaveStatusChip({ status, onRetry }) {
  if (status === 'idle') return null;
  if (status === 'saving') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#94A3B8' }} />
        <Txt style={{ fontSize: 13, fontWeight: '500', color: MUTED }}>Сохранение…</Txt>
      </View>
    );
  }
  if (status === 'saved') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN }} />
        <Txt style={{ fontSize: 13, fontWeight: '500', color: MUTED }}>Ответ сохранён</Txt>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Txt style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>Не сохранено — проверьте интернет</Txt>
      {onRetry ? (
        <Pressable onPress={onRetry}>
          <Txt style={{ fontSize: 13, color: NAVY, fontWeight: '700' }}>Повторить</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
