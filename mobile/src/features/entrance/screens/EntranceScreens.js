import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { PhysTechWordmark, LogoWatermark } from '@shared/components/ui';
import { useAppState } from '@shared/state/AppState';
import { admissionsApi } from '../api/entranceApi';
import { API_BASE_URL } from '../config';
import { useAnticheat } from '../hooks/useAnticheat';
import { TestTimer, formatTime } from '../components/TestTimer';
import { PrivacyOverlay } from '../components/PrivacyOverlay';
import { QuestionBody, QuestionMeta, SaveStatusChip } from '../components/QuestionBody';
import { EntranceCodeBackground } from '../components/EntranceCodeBackground';
import { shadowSm } from '@shared/components/Screen';

const NAVY = '#274185';
const ORANGE = '#FB923C';
const INK = '#1A1F36';
const INK2 = '#1E293B';
const MUTED = '#64748B';
const MUTED2 = '#6B7280';
const BG = '#F8FAFC';
const BG2 = '#FAFBFC';
const INPUT_BG = '#F9FAFB';
const BORDER = '#E2E8F0';
const BORDER2 = '#E8EDF5';
const ERROR = '#EF4444';
const GREEN = '#22C55E';

const CONNECTION_ISSUE_THROTTLE_MS = 60_000;
const SAVE_RETRY_DELAY_MS = 5_000;

const DEFAULT_RULES = [
  'На каждый вопрос один правильный ответ',
  'Вернуться к предыдущему вопросу нельзя',
  'Используйте черновик для расчётов',
];

function buildInitial(attempt) {
  const map = {};
  for (const q of attempt.questions) {
    map[q.id] = { selectedOptionIds: [], openTextAnswer: '', photos: [] };
  }
  for (const a of attempt.answers || []) {
    map[a.questionId] = {
      selectedOptionIds: a.selectedOptionIds ?? [],
      openTextAnswer: a.openTextAnswer ?? '',
      photos: a.photos ?? [],
    };
  }
  return map;
}

function serialize(a) {
  return JSON.stringify({
    s: [...(a.selectedOptionIds || [])].sort((x, y) => x - y),
    t: a.openTextAnswer || '',
    p: [...(a.photos || []).map((photo) => photo.id)].sort((x, y) => x - y),
  });
}

function isQuestionAnswered(a) {
  if (!a) return false;
  if ((a.photos || []).length > 0) return true;
  if ((a.selectedOptionIds || []).length > 0) return true;
  if ((a.openTextAnswer || '').trim().length > 0) return true;
  return false;
}

function pluralRu(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function isRateLimitError(err) {
  return typeof err?.message === 'string' && err.message.includes('Слишком много попыток');
}

function formatGrade(grade) {
  const trimmed = String(grade || '').trim();
  if (!trimmed) return '—';
  if (/класс/i.test(trimmed)) return trimmed;
  return `${trimmed} класс`;
}

function parseRules(rules, allowBack) {
  if (typeof rules === 'string' && rules.trim()) {
    const parts = rules
      .split(/\n|•/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) return parts;
  }
  return [
    DEFAULT_RULES[0],
    allowBack ? 'Можно вернуться к предыдущим вопросам' : DEFAULT_RULES[1],
    DEFAULT_RULES[2],
  ];
}

function OrangeButton({ children, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height: 56,
          borderRadius: 16,
          backgroundColor: ORANGE,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
          shadowColor: ORANGE,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.19,
          shadowRadius: 16,
          elevation: 4,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Txt style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{children}</Txt>
      ) : (
        children
      )}
    </Pressable>
  );
}

function NavyOutlineButton({ children, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height: 56,
          borderRadius: 16,
          backgroundColor: '#fff',
          borderWidth: 2,
          borderColor: NAVY,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Txt style={{ color: NAVY, fontSize: 17, fontWeight: '600' }}>{children}</Txt>
      ) : (
        children
      )}
    </Pressable>
  );
}

