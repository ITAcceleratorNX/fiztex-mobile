import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from './Txt';
import { PrimaryButton } from './ui';

/**
 * Bottom sheet для правки одного текстового поля: тема урока, комментарий для учеников,
 * комментарий к отметке посещаемости.
 *
 * Все они живут по одним правилам, поэтому шит один, а различия приходят пропсами:
 * заголовок, лимит символов, число строк. Пустое значение не сохраняется — «стереть»
 * это отдельное действие «Удалить», а не сохранение пустой строки: у полей, которые
 * бэк не принимает пустыми, иначе получалась бы кнопка «Сохранить», ведущая к 400.
 *
 * `readOnly` — тот же шит без права правки: комментарий в листе посещаемости виден и
 * тому, кто заполнять уже не может (бывший заместитель, закрытый период). Отдельный
 * компонент под просмотр разошёлся бы с этим по вёрстке при первой же правке.
 */
export function TextEditSheet({
  visible,
  title,
  label,
  placeholder,
  initialValue = '',
  maxLength,
  multiline = false,
  readOnly = false,
  saving = false,
  error = null,
  onSave,
  onDelete,
  onClose,
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);

  // Каждое открытие начинается с актуального значения: шит переиспользуется
  // разными полями, а состояние в нём одно.
  useEffect(() => {
    if (visible) setValue(initialValue || '');
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && !saving;
  const hadValue = Boolean((initialValue || '').trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' }}
          onPress={saving ? undefined : onClose}
        >
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
            }}
          >
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.stripeIdle }} />
            </View>

            <Txt style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{title}</Txt>

            <View style={{ gap: 6 }}>
              <Txt
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: c.inkMuted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                }}
              >
                {label}
              </Txt>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                placeholderTextColor={c.ink3}
                editable={!saving && !readOnly}
                multiline={multiline}
                maxLength={maxLength}
                textAlignVertical={multiline ? 'top' : 'center'}
                style={{
                  minHeight: multiline ? 120 : 48,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.surface2,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: readOnly ? c.ink2 : c.ink,
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {error ? (
                  <Txt style={{ flex: 1, fontSize: 12, color: c.red }}>{error}</Txt>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {maxLength && !readOnly ? (
                  <Txt style={{ fontSize: 12, color: c.ink3 }}>{`${value.length}/${maxLength}`}</Txt>
                ) : null}
              </View>
            </View>

            {readOnly ? (
              <PrimaryButton color="ghost" onPress={onClose}>Закрыть</PrimaryButton>
            ) : (
              <PrimaryButton color="blue" onPress={() => canSave && onSave(trimmed)} disabled={!canSave}>
                {saving ? <ActivityIndicator color="#fff" /> : 'Сохранить'}
              </PrimaryButton>
            )}

            {!readOnly && hadValue && onDelete ? (
              <Pressable
                accessibilityRole="button"
                onPress={saving ? undefined : onDelete}
                style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Txt style={{ fontSize: 14, fontWeight: '600', color: c.red }}>Удалить</Txt>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
