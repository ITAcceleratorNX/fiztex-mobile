/**
 * Мета вопроса и статус автосохранения — оба про экзамен, а не про вопрос как таковой.
 * Сам {@code QuestionBody} переехал в {@code @shared/components}: его делят с домашним
 * заданием, и рендер формул у экзамена и у домашки обязан быть один.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Pill } from '@shared/components/ui';
import { useTheme } from '@shared/theme/ThemeContext';

const NAVY = '#274185';
const MUTED = '#64748B';
const GREEN = '#22C55E';

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
