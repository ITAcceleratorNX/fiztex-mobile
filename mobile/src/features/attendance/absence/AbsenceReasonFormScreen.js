import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { PrimaryButton, TextField } from '@shared/components/ui';
import { BackLink } from '@shared/ui/BackLink';
import { RadioList } from '@shared/ui/RadioList';
import { useAuth } from '@features/auth/AuthContext';
import { useAppState } from '@shared/state/AppState';
import { absenceApi } from '@shared/api/absenceApi';
import {
  ABSENCE_REASONS,
  COMMENT_LIMIT,
  dayMonth,
  lessonsCount,
  respondErrorText,
} from '@shared/api/absenceMap';

/**
 * Форма причины отсутствия (Figma `phyztex` Р5, Р6): справочник причин и необязательный
 * комментарий — как у отметки урока. Ответ уходит на пару «ребёнок + дата», а не по уроку.
 *
 * Сбой отправки не стирает форму (ТЗ, Р6): выбранная причина и текст остаются, кнопка становится
 * «Повторить отправку». Повторное нажатие во время отправки ничего не делает, а второй ответ того
 * же родителя сервер отклоняет сам (`ABSENCE_REASON_RESPONSE_PENDING`).
 *
 * @param {{ childId: number, date: string, childLabel: string, lessonCount: number }} payload
 */
export function AbsenceReasonFormScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const appState = useAppState();
  const [reason, setReason] = useState(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const childId = payload?.childId;
  const date = payload?.date;
  const tooLong = comment.length > COMMENT_LIMIT;

  async function send() {
    if (inFlight.current || !reason || tooLong || !childId || !date) return;
    inFlight.current = true;
    setSending(true);
    setError(null);
    try {
      await absenceApi.respond(token, { childId, date, reason, comment: comment.trim() });
      appState.notice({ title: 'Причина отправлена классному руководителю' });
      nav.back();
    } catch (failure) {
      setError(failure);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  const subtitle = [payload?.childLabel?.split(' · ')[0], dayMonth(date), lessonsCount(payload?.lessonCount)]
    .filter(Boolean).join(' · ');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen
        scroll
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: c.bg }}
        contentStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 16 }}
      >
        <BackLink onPress={() => nav.back()} />
        <View style={{ gap: 4 }}>
          <Txt accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: c.ink }}>Причина отсутствия</Txt>
          <Txt style={{ fontSize: 14, color: c.inkMuted }}>{subtitle}</Txt>
        </View>

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: 'row',
              gap: 10,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.markAbsent,
              backgroundColor: c.markAbsentSoft,
            }}
          >
            <Icon name="alertCircle" size={18} color={c.red} strokeWidth={2} />
            <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.dangerInk }}>
              <Txt style={{ fontWeight: '700', color: c.dangerInk }}>Не удалось отправить. </Txt>
              {respondErrorText(error)}
            </Txt>
          </View>
        ) : null}

        <RadioList
          accessibilityLabel="Причина"
          options={ABSENCE_REASONS}
          value={reason}
          onChange={setReason}
          disabled={sending}
        />
        <View style={{ gap: 6 }}>
          <TextField
            label="Комментарий"
            value={comment}
            onChangeText={setComment}
            placeholder="Например: температура, были у врача"
            multiline
            editable={!sending}
            error={tooLong ? `Не больше ${COMMENT_LIMIT} символов` : undefined}
          />
          <Txt style={{ fontSize: 12, color: c.ink3 }}>Необязательно</Txt>
        </View>
      </Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(16, insets.bottom + 8), backgroundColor: c.bg }}>
        <PrimaryButton
          color="blue"
          style={{ borderRadius: 16 }}
          disabled={!reason || tooLong || sending}
          onPress={send}
        >
          {sending ? 'Отправляем…' : error ? 'Повторить отправку' : 'Отправить'}
        </PrimaryButton>
      </View>
    </KeyboardAvoidingView>
  );
}
