import React, { useState } from 'react';
import { View, Pressable, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card } from '@shared/components/ui';
import { useTheme } from '@shared/theme/ThemeContext';
import { useEntrance } from '../context/EntranceContext';

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
          onChangeText={(t) => onChange({ openTextAnswer: t })}
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
        {question.allowPhoto ? (
          <PhotoAttach question={question} photos={value?.photos || []} onPhotosChange={(photos) => onChange({ photos })} />
        ) : null}
      </View>
    );
  }

  if (type === 'PHOTO') {
    return (
      <PhotoAttach
        question={question}
        photos={value?.photos || []}
        onPhotosChange={(photos) => onChange({ photos })}
        required
      />
    );
  }

  return <Txt style={{ color: c.ink2 }}>Тип вопроса не поддерживается</Txt>;
}

// Photos are persisted immediately via the attempt's dedicated upload/delete endpoints
// (not through the debounced answer save) — `onPhotosChange` only updates local UI state.
function PhotoAttach({ question, photos, onPhotosChange, required }) {
  const { c } = useTheme();
  const { uploadPhoto, deletePhoto } = useEntrance();
  const [busy, setBusy] = useState(false);
  const atLimit = question.maxPhotos ? photos.length >= question.maxPhotos : false;

  const pick = async () => {
    if (atLimit || busy) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy(true);
    try {
      const uploaded = await uploadPhoto(question.id, res.assets[0].uri);
      onPhotosChange([...photos, uploaded]);
    } catch (e) {
      Alert.alert('Не удалось загрузить фото', e.message || 'Попробуйте ещё раз');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (photoId) => {
    try {
      await deletePhoto(question.id, photoId);
      onPhotosChange(photos.filter((p) => p.id !== photoId));
    } catch (e) {
      Alert.alert('Не удалось удалить фото', e.message || 'Попробуйте ещё раз');
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {photos.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((p) => (
            <View key={p.id} style={{ position: 'relative' }}>
              <Image source={{ uri: p.url }} style={{ width: 96, height: 96, borderRadius: 12 }} resizeMode="cover" />
              <Pressable
                onPress={() => remove(p.id)}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  backgroundColor: c.red,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="x" size={14} color="#fff" strokeWidth={3} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {!atLimit ? (
        <Pressable
          onPress={pick}
          disabled={busy}
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
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? <ActivityIndicator color={c.blue} /> : <Icon name="camera" size={20} color={c.blue} />}
          <Txt style={{ color: c.blue, fontWeight: '600' }}>
            {photos.length ? 'Добавить ещё фото' : required ? 'Сделать фото ответа *' : 'Прикрепить фото'}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
