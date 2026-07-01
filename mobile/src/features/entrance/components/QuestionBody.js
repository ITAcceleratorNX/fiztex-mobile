import React from 'react';
import { View, Pressable, TextInput, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card, Pill } from '@shared/components/ui';
import { useTheme } from '@shared/theme/ThemeContext';

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

export function QuestionBody({ question, value, onChange }) {
  const { c } = useTheme();
  if (!question) return null;

  const type = question.type;

  if (type === 'SINGLE_CHOICE') {
    const selected = value?.selectedOptionIds?.[0];
    return (
      <View>
        {(question.options || []).map((opt) => (
          <OptionRow
            key={opt.id}
            label={opt.text}
            selected={selected === opt.id}
            onPress={() => onChange({ selectedOptionIds: [opt.id] })}
          />
        ))}
      </View>
    );
  }

  if (type === 'MULTIPLE_CHOICE') {
    const selected = value?.selectedOptionIds || [];
    const toggle = (id) => {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      onChange({ selectedOptionIds: next });
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
      </View>
    );
  }

  if (type === 'OPEN_TEXT') {
    return (
      <View style={{ gap: 12 }}>
        <TextInput
          value={value?.openTextAnswer || ''}
          onChangeText={(t) => onChange({ openTextAnswer: t, photoUrl: value?.photoUrl })}
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
        {question.allowPhoto ? <PhotoAttach value={value} onChange={onChange} /> : null}
      </View>
    );
  }

  if (type === 'PHOTO') {
    return <PhotoAttach value={value} onChange={onChange} required />;
  }

  return <Txt style={{ color: c.ink2 }}>Тип вопроса не поддерживается</Txt>;
}

function PhotoAttach({ value, onChange, required }) {
  const { c } = useTheme();
  const pick = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (!res.canceled && res.assets?.[0]) {
      onChange({ photoUrl: res.assets[0].uri, openTextAnswer: value?.openTextAnswer || '' });
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {value?.photoUrl ? (
        <Image source={{ uri: value.photoUrl }} style={{ width: '100%', height: 200, borderRadius: 16 }} resizeMode="cover" />
      ) : null}
      <Pressable
        onPress={pick}
        style={{
          height: 54,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: c.blue,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          backgroundColor: c.blueSoft,
        }}
      >
        <Icon name="camera" size={20} color={c.blue} />
        <Txt style={{ color: c.blue, fontWeight: '600' }}>
          {value?.photoUrl ? 'Переснять фото' : required ? 'Сделать фото ответа *' : 'Прикрепить фото'}
        </Txt>
      </Pressable>
    </View>
  );
}

export function QuestionMeta({ question }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
      {question.topic ? <Pill color="blue">{question.topic}</Pill> : null}
      {question.difficulty ? <Pill color="gray">{question.difficulty}</Pill> : null}
      <Pill color="gold">{question.maxScore} б.</Pill>
    </View>
  );
}
