import { useEffect, useRef, useState } from 'react';
import { View, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useTheme } from '@shared/theme/ThemeContext';
import { API_BASE_URL } from '../config';
import { admissionsApi, getEntranceToken } from '../api/entranceApi';

function photoUri(path, token) {
  const p = path.startsWith('/api') ? path : `/api${path}`;
  return { uri: `${API_BASE_URL}${p}`, headers: token ? { Authorization: `Bearer ${token}` } : {} };
}

export function PhotoAnswerBlock({
  attemptId,
  questionId,
  maxPhotos,
  photos,
  disabled,
  onPhotosChange,
  onUploadFailed,
}) {
  const { c } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    getEntranceToken().then(setToken);
  }, []);

  const atLimit = photos.length >= maxPhotos;

  async function takePhoto() {
    if (disabled || atLimit || uploading) return;
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Камера недоступна',
        'Разрешите доступ к камере в настройках или обратитесь к сотруднику школы.',
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: true });
    if (res.canceled || !res.assets?.[0]) return;

    setUploading(true);
    try {
      const uploaded = await admissionsApi.uploadAnswerPhoto(attemptId, questionId, res.assets[0]);
      onPhotosChange([...photos, { id: uploaded.id, url: uploaded.url }]);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить фото');
      onUploadFailed?.();
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photoId) {
    if (disabled) return;
    try {
      await admissionsApi.deleteAnswerPhoto(attemptId, questionId, photoId);
      onPhotosChange(photos.filter((p) => p.id !== photoId));
    } catch (e) {
      setError(e.message || 'Не удалось удалить фото');
    }
  }

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink2 }}>
        Фото-ответ · {photos.length}/{maxPhotos}
      </Txt>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {photos.map((photo) => (
          <View key={photo.id} style={{ position: 'relative' }}>
            {token ? (
              <Image
                source={photoUri(photo.url, token)}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: c.bg2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator color={c.green} />
              </View>
            )}
            {!disabled && (
              <Pressable
                onPress={() => void removePhoto(photo.id)}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: c.red,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="x" size={12} color="#fff" strokeWidth={3} />
              </Pressable>
            )}
          </View>
        ))}

        {!atLimit && !disabled && (
          <Pressable
            onPress={() => void takePhoto()}
            disabled={uploading}
            style={{
              width: 80,
              height: 80,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: c.borderStrong,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.surface,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? (
              <ActivityIndicator color={c.green} />
            ) : (
              <>
                <Icon name="camera" size={20} color={c.blue} />
                <Txt style={{ fontSize: 10, color: c.blue, marginTop: 4, fontWeight: '600' }}>Добавить</Txt>
              </>
            )}
          </Pressable>
        )}
      </View>

      {error ? (
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.gold,
            backgroundColor: c.goldSoft,
            padding: 12,
            gap: 8,
          }}
        >
          <Txt style={{ fontSize: 13, color: c.goldDeep }}>{error}</Txt>
          <Pressable onPress={() => void takePhoto()}>
            <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>Повторить</Txt>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
