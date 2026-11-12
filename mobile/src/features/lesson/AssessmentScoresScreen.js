import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Banner, OutlineButton, PrimaryButton, StateView } from '@shared/components/ui';
import { TextEditSheet } from '@shared/components/TextEditSheet';
import { useAssessmentScores } from '@shared/hooks/useAssessmentWork';
import {
  barMessage,
  collectChanges,
  hasMeaningfulReason,
  needsReason,
  scoreDraftProblem,
} from '@shared/api/assessmentScores';

/**
 * Баллы СОР/СОЧ (Figma Mobile — продолжение M10/M11; то же, что колонка работы в журнале веба).
 *
 * Весь состав урока; в строке поле балла «из максимума». Правки копятся и уходят одним действием
 * «Сохранить баллы». Пустое поле — не менять, `0` — результат; больше максимума — ошибка в строке и
 * сохранить нельзя. Исправление уже выставленного СОЧ просит причину. Право править называет сервер
 * (`canManage`), экран его не вычисляет; администратор лист читает, а СОЧ исправляет (`canCorrect`).
 */
export function AssessmentScoresScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const workId = payload?.workId ?? null;
  const { loading, error, forbidden, sheet, saving, reload, save } = useAssessmentScores(workId);
  /** Несохранённые правки: studentProfileId → текст поля. */
  const [drafts, setDrafts] = useState(() => new Map());
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonError, setReasonError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const students = useMemo(
    () => new Map((sheet?.students ?? []).map((row) => [row.studentProfileId, row])),
    [sheet],
  );
  const { changes, invalid } = useMemo(
    () => (sheet
      ? collectChanges(drafts, { workId, kind: sheet.kind, maxScore: sheet.maxScore, students })
      : { changes: [], invalid: [] }),
    [drafts, sheet, students, workId],
  );

  const setDraft = useCallback((studentId, text) => {
    setDrafts((current) => {
      const next = new Map(current);
      if (text == null) next.delete(studentId);
      else next.set(studentId, text);
      return next;
    });
  }, []);

  async function run(reason) {
    setSaveError(null);
    setReasonOpen(false);
    const result = await save(changes, reason);
    setDrafts((current) => {
      const next = new Map(current);
      result.saved.forEach((id) => next.delete(id));
      return next;
    });
    if (result.failed.length > 0) {
      setSaveError(`Сохранено ${result.saved.length} из ${result.saved.length + result.failed.length}. ${result.failed[0].message}`);
    }
  }

  function requestSave() {
    if (changes.length === 0 || invalid.length > 0 || saving) return;
    if (needsReason(changes)) {
      setReasonError(null);
      setReasonOpen(true);
    } else {
      run();
    }
  }

  const back = () => nav?.back?.();
  const message = saveError || barMessage(changes, invalid.length);
  const canEditRow = (row) => (sheet?.canManage === true) || (sheet?.canCorrect === true && row.score != null);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen scroll={false} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад к уроку"
            onPress={back}
            hitSlop={8}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.4} />
            <Txt style={{ fontSize: 18, fontWeight: '500', color: c.blue }}>К уроку</Txt>
          </Pressable>
          <Txt style={{ fontSize: 24, fontWeight: '700', color: c.ink }}>
            {sheet ? `${sheet.title} · баллы` : 'Баллы работы'}
          </Txt>
          {sheet ? (
            <Txt style={{ fontSize: 13, color: c.ink3 }}>{`Максимум: ${sheet.maxScore}`}</Txt>
          ) : null}
        </View>

        {loading ? (
          <View style={{ padding: 32 }}><ActivityIndicator color={c.blue} /></View>
        ) : forbidden ? (
          <StateView icon="lock" title="Нет доступа" subtitle="Баллы этой работы вам недоступны" />
        ) : error && !sheet ? (
          <StateView icon="alertTriangle" tone="error" title={error} actionLabel="Повторить" onAction={() => reload()} />
        ) : sheet ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
          >
            {!sheet.canManage && !sheet.canCorrect ? (
              <Banner icon="lock" tone="soft">Баллы доступны только для просмотра</Banner>
            ) : null}
            {sheet.canCorrect && !sheet.canManage ? (
              <Banner icon="info" tone="soft">Администратор исправляет уже выставленные баллы СОЧ с причиной</Banner>
            ) : null}
            <View style={{ backgroundColor: c.surface, borderRadius: 16, overflow: 'hidden' }}>
              {sheet.students.map((row, index) => {
                const draft = drafts.get(row.studentProfileId);
                const problem = draft !== undefined ? scoreDraftProblem(draft, sheet.maxScore) : null;
                const editable = canEditRow(row);
                const changed = draft !== undefined && draft.trim() !== '' && draft.trim() !== String(row.score ?? '');
                return (
                  <View
                    key={row.studentProfileId}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: c.border,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Txt style={{ fontSize: 15, fontWeight: '500', color: row.inAudience ? c.ink : c.ink3 }} numberOfLines={2}>
                          {row.name}
                        </Txt>
                        {!row.inAudience ? (
                          <Txt style={{ fontSize: 11, color: c.ink3 }}>больше не в составе, балл сохранён</Txt>
                        ) : null}
                      </View>
                      {editable ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            accessibilityLabel={`Балл: ${row.name}`}
                            value={draft !== undefined ? draft : row.score != null ? String(row.score) : ''}
                            placeholder="—"
                            placeholderTextColor={c.ink3}
                            keyboardType="number-pad"
                            editable={!saving}
                            onChangeText={(text) => {
                              const same = text.trim() === (row.score != null ? String(row.score) : '');
                              setDraft(row.studentProfileId, same ? null : text);
                            }}
                            style={{
                              width: 64,
                              height: 40,
                              textAlign: 'center',
                              fontSize: 16,
                              fontWeight: '700',
                              color: problem ? c.red : c.ink,
                              borderWidth: 1,
                              borderRadius: 10,
                              borderColor: problem ? c.red : draft !== undefined ? c.blue : c.border,
                              backgroundColor: c.surface,
                            }}
                          />
                          <Txt style={{ fontSize: 14, color: c.ink3 }}>{`/ ${sheet.maxScore}`}</Txt>
                        </View>
                      ) : (
                        <Txt style={{ fontSize: 16, fontWeight: '700', color: row.score == null ? c.ink3 : c.ink }}>
                          {row.score == null ? '—' : `${row.score} / ${sheet.maxScore}`}
                        </Txt>
                      )}
                    </View>
                    {problem ? <Txt accessibilityRole="alert" style={{ fontSize: 12, color: c.red }}>{problem}</Txt> : null}
                    {!problem && changed && row.score != null ? (
                      <Txt style={{ fontSize: 12, color: c.ink3 }}>{`Было ${row.score}`}</Txt>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : null}

        {message ? (
          <View
            style={{
              backgroundColor: c.surface,
              borderTopWidth: 1,
              borderTopColor: c.border,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(16, insets.bottom + 8),
              gap: 10,
            }}
          >
            <Txt accessibilityRole={saveError || invalid.length > 0 ? 'alert' : undefined}
              style={{ fontSize: 13, color: saveError || invalid.length > 0 ? c.red : c.ink3 }}>
              {message}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <OutlineButton size="lg" disabled={saving} onPress={() => { setDrafts(new Map()); setSaveError(null); }}>
                  Отменить
                </OutlineButton>
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton disabled={changes.length === 0 || invalid.length > 0 || saving} onPress={requestSave}>
                  Сохранить баллы
                </PrimaryButton>
              </View>
            </View>
          </View>
        ) : null}
      </Screen>

      <TextEditSheet
        visible={reasonOpen}
        title="Причина исправления СОЧ"
        label="Причина"
        placeholder="Например: не засчитана задача 4"
        maxLength={500}
        multiline
        saving={saving}
        error={reasonError}
        saveLabel="Сохранить баллы"
        onSave={(value) => {
          if (!hasMeaningfulReason(value)) { setReasonError('Укажите причину исправления'); return; }
          setReasonError(null);
          run(value.trim());
        }}
        onClose={() => { setReasonOpen(false); setReasonError(null); }}
      />
    </View>
  );
}
