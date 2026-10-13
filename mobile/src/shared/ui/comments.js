import React from 'react';
import { View, Pressable, TextInput, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { COMMENT, FONT } from '@shared/theme/tokens';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Card } from '@shared/components/ui';

export function CommentButton({ published, studentName, onPress, disabled }) {
  const { c } = useTheme();
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
    accessibilityLabel={`${published ? 'Комментарий родителю' : 'Добавить комментарий родителю'}: ${studentName}`}
    accessibilityState={{ disabled }} hitSlop={4}
    style={{ width: COMMENT.buttonSize, height: COMMENT.buttonSize, borderRadius: COMMENT.gap,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1,
      borderColor: published ? c.blue : c.border, backgroundColor: published ? c.blue : c.surface,
      opacity: disabled ? 0.4 : 1 }}>
    <Icon name="message" size={16} color={published ? c.heroInk : c.ink3} />
  </Pressable>;
}

export function CommentTextField({ label, value, onChange, disabled, generating, aiGenerated, readOnly }) {
  const { c } = useTheme();
  return <View style={{ gap: COMMENT.gap }}>
    <Txt style={{ fontSize: COMMENT.labelSize, fontWeight: '600', color: c.ink2 }}>{label}</Txt>
    <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: COMMENT.radius,
      padding: COMMENT.gutter, minHeight: readOnly ? undefined : COMMENT.editorHeight, gap: COMMENT.gap }}>
      {generating ? <View accessibilityRole="progressbar" style={{ flex: 1, minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: COMMENT.gap }}>
        <ActivityIndicator color={c.blue} /><Txt style={{ color: c.ink3 }}>AI генерирует…</Txt>
      </View> : readOnly ? <Txt style={{ color: c.ink, fontSize: COMMENT.bodySize, lineHeight: COMMENT.bodyLine }}>{value}</Txt> :
        <TextInput value={value} onChangeText={onChange} multiline textAlignVertical="top" editable={!disabled}
          accessibilityLabel={label} maxLength={COMMENT.limit}
          placeholder="Успеваемость, поведение на уроке, другие наблюдения" placeholderTextColor={c.ink3}
          style={{ flex: 1, minHeight: 140, color: c.ink, fontFamily: FONT.regular,
            fontSize: COMMENT.bodySize, lineHeight: COMMENT.bodyLine }} />}
      {!readOnly && <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: COMMENT.gap }}>
        <Txt style={{ fontSize: COMMENT.captionSize, color: c.blue }}>{aiGenerated ? '✦ AI-вариант' : ''}</Txt>
        <Txt style={{ fontSize: COMMENT.captionSize, color: c.ink3 }}>{value.length}/{COMMENT.limit}</Txt>
      </View>}
    </View>
  </View>;
}

export function TeacherCommentCard({ comment, onPress, dateLabel, expanded = false }) {
  const { c } = useTheme();
  const initials = (comment.teacherName || '').split(/\s+/).slice(0, 2).map(p => p[0]).join('');
  return <Card padded={false} onPress={onPress} style={{ padding: COMMENT.inset, borderRadius: COMMENT.radius, gap: COMMENT.gap }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: COMMENT.gap }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: COMMENT.dotSize, flex: 1 }}>
        {comment.unread ? <View accessibilityLabel="Не прочитано" style={{ width: COMMENT.dotSize, height: COMMENT.dotSize, borderRadius: COMMENT.dotSize, backgroundColor: c.green }} /> : null}
        <Txt style={{ fontSize: COMMENT.bodySize, fontWeight: '700', color: c.ink, flex: 1 }}>{comment.subjectName}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Txt style={{ fontSize: COMMENT.captionSize, color: c.ink3 }}>{dateLabel}</Txt>
        {comment.updated ? <Txt style={{ fontSize: COMMENT.captionSize, color: c.green }}>Обновлено</Txt> : null}
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: COMMENT.dotSize }}>
      <View style={{ width: COMMENT.avatarSize, height: COMMENT.avatarSize, borderRadius: COMMENT.avatarSize,
        alignItems: 'center', justifyContent: 'center', backgroundColor: c.blueSoft }}>
        <Txt style={{ fontSize: COMMENT.avatarTextSize, color: c.blue }}>{initials}</Txt>
      </View>
      <Txt style={{ fontSize: COMMENT.labelSize, color: c.ink3 }}>{comment.teacherName}</Txt>
    </View>
    <Txt numberOfLines={expanded ? undefined : 3} style={{ fontSize: COMMENT.bodySize, lineHeight: COMMENT.bodyLine, color: c.ink2 }}>{comment.text}</Txt>
  </Card>;
}

export function CommentDialog({ title, subtitle, subtitleIcon, children, footer, onClose, busy, visible = true }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.modalBackdrop,
        paddingHorizontal: COMMENT.gutter, paddingTop: insets.top + COMMENT.gap, paddingBottom: insets.bottom + COMMENT.gap }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: COMMENT.modalMaxWidth,
        maxHeight: height - insets.top - insets.bottom - COMMENT.gutter * 2,
        backgroundColor: c.surface, borderRadius: COMMENT.gutter, padding: COMMENT.modalInset, gap: COMMENT.gutter }}>
        <View style={{ flexDirection: 'row', gap: COMMENT.gap, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: COMMENT.gap }}>
            <Txt style={{ fontSize: COMMENT.titleSize, fontWeight: '700', color: c.ink }}>{title}</Txt>
            {subtitle ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: COMMENT.dotSize }}>
              {subtitleIcon ? <Icon name={subtitleIcon} size={COMMENT.bodySize} color={c.ink3} /> : null}
              <Txt style={{ fontSize: COMMENT.captionSize, color: c.ink3, flex: 1 }}>{subtitle}</Txt>
            </View> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Закрыть окно" disabled={busy} onPress={onClose}
            style={{ width: COMMENT.buttonSize, height: COMMENT.buttonSize, alignItems: 'center', justifyContent: 'center', borderRadius: COMMENT.gap, backgroundColor: c.bg2 }}>
            <Icon name="x" size={18} color={c.ink3} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ gap: COMMENT.gutter }}>{children}</ScrollView>
        {footer}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
