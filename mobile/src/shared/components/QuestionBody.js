import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { MathText } from '@shared/math/MathText';

/**
 * Вопрос с вариантами или полем свободного ответа — общий для вступительного теста и
 * домашнего задания.
 *
 * <p>Общий намеренно: расхождение в рендере формул между экзаменом и домашкой — это
 * разные вопросы для одного и того же ребёнка. Копия рано или поздно разъедется.
 *
 * <p>Фотоответ живёт не здесь: он умеет грузить снимки в попытку вступительного теста и
 * тянет за собой его API. Поэтому блок передаётся снаружи через {@code renderPhotos} —
 * так общий компонент не начинает зависеть от модуля поступления, а домашнее задание,
 * которому фото к вопросу не нужны, просто ничего не передаёт.
 */

const NAVY = '#274185';
const SELECTED_BG = '#EFF6FF';
const BORDER = '#E2E8F0';
const INK = '#1E293B';
const MUTED = '#64748B';

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
        <View style={{ flex: 1 }}>
          <MathText
            text={label}
            style={{
              fontSize: 17,
              lineHeight: 22,
              fontWeight: selected ? '700' : '500',
              color: INK,
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

export function QuestionBody({
  question,
  value,
  onChange,
  onPhotosChange,
  renderPhotos,
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
        {question.allowPhoto && renderPhotos
          ? renderPhotos({
              photos,
              onPhotosChange: (next) =>
                onPhotosChange
                  ? onPhotosChange(next)
                  : onChange({
                      selectedOptionIds: value?.selectedOptionIds || [],
                      openTextAnswer: value?.openTextAnswer || '',
                      photos: next,
                    }),
            })
          : null}
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
        {question.allowPhoto && renderPhotos
          ? renderPhotos({
              photos,
              onPhotosChange: (next) =>
                onPhotosChange
                  ? onPhotosChange(next)
                  : onChange({
                      selectedOptionIds: value?.selectedOptionIds || [],
                      openTextAnswer: value?.openTextAnswer || '',
                      photos: next,
                    }),
            })
          : null}
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
        {question.allowPhoto && renderPhotos
          ? renderPhotos({
              photos,
              onPhotosChange: (next) =>
                onPhotosChange
                  ? onPhotosChange(next)
                  : onChange({
                      openTextAnswer: value?.openTextAnswer || '',
                      selectedOptionIds: value?.selectedOptionIds || [],
                      photos: next,
                    }),
            })
          : null}
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
    return renderPhotos
      ? renderPhotos({
          photos,
          onPhotosChange: (next) =>
            onPhotosChange
              ? onPhotosChange(next)
              : onChange({ selectedOptionIds: [], openTextAnswer: '', photos: next }),
        })
      : null;
  }

  return <Txt style={{ color: MUTED }}>Тип вопроса не поддерживается</Txt>;
}

