import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card, Pill } from '@shared/components/ui';
import { useTheme } from '@shared/theme/ThemeContext';
import { PhotoAnswerBlock } from './PhotoAnswerBlock';

function OptionRow({ label, selected, onPress, multi }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card
        padded
        style={{
          marginBottom: 8,
          borderColor: selected ? c.green : c.border,
          borderWidth: selected ? 2 : 1,
          backgroundColor: selected ? c.greenSoft : c.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: multi ? 6 : 999,
            borderWidth: 2,
            borderColor: selected ? c.green : c.borderStrong,
            backgroundColor: selected ? c.green : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <Icon name="check" size={12} color="#fff" strokeWidth={3} /> : null}
        </View>
        <Txt style={{ flex: 1, fontSize: 16, lineHeight: 22 }}>{label}</Txt>
      </Card>
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
        <Txt style={{ fontSize: 13, color: c.ink2, marginBottom: 10 }}>Можно выбрать несколько вариантов</Txt>
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
          placeholderTextColor={c.ink3}
          multiline
          style={{
            minHeight: 140,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 16,
            fontSize: 16,
            color: c.ink,
            backgroundColor: c.surface,
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

  return <Txt style={{ color: c.ink2 }}>Тип вопроса не поддерживается</Txt>;
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
  const { c } = useTheme();
  if (status === 'idle') return null;
  if (status === 'saving') {
    return <Txt style={{ fontSize: 12, color: c.ink3 }}>Сохранение…</Txt>;
  }
  if (status === 'saved') {
    return <Txt style={{ fontSize: 12, color: c.green, fontWeight: '600' }}>Сохранено</Txt>;
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Txt style={{ fontSize: 12, color: c.red, fontWeight: '600' }}>Не сохранено — проверьте интернет</Txt>
      {onRetry ? (
        <Pressable onPress={onRetry}>
          <Txt style={{ fontSize: 12, color: c.blue, fontWeight: '700' }}>Повторить</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