function FloatingBottomNav({ onExit, active = 'tests' }) {
  const insets = useSafeAreaInsets();
  const items = [
    { key: 'home', icon: 'home' },
    { key: 'tests', icon: 'fileText' },
    { key: 'user', icon: 'user' },
    { key: 'exit', icon: 'logOut', onPress: onExit },
  ];
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 8) + 4,
      }}
    >
      <View
        style={{
          height: 72,
          borderRadius: 28,
          backgroundColor: '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          elevation: 8,
        }}
      >
        {items.map((item) => {
          const isActive = item.key === active;
          const color = isActive ? ORANGE : MUTED;
          return (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              hitSlop={10}
              style={{ width: 72, alignItems: 'center', justifyContent: 'center', height: 48 }}
            >
              <Icon name={item.icon} size={24} color={color} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Code entry ───────────────────────────────────────────────────────────────
export function EntranceCodeScreen({ onBack, onVerified, bootstrapError, onDismissBootstrapError }) {
  const { toast } = useAppState();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(bootstrapError || null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (bootstrapError) setError(bootstrapError);
  }, [bootstrapError]);

  const submit = async () => {
    if (input.trim().length < 4) {
      setError('Введите персональный код');
      return;
    }
    setLoading(true);
    setError(null);
    onDismissBootstrapError?.();
    try {
      const data = await admissionsApi.verifyCode(input.trim().toUpperCase());
      toast?.('Код принят');
      onVerified?.(data);
    } catch (e) {
      const msg = isRateLimitError(e)
        ? 'Слишком много попыток. Подождите и попробуйте снова.'
        : e.message || 'Код неактивен. Обратитесь к сотруднику школы.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <StatusBar style="light" />
      <EntranceCodeBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.12)',
                marginBottom: 20,
                alignSelf: 'flex-start',
              }}
            >
              <Icon name="chevronLeft" size={22} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ height: 40, marginBottom: 20 }} />
          )}

          <View style={{ alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <PhysTechWordmark size={36} color="#fff" />
            <Txt
              style={{
                color: '#fff',
                fontSize: 28,
                fontWeight: '700',
                lineHeight: 36,
                textAlign: 'center',
              }}
            >
              Вступительный тест
            </Txt>
          </View>

          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 24,
              padding: 24,
              gap: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 32 },
              shadowOpacity: 0.125,
              shadowRadius: 64,
              elevation: 12,
            }}
          >
            <View style={{ gap: 8 }}>
              <Txt style={{ fontSize: 13, fontWeight: '600', color: INK }}>Персональный код</Txt>
              <View
                style={{
                  height: 56,
                  borderRadius: 12,
                  borderWidth: error ? 1 : 1.5,
                  borderColor: error ? ERROR : BORDER2,
                  backgroundColor: INPUT_BG,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  gap: 12,
                }}
              >
                <Txt style={{ fontSize: 16, fontWeight: '600', color: NAVY }}>#</Txt>
                <TextInput
                  value={input}
                  onChangeText={(t) => {
                    setError(null);
                    onDismissBootstrapError?.();
                    setInput(t.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12));
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="PT-4E82"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: '600',
                    color: INK,
                    padding: 0,
                  }}
                />
              </View>
              <Txt
                style={{
                  fontSize: 12,
                  lineHeight: 17,
                  color: MUTED2,
                  textAlign: error ? 'center' : 'left',
                }}
              >
                {error || 'Персональный код указан в приглашении на вступительные испытания.'}
              </Txt>
            </View>

            <View style={{ alignItems: 'center', gap: 20 }}>
              <OrangeButton onPress={submit} disabled={loading} style={{ width: '100%' }}>
                {loading ? <ActivityIndicator color="#fff" /> : 'Войти в систему'}
              </OrangeButton>
              <Pressable onPress={() => setShowHelp((v) => !v)} hitSlop={8}>
                <Txt style={{ fontSize: 14, fontWeight: '600', color: NAVY }}>Не получается войти?</Txt>
              </Pressable>
            </View>

            {showHelp ? (
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(39,65,133,0.06)',
                  backgroundColor: '#F0F4FF',
                  padding: 16,
                  gap: 8,
                }}
              >
                <Txt style={{ fontSize: 13, fontWeight: '600', color: NAVY }}>Нет персонального кода?</Txt>
                <Txt style={{ fontSize: 13, lineHeight: 19, color: '#374151' }}>
                  Если вы потеряли персональный код, обратитесь в приёмную комиссию вашей школы.
                </Txt>
              </View>
            ) : null}

            {__DEV__ ? (
              <Txt style={{ fontSize: 11, lineHeight: 16, color: MUTED2, textAlign: 'center' }}>
                {API_BASE_URL} · demo DEMO2025
              </Txt>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Confirm identity ─────────────────────────────────────────────────────────
export function EntranceConfirmScreen({ applicant, onConfirm, onBack, loading }) {
  const insets = useSafeAreaInsets();
  const rows = [
    { label: 'ФИО', value: applicant.fullName || '—' },
    { label: 'Класс', value: formatGrade(applicant.grade) },
    ...(applicant.parentFullName
      ? [{ label: 'Родитель', value: applicant.parentFullName }]
      : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={{ height: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
          <Txt style={{ fontSize: 17, fontWeight: '600', color: INK2 }}>Подтверждение данных</Txt>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 24,
              paddingHorizontal: 24,
              paddingVertical: 12,
              ...shadowSm,
              shadowOpacity: 0.04,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            {rows.map((row, i) => (
              <View key={row.label}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: BORDER }} /> : null}
                <View style={{ paddingVertical: 12, gap: 4 }}>
                  <Txt style={{ fontSize: 13, fontWeight: '500', color: MUTED }}>{row.label}</Txt>
                  <Txt style={{ fontSize: 17, fontWeight: '600', color: INK2 }}>{row.value}</Txt>
                </View>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 8 }}>
            <Icon name="info" size={20} color={MUTED} strokeWidth={2} />
            <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20, color: MUTED }}>
              Если данные указаны неверно, обратитесь в приёмную комиссию для исправления.
            </Txt>
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
          <OrangeButton onPress={onConfirm} disabled={loading}>
            {loading ? 'Загрузка…' : 'Подтвердить'}
          </OrangeButton>
          <NavyOutlineButton onPress={onBack} disabled={loading}>
            Это не мои данные
          </NavyOutlineButton>
        </View>
      </View>
    </View>
  );
}

// ─── Assignments list ─────────────────────────────────────────────────────────
export function EntranceAssignmentsScreen({
  applicant,
  assignments,
  onRefresh,
  onStart,
  onContinue,
  onViewResult,
  onExit,
}) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const gradeLabel = formatGrade(applicant?.grade);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const handleContinue = async (item) => {
    setBusyId(item.assignmentId);
    try {
      await onContinue?.(item);
    } finally {
      setBusyId(null);
    }
  };

  const handleViewResult = async (item) => {
    setBusyId(item.assignmentId);
    try {
      await onViewResult?.(item);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG2 }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <View
            style={{
              height: 56,
              borderRadius: 16,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <PhysTechWordmark size={28} color={NAVY} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={NAVY} />}
          showsVerticalScrollIndicator={false}
        >
          {assignments.length === 0 ? (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 24,
                alignItems: 'center',
                marginTop: 24,
              }}
            >
              <Txt style={{ fontSize: 17, fontWeight: '700', color: INK, textAlign: 'center' }}>
                Нет назначенных тестов
              </Txt>
              <Txt
                style={{
                  fontSize: 14,
                  color: MUTED,
                  marginTop: 8,
                  textAlign: 'center',
                  lineHeight: 21,
                }}
              >
                Если вы ожидали тест — обратитесь к сотруднику школы.
              </Txt>
            </View>
          ) : (
            assignments.map((item) => {
              const mutedCover =
                item.status === 'AWAITING_REVIEW' ||
                item.status === 'UNAVAILABLE' ||
                item.status === 'OPEN_FOR_VIEWING';
              const busy = busyId === item.assignmentId;
              return (
                <View
                  key={item.assignmentId}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 20,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.04,
                    shadowRadius: 20,
                    elevation: 3,
                  }}
                >
                  <View
                    style={{
                      height: 72,
                      backgroundColor: mutedCover ? '#94A3B8' : NAVY,
                      overflow: 'hidden',
                    }}
                  >
                    <LogoWatermark color="rgba(255,255,255,0.12)" mark={28} count={24} />
                  </View>

                  <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 8 }}>
                    <View style={{ gap: 2 }}>
                      <Txt style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
                        {item.testTitle}
                      </Txt>
                      {gradeLabel ? (
                        <Txt style={{ fontSize: 13, color: MUTED2 }}>{gradeLabel}</Txt>
                      ) : null}
                    </View>
                    <Txt style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {item.subject} · {item.durationMinutes} мин
                      {item.questionCount != null
                        ? ` · ${item.questionCount} ${pluralRu(item.questionCount, ['вопрос', 'вопроса', 'вопросов'])}`
                        : ''}
                    </Txt>

                    <View style={{ marginTop: 8, gap: 12 }}>
                      {item.availableAction === 'CONTINUE' ? (
                        <Txt
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: ORANGE,
                            letterSpacing: 0.6,
                          }}
                        >
                          В ПРОЦЕССЕ
                        </Txt>
                      ) : null}
                      {item.availableAction === 'NONE' && item.status === 'AWAITING_REVIEW' ? (
                        <Txt
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: MUTED2,
                            letterSpacing: 0.6,
                          }}
                        >
                          НА ПРОВЕРКЕ
                        </Txt>
                      ) : null}

                      {item.availableAction === 'START' ? (
                        <Pressable
                          onPress={() => onStart?.(item)}
                          style={({ pressed }) => ({
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: ORANGE,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: pressed ? 0.92 : 1,
                          })}
                        >
                          <Txt style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Начать</Txt>
                        </Pressable>
                      ) : null}

                      {item.availableAction === 'CONTINUE' ? (
                        <Pressable
                          onPress={() => handleContinue(item)}
                          disabled={busy}
                          style={({ pressed }) => ({
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: NAVY,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: busy ? 0.7 : pressed ? 0.92 : 1,
                          })}
                        >
                          <Txt style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                            {busy ? 'Открываем…' : 'Продолжить'}
                          </Txt>
                        </Pressable>
                      ) : null}

                      {item.availableAction === 'VIEW_RESULT' ? (
                        <Pressable
                          onPress={() => handleViewResult(item)}
                          disabled={busy}
                          style={({ pressed }) => ({
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: '#D1FAE5',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: busy ? 0.7 : pressed ? 0.92 : 1,
                          })}
                        >
                          <Txt style={{ color: '#047857', fontSize: 14, fontWeight: '600' }}>
                            {busy ? 'Открываем…' : 'Посмотреть результат'}
                          </Txt>
                        </Pressable>
                      ) : null}

                      {item.availableAction === 'NONE' ? (
                        <View
                          style={{
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: '#E5E7EB',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Txt style={{ color: MUTED2, fontSize: 14, fontWeight: '600' }}>
                            {item.status === 'AWAITING_REVIEW'
                              ? 'Результат будет позже'
                              : 'Назначение закрыто'}
                          </Txt>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <FloatingBottomNav onExit={onExit} active="tests" />
      </View>
    </View>
  );
}

// ─── Instruction before start ─────────────────────────────────────────────────
export function EntranceInstructionScreen({ item, onBegin, onBack, loading }) {
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = useState(false);
  const rules = useMemo(
    () => parseRules(item.rules, item.allowBackNavigation),
    [item.rules, item.allowBackNavigation],
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View
          style={{
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
          }}
        >
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={{ position: 'absolute', left: 20, width: 32, height: 32, justifyContent: 'center' }}
          >
            <Icon name="chevronLeft" size={24} color={NAVY} strokeWidth={2} />
          </Pressable>
          <Txt style={{ fontSize: 17, fontWeight: '600', color: INK2 }}>Инструкция</Txt>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 24,
              padding: 24,
              gap: 8,
              ...shadowSm,
              shadowOpacity: 0.03,
            }}
          >
            <Txt style={{ fontSize: 22, fontWeight: '700', color: INK2 }}>{item.testTitle}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="clock" size={16} color={MUTED} strokeWidth={2} />
                <Txt style={{ fontSize: 14, fontWeight: '500', color: MUTED }}>
                  {item.durationMinutes} минут
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="help" size={16} color={MUTED} strokeWidth={2} />
                <Txt style={{ fontSize: 14, fontWeight: '500', color: MUTED }}>{item.subject}</Txt>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 24,
              padding: 24,
              gap: 12,
              ...shadowSm,
              shadowOpacity: 0.03,
            }}
          >
            <Txt style={{ fontSize: 17, fontWeight: '600', color: INK2 }}>Правила проведения</Txt>
            <View style={{ gap: 8 }}>
              {rules.map((rule) => (
                <View key={rule} style={{ flexDirection: 'row', gap: 10 }}>
                  <Txt style={{ fontSize: 12, fontWeight: '700', color: NAVY, marginTop: 2 }}>•</Txt>
                  <Txt style={{ flex: 1, fontSize: 15, lineHeight: 21, color: INK2 }}>{rule}</Txt>
                </View>
              ))}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 16,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(251,146,60,0.4)',
              backgroundColor: 'rgba(251,146,60,0.06)',
              padding: 20,
            }}
          >
            <Icon name="alertTriangle" size={24} color={ORANGE} strokeWidth={2} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt style={{ fontSize: 15, fontWeight: '700', color: ORANGE }}>Важное предупреждение</Txt>
              <Txt style={{ fontSize: 14, lineHeight: 20, color: INK2 }}>
                Не покидайте окно теста и не переключайте вкладки. Все выходы фиксируются системой.
              </Txt>
            </View>
          </View>

          <Pressable
            onPress={() => setAgreed((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: NAVY,
                backgroundColor: agreed ? NAVY : '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {agreed ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Txt style={{ fontSize: 15, fontWeight: '500', color: INK2 }}>Я ознакомился с правилами</Txt>
          </Pressable>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 8 }}>
          <OrangeButton onPress={onBegin} disabled={loading || !agreed}>
            {loading ? 'Запуск…' : 'Начать тестирование'}
          </OrangeButton>
        </View>
      </View>
    </View>
  );
}

