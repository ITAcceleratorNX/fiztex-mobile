import React from 'react';
import { View } from 'react-native';
import { Txt } from '@shared/components/Txt';
import { Card, Pill } from '@shared/components/ui';
import { useTheme } from '@shared/theme/ThemeContext';
import { stamp } from '@shared/api/homeworkMap';
import { useAntiCheatLog } from '@shared/hooks/useTeacherHomework';
import { SectionLabel } from '@features/homework/components';

/** Подписи типов. Тип приходит кодом, «нарушение или нет» — отдельным полем с сервера:
 *  правило одно на веб и телефон, и вычислять его здесь заново значило бы завести второе. */
const LABELS = {
  TAB_SWITCH: 'Переключение вкладки',
  WINDOW_BLUR: 'Окно потеряло фокус',
  APP_BACKGROUND: 'Выход из приложения',
  PAGE_CLOSE: 'Выход из задания',
  RE_ENTRY: 'Возврат в задание',
  SCREENSHOT_ATTEMPT: 'Попытка скриншота',
};

/**
 * Античит-события рядом с ответом ученика (ТЗ ANTICHEAT-001 §6, §8).
 *
 * <p><b>Блок ничего не советует.</b> Ни «списывал», ни «снизить оценку»: ТЗ прямо
 * запрещает системе решать за учителя. Здесь только факты — что, когда и на каком
 * вопросе, — а вывод делает человек.
 *
 * <p>Выключённый и пустой журнал не рисуется вовсе: карточка «нарушений нет» там, где
 * никто не наблюдал, — это утверждение, которого никто не проверял.
 */
export function AntiCheatLog({ homeworkId, studentProfileId }) {
  const { c } = useTheme();
  const { loading, error, data } = useAntiCheatLog(homeworkId, studentProfileId);

  if (loading || error) return null;
  const attempts = data?.attempts ?? [];
  if (!data?.enabled && attempts.length === 0) return null;

  return (
    <Card elevated style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>Античит</SectionLabel>
        {/* Не красный: красным экран выносит вердикт, а вердикт по ТЗ §6 — за учителем.
            Это метка «посмотрите сюда», а не «снизьте оценку». */}
        {data.violationCount > 0 ? (
          <Pill color="gold">{violationsLabel(data.violationCount)}</Pill>
        ) : null}
      </View>

      <Txt style={{ fontSize: 12, lineHeight: 17, color: c.inkMuted }}>
        {data.enabled
          ? 'Что зафиксировало приложение во время работы. Решение по оценке — за вами.'
          : 'Наблюдение выключено. Ниже — то, что было записано, пока оно работало.'}
      </Txt>

      {attempts.length === 0 ? (
        <Txt style={{ fontSize: 14, color: c.ink3 }}>Нарушений не зафиксировано.</Txt>
      ) : (
        attempts.map((attempt) => (
          <View key={attempt.attemptId ?? 'pending'} style={{ gap: 6 }}>
            <Txt style={{ fontSize: 12, fontWeight: '700', color: c.ink2 }}>
              {attempt.attemptNumber != null ? `Версия ${attempt.attemptNumber}` : 'До отправки'}
              {' · '}
              {violationsLabel(attempt.violationCount ?? 0)}
            </Txt>
            {(attempt.events ?? []).map((event) => (
              <View
                key={event.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: c.bg2,
                }}
              >
                <Txt style={{ flex: 1, fontSize: 13, color: c.ink }}>
                  {LABELS[event.type] ?? event.type}
                  {event.questionNumber != null ? ` · вопрос ${event.questionNumber}` : ''}
                  {event.violation ? '' : ' · не нарушение'}
                </Txt>
                <Txt style={{ fontSize: 12, color: c.ink3 }}>{stamp(event.occurredAt)}</Txt>
              </View>
            ))}
          </View>
        ))
      )}
    </Card>
  );
}

function violationsLabel(count) {
  if (count === 0) return 'без нарушений';
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10;
  const word = tail === 1 ? 'нарушение' : tail >= 2 && tail <= 4 ? 'нарушения' : 'нарушений';
  return `${count} ${word}`;
}