// ─── Test in progress ─────────────────────────────────────────────────────────
export function EntranceTestScreen({ attempt, onFinished }) {
  const { toast } = useAppState();
  const insets = useSafeAreaInsets();
  const attemptId = attempt.attemptId;
  const questions = attempt.questions || [];
  const allowBack = attempt.allowBackNavigation;

  const warnThreshold = attempt.durationMinutes >= 10 ? 600 : 60;
  const warnLabel = attempt.durationMinutes >= 10 ? '10 минут' : '1 минуту';

  const [answers, setAnswers] = useState(() => buildInitial(attempt));
  const [saveStatus, setSaveStatus] = useState({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(attempt.remainingSeconds);
  const [submitting, setSubmitting] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [displayClock, setDisplayClock] = useState(() => formatTime(attempt.remainingSeconds || 0));
  const [finishOpen, setFinishOpen] = useState(false);
  const [anticheatSnack, setAnticheatSnack] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const saveTimers = useRef({});
  const retryTimers = useRef({});
  const savedRef = useRef({});
  const submittingRef = useRef(false);
  const timeWarnShownRef = useRef(false);
  const lastConnectionIssueRef = useRef(0);
  const saveQuestionRef = useRef(async () => {});
  const flushAllRef = useRef(async () => {});

  // Current question id, kept in a ref so anti-cheat / autosave events can tag the question
  // the applicant was on (TZ §4) without re-creating callbacks on every navigation.
  const currentQuestionIdRef = useRef(null);
  currentQuestionIdRef.current = questions[index]?.id ?? null;

  useEffect(() => {
    const seed = {};
    for (const a of attempt.answers || []) {
      seed[a.questionId] = serialize({
        selectedOptionIds: a.selectedOptionIds ?? [],
        openTextAnswer: a.openTextAnswer ?? '',
        photos: a.photos ?? [],
      });
    }
    savedRef.current = seed;
  }, [attempt.attemptId]);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach((t) => clearTimeout(t));
      Object.values(retryTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (privacy) setAnticheatSnack(true);
  }, [privacy]);

  const logConnectionIssue = useCallback(
    (detail = 'autosave failed') => {
      const now = Date.now();
      if (now - lastConnectionIssueRef.current < CONNECTION_ISSUE_THROTTLE_MS) return;
      lastConnectionIssueRef.current = now;
      void admissionsApi.logEvent(attemptId, 'connection_issue', detail, {
        questionId: currentQuestionIdRef.current,
      });
    },
    [attemptId],
  );

  const cancelSaveRetry = useCallback((questionId) => {
    clearTimeout(retryTimers.current[questionId]);
  }, []);

  const saveQuestion = useCallback(
    async (questionId) => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;
      const answer = answersRef.current[questionId] ?? {
        selectedOptionIds: [],
        openTextAnswer: '',
        photos: [],
      };
      const fingerprint = serialize(answer);
      if (savedRef.current[questionId] === fingerprint) {
        setSaveStatus((prev) => ({ ...prev, [questionId]: 'saved' }));
        cancelSaveRetry(questionId);
        return;
      }
      setSaveStatus((prev) => ({ ...prev, [questionId]: 'saving' }));
      try {
        const res = await admissionsApi.saveAnswer(attemptId, {
          questionId,
          selectedOptionIds: question.type === 'OPEN_TEXT' ? undefined : answer.selectedOptionIds,
          openTextAnswer: question.type === 'OPEN_TEXT' ? answer.openTextAnswer : undefined,
        });
        savedRef.current[questionId] = fingerprint;
        setSaveStatus((prev) => ({ ...prev, [questionId]: 'saved' }));
        cancelSaveRetry(questionId);
        setRemaining(res.remainingSeconds);
      } catch {
        setSaveStatus((prev) => ({ ...prev, [questionId]: 'error' }));
        logConnectionIssue();
        cancelSaveRetry(questionId);
        retryTimers.current[questionId] = setTimeout(() => {
          void saveQuestionRef.current(questionId);
        }, SAVE_RETRY_DELAY_MS);
      }
    },
    [attemptId, questions, logConnectionIssue, cancelSaveRetry],
  );

  saveQuestionRef.current = saveQuestion;

  const flushAll = async () => {
    Object.values(saveTimers.current).forEach((t) => clearTimeout(t));
    await Promise.all(Object.keys(answersRef.current).map((k) => saveQuestion(Number(k))));
  };

  flushAllRef.current = flushAll;

  const finishByTimeout = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFinishOpen(false);
    await flushAllRef.current();
    await admissionsApi.logEvent(attemptId, 'time_expired', 'client timer reached zero', {
      questionId: currentQuestionIdRef.current,
    });
    try {
      await admissionsApi.submitAttempt(attemptId);
    } catch {
      /* backend may auto-finish */
    }
    toast?.('Время вышло. Тест отправлен на проверку.');
    onFinished?.();
  }, [attemptId, onFinished, toast]);

  const onLogEvent = useCallback(
    (type, details, keepalive = false) =>
      admissionsApi.logEvent(attemptId, type, details, {
        questionId: currentQuestionIdRef.current,
        keepalive,
      }),
    [attemptId],
  );

  useAnticheat({
    enabled: !submitting,
    attemptId,
    onLogEvent,
    onPrivacy: setPrivacy,
  });

  const handleLowTime = useCallback(
    (low) => {
      if (low && !timeWarnShownRef.current) {
        timeWarnShownRef.current = true;
        setShowTimeWarning(true);
      }
    },
    [],
  );

  const handleTick = useCallback((secondsLeft) => {
    setDisplayClock(formatTime(secondsLeft));
  }, []);

  const scheduleSave = (questionId) => {
    cancelSaveRetry(questionId);
    clearTimeout(saveTimers.current[questionId]);
    saveTimers.current[questionId] = setTimeout(() => void saveQuestion(questionId), 700);
  };

  const updateAnswer = (questionId, next) => {
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    scheduleSave(questionId);
  };

  const setPhotos = (questionId, photos) => {
    const base = answersRef.current[questionId] ?? {
      selectedOptionIds: [],
      openTextAnswer: '',
      photos: [],
    };
    const next = { ...base, photos };
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    setSaveStatus((prev) => ({ ...prev, [questionId]: 'saved' }));
    savedRef.current[questionId] = serialize(next);
  };

  const goTo = async (nextIndex) => {
    const currentId = questions[index].id;
    clearTimeout(saveTimers.current[currentId]);
    await saveQuestion(currentId);
    setIndex(nextIndex);
  };

  const answeredCount = questions.filter((q) => isQuestionAnswered(answers[q.id])).length;

  const confirmFinish = () => setFinishOpen(true);

  const handleFinish = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFinishOpen(false);
    await flushAll();
    try {
      await admissionsApi.submitAttempt(attemptId);
      onFinished?.();
    } catch (e) {
      toast?.(e.message || 'Не удалось завершить тест');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const question = questions[index];
  const answer = answers[question?.id] ?? { selectedOptionIds: [], openTextAnswer: '', photos: [] };
  const currentSaveStatus = saveStatus[question?.id] ?? 'idle';
  const isLast = index === questions.length - 1;
  const progressPct = questions.length > 0 ? Math.round(((index + 1) / questions.length) * 100) : 0;
  const lowClock = remaining <= warnThreshold && remaining > 0;

  if (!questions.length) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, paddingHorizontal: 24, justifyContent: 'center' }}>
        <StatusBar style="dark" />
        <Txt style={{ fontSize: 17, fontWeight: '700', textAlign: 'center', color: INK }}>Тест пустой</Txt>
        <Txt style={{ fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22, marginTop: 8 }}>
          В этом тесте нет вопросов. Обратитесь к администратору школы.
        </Txt>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="dark" />
        <ActivityIndicator color={NAVY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="dark" />
      <PrivacyOverlay visible={privacy} />

      {anticheatSnack ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 16,
            right: 16,
            zIndex: 50,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(251,146,60,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="alertTriangle" size={20} color={ORANGE} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontSize: 14, fontWeight: '700', color: INK2 }}>
              Зафиксирован выход из окна теста
            </Txt>
            <Txt style={{ fontSize: 12, color: MUTED }}>Это событие будет передано школе</Txt>
          </View>
          <Pressable onPress={() => setAnticheatSnack(false)} hitSlop={10}>
            <Icon name="x" size={18} color={MUTED} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 20,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt style={{ fontSize: 17, fontWeight: '700', color: NAVY, flex: 1, marginRight: 12 }} numberOfLines={1}>
              {attempt.subject || attempt.testTitle}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="clock" size={18} color={lowClock ? ERROR : ORANGE} strokeWidth={2} />
              <Txt
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: lowClock ? ERROR : ORANGE,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {displayClock}
              </Txt>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt style={{ fontSize: 13, fontWeight: '600', color: MUTED }}>
                Вопрос {index + 1} из {questions.length}
              </Txt>
              <Txt style={{ fontSize: 13, fontWeight: '600', color: MUTED }}>{progressPct}% завершено</Txt>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: BORDER, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  backgroundColor: NAVY,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        </View>

        {showTimeWarning ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(239,68,68,0.08)',
            }}
          >
            <Txt style={{ fontSize: 13, color: ERROR, fontWeight: '600' }}>
              До конца теста осталось {warnLabel}
            </Txt>
          </View>
        ) : null}

        <TestTimer
          remainingSeconds={remaining}
          durationMinutes={attempt.durationMinutes}
          onExpire={finishByTimeout}
          onLowTime={handleLowTime}
          onTick={handleTick}
          hidden
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 28,
              padding: 28,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 16,
              elevation: 2,
            }}
          >
            <QuestionMeta question={question} />
            <Txt style={{ fontSize: 20, fontWeight: '600', lineHeight: 28, color: INK2 }}>
              {question.text}
            </Txt>
          </View>

          <QuestionBody
            question={question}
            value={answer}
            onChange={(next) => updateAnswer(question.id, next)}
            onPhotosChange={(photos) => setPhotos(question.id, photos)}
            photoProps={{
              attemptId,
              questionId: question.id,
              maxPhotos: question.maxPhotos ?? 1,
              disabled: submitting,
              onUploadFailed: () => logConnectionIssue('photo upload failed'),
            }}
          />

          <SaveStatusChip
            status={currentSaveStatus}
            onRetry={currentSaveStatus === 'error' ? () => void saveQuestion(question.id) : undefined}
          />

          {allowBack ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {questions.map((q, i) => {
                const done = isQuestionAnswered(answers[q.id]);
                const active = i === index;
                return (
                  <Pressable
                    key={q.id}
                    disabled={submitting}
                    onPress={() => goTo(i)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? NAVY : done ? '#EFF6FF' : '#fff',
                      borderWidth: 1,
                      borderColor: active ? NAVY : done ? NAVY : BORDER,
                    }}
                  >
                    <Txt
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: active ? '#fff' : done ? NAVY : MUTED,
                      }}
                    >
                      {String(i + 1)}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <View
          style={{
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: BORDER,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
            flexDirection: 'row',
            gap: 12,
          }}
        >
          {allowBack && index > 0 ? (
            <NavyOutlineButton
              disabled={submitting}
              onPress={() => goTo(index - 1)}
              style={{ width: 120 }}
            >
              Назад
            </NavyOutlineButton>
          ) : null}
          {!isLast ? (
            <OrangeButton
              disabled={submitting}
              onPress={() => goTo(index + 1)}
              style={{ flex: 1 }}
            >
              Далее
            </OrangeButton>
          ) : (
            <OrangeButton disabled={submitting} onPress={confirmFinish} style={{ flex: 1 }}>
              {submitting ? 'Отправка…' : 'Завершить'}
            </OrangeButton>
          )}
        </View>
      </View>

      <Modal visible={finishOpen} transparent animationType="slide" onRequestClose={() => setFinishOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' }}
            onPress={() => setFinishOpen(false)}
          />
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: insets.bottom + 24,
              gap: 24,
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER }} />
            </View>

            <View style={{ alignItems: 'center', gap: 16 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(251,146,60,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="alertTriangle" size={32} color={ORANGE} strokeWidth={2.5} />
              </View>
              <View style={{ gap: 8, alignItems: 'center' }}>
                <Txt style={{ fontSize: 22, fontWeight: '700', color: INK2, textAlign: 'center' }}>
                  Завершить тестирование?
                </Txt>
                <Txt style={{ fontSize: 16, lineHeight: 24, color: MUTED, textAlign: 'center' }}>
                  Вы ответили на {answeredCount} из {questions.length} вопросов. После завершения изменить
                  ответы будет невозможно.
                </Txt>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <OrangeButton onPress={handleFinish} disabled={submitting}>
                {submitting ? 'Отправка…' : 'Завершить тест'}
              </OrangeButton>
              <NavyOutlineButton onPress={() => setFinishOpen(false)} disabled={submitting}>
                Вернуться к вопросам
              </NavyOutlineButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Done (no scores) ─────────────────────────────────────────────────────────
export function EntranceDoneScreen({
  testTitle,
  answeredCount,
  totalQuestions,
  elapsedLabel,
  onBackToList,
  onExit: _onExit,
}) {
  const insets = useSafeAreaInsets();
  const answeredLabel =
    answeredCount != null && totalQuestions != null ? `${answeredCount} из ${totalQuestions}` : '—';

  const rows = [
    { label: 'Тест', value: testTitle || '—' },
    { label: 'Отвечено', value: answeredLabel },
    { label: 'Время', value: elapsedLabel || '—' },
    { label: 'Статус', value: 'На проверке' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          justifyContent: 'center',
          gap: 40,
        }}
      >
        <View style={{ alignItems: 'center', gap: 24 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 40,
              backgroundColor: NAVY,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={20} color="#fff" strokeWidth={3.5} />
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Txt style={{ fontSize: 28, fontWeight: '800', color: NAVY, textAlign: 'center' }}>
              Тест завершён!
            </Txt>
            <Txt style={{ fontSize: 17, color: MUTED, textAlign: 'center' }}>
              Ваши ответы отправлены на проверку
            </Txt>
          </View>
        </View>

        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 24,
            padding: 24,
            gap: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.03,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          {rows.map((row, i) => (
            <View key={row.label}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: BORDER, marginBottom: 16 }} /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt style={{ fontSize: 15, fontWeight: '500', color: MUTED }}>{row.label}</Txt>
                <Txt style={{ fontSize: 15, fontWeight: '700', color: INK2, textAlign: 'right', flexShrink: 1, marginLeft: 12 }}>
                  {row.value}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 24 }}>
          <Txt style={{ fontSize: 14, lineHeight: 20, color: MUTED, textAlign: 'center' }}>
            Результаты будут доступны после проверки приёмной комиссией школы.
          </Txt>
          <OrangeButton onPress={onBackToList}>Вернуться к списку тестов</OrangeButton>
        </View>
      </View>
    </View>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────
export function EntranceResultScreen({ result, onBack, onExit }) {
  const insets = useSafeAreaInsets();

  const displayScore = Math.round(
    result?.percent > 0 ? result.percent : result?.totalScore ?? 0,
  );
  const strongTopics = useMemo(() => {
    if (Array.isArray(result?.strongTopics) && result.strongTopics.length) {
      return result.strongTopics;
    }
    if (!result?.topicBreakdown) return [];
    return Object.entries(result.topicBreakdown)
      .filter(([, data]) => (data.percent ?? 0) >= 70 || (data.max > 0 && data.earned / data.max >= 0.7))
      .map(([name]) => name);
  }, [result]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View
          style={{
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
          }}
        >
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={{ position: 'absolute', left: 20, width: 32, height: 32, justifyContent: 'center' }}
          >
            <Icon name="chevronLeft" size={24} color={NAVY} strokeWidth={2} />
          </Pressable>
          <Txt style={{ fontSize: 17, fontWeight: '600', color: INK2 }}>Результат</Txt>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 32,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Txt style={{ fontSize: 48, fontWeight: '900', color: NAVY, lineHeight: 58 }}>
                  {displayScore}
                </Txt>
                <Txt style={{ fontSize: 15, fontWeight: '600', color: MUTED }}>балла из 100</Txt>
              </View>
              <View
                style={{
                  borderRadius: 100,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: result.passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                }}
              >
                <Txt
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: result.passed ? GREEN : ERROR,
                    textTransform: 'uppercase',
                  }}
                >
                  {result.passed ? 'Тест пройден' : 'Не пройден'}
                </Txt>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: 20,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Txt style={{ fontSize: 12, fontWeight: '600', color: MUTED }}>Проходной балл</Txt>
              <Txt style={{ fontSize: 17, fontWeight: '700', color: INK2 }}>{result.minScore}</Txt>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: BORDER, marginHorizontal: 16 }} />
            <View style={{ flex: 1, gap: 4, alignItems: 'flex-end' }}>
              <Txt style={{ fontSize: 12, fontWeight: '600', color: MUTED }}>Ваш результат</Txt>
              <Txt style={{ fontSize: 17, fontWeight: '700', color: GREEN }}>{displayScore}</Txt>
            </View>
          </View>

          {strongTopics.length > 0 ? (
            <View style={{ gap: 12 }}>
              <Txt style={{ fontSize: 17, fontWeight: '700', color: INK2 }}>Сильные стороны</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {strongTopics.map((topic) => (
                  <View
                    key={topic}
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(34,197,94,0.2)',
                      backgroundColor: 'rgba(34,197,94,0.05)',
                    }}
                  >
                    <Txt style={{ fontSize: 14, fontWeight: '600', color: GREEN }}>{topic}</Txt>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {result.schoolComment?.trim() ? (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 20,
                flexDirection: 'row',
                gap: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View style={{ width: 4, borderRadius: 2, backgroundColor: NAVY, alignSelf: 'stretch' }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Txt style={{ fontSize: 14, fontWeight: '700', color: MUTED }}>Комментарий комиссии</Txt>
                <Txt style={{ fontSize: 15, lineHeight: 22, color: INK2 }}>{result.schoolComment}</Txt>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <FloatingBottomNav onExit={onExit} active="tests" />
      </View>
    </View>
  );
}
