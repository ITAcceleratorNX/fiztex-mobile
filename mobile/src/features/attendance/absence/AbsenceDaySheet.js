import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { PrimaryButton, StateView } from '@shared/components/ui';
import { BottomSheet } from '@shared/ui/BottomSheet';
import { useAbsenceDay } from '@shared/hooks/useAbsence';
import {
  absenceReasonLabel,
  daySheetState,
  dayTitle,
  missedTitle,
  momentLabel,
  respondLabel,
  teacherShortName,
} from '@shared/api/absenceMap';

/**
 * День отсутствия ребёнка (Figma `phyztex` Р3, Р4, Р7–Р9): пропущенные уроки, состояние причины
 * и кнопка ответа. Что показать, решает серверное состояние дня (`daySheetState`); ответить
 * можно, только если сервер разрешил (`canRespond`).
 *
 * Ответов второго родителя здесь нет — сервер их не отдаёт: родители бывают раздельно живущими.
 */
export function AbsenceDaySheet({ childId, date, childLabel, onClose, onRespond }) {
  const { c } = useTheme();
  const { loading, error, day, reload } = useAbsenceDay({ childId, date });
  const state = daySheetState(day);
  const lessons = day?.absentLessons ?? [];
  const canAnswer = Boolean(day?.canRespond)
    && (state.kind === 'open' || state.kind === 'requested' || state.kind === 'clarify'
      || (state.kind === 'pending' && !state.response));

  let body;
  if (loading && !day) {
    body = <ActivityIndicator color={c.blue} style={{ paddingVertical: 40 }} />;
  } else if (error && !day) {
    body = (
      <StateView
        style={{ paddingVertical: 24 }}
        icon="alertTriangle"
        tone="error"
        title="Не удалось загрузить день"
        subtitle="Проверьте соединение и попробуйте снова"
        actionLabel="Повторить"
        onAction={() => reload()}
      />
    );
  } else {
    body = (
      <>
        <StateBlock day={day} state={state} />
        {lessons.length > 0 ? <LessonList lessons={lessons} /> : (
          <Txt style={{ fontSize: 13, color: c.inkMuted }}>
            Пропусков в этот день больше нет — учитель исправил отметки.
          </Txt>
        )}
      </>
    );
  }

  return (
    <BottomSheet
      title={dayTitle(date)}
      subtitle={childLabel}
      onClose={onClose}
      footer={canAnswer ? (
        <PrimaryButton color="blue" style={{ borderRadius: 16 }} onPress={() => onRespond?.(day)}>
          {respondLabel(state)}
        </PrimaryButton>
      ) : null}
    >
      {body}
    </BottomSheet>
  );
}

function Dot({ color }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}

function StatusLine({ color, children }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Dot color={color} />
      <Txt style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{children}</Txt>
    </View>
  );
}

/** Плашка-просьба (Р3, Р8): значок и текст на тёплой или розовой подложке. */
function Ask({ tone = 'warm', lead, children }) {
  const { c } = useTheme();
  const warm = tone === 'warm';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: warm ? c.green : c.markAbsent,
        backgroundColor: warm ? c.greenSoft : c.markAbsentSoft,
      }}
    >
      <Icon name="alertCircle" size={18} color={warm ? c.greenDeep : c.red} strokeWidth={2} />
      <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20, color: warm ? c.warnInk : c.dangerInk }}>
        {lead ? <Txt style={{ fontWeight: '700', color: c.dangerInk }}>{lead} </Txt> : null}
        {children}
      </Txt>
    </View>
  );
}

/** Свой ответ (Р7, Р8): отклонённый — зачёркнутым. */
function OwnResponse({ response }) {
  const { c } = useTheme();
  const rejected = response.status === 'REJECTED';
  return (
    <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface2, gap: 4 }}>
      <Txt style={{ fontSize: 12, color: c.ink3 }}>Ваш ответ · {momentLabel(response.submittedAt)}</Txt>
      <Txt
        style={{
          fontSize: 17,
          fontWeight: '700',
          color: rejected ? c.ink3 : c.ink,
          textDecorationLine: rejected ? 'line-through' : 'none',
        }}
      >
        {absenceReasonLabel(response.reason)}
      </Txt>
      {response.comment ? (
        <Txt style={{ fontSize: 14, color: rejected ? c.ink3 : c.ink2 }}>«{response.comment}»</Txt>
      ) : null}
    </View>
  );
}

function StateBlock({ day, state }) {
  const { c } = useTheme();
  const teacher = teacherShortName(day?.openRequest?.requestedByName);

  if (state.kind === 'confirmed') {
    const by = teacherShortName(day.reason?.confirmedByName);
    return (
      <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.success, backgroundColor: c.successSoft, gap: 6 }}>
        <StatusLine color={c.markPresent}>Причина подтверждена</StatusLine>
        <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>{absenceReasonLabel(day.reason.reason)}</Txt>
        {day.reason.comment ? <Txt style={{ fontSize: 14, color: c.ink2 }}>«{day.reason.comment}»</Txt> : null}
        <Txt style={{ fontSize: 12, color: c.ink3 }}>
          {[by ? `Подтверждено: ${by}` : 'Подтверждено классным руководителем', momentLabel(day.reason.confirmedAt)]
            .filter(Boolean).join(' · ')}
        </Txt>
      </View>
    );
  }

  if (state.kind === 'pending') {
    return (
      <View style={{ gap: 10 }}>
        <StatusLine color={c.markLate}>Ожидает подтверждения</StatusLine>
        <Txt style={{ fontSize: 14, lineHeight: 20, color: c.inkMuted }}>
          {state.response
            ? 'Классный руководитель проверит ответ. Пока причина не подтверждена, в дневнике она не отображается.'
            : 'Причину уже сообщили — классный руководитель проверит ответ.'}
        </Txt>
        {state.response ? <OwnResponse response={state.response} /> : null}
      </View>
    );
  }

  if (state.kind === 'clarify') {
    return (
      <View style={{ gap: 12 }}>
        <StatusLine color={c.markAbsent}>Нужно уточнение</StatusLine>
        <Ask tone="danger" lead="Классный руководитель:">
          {state.response.decisionComment || 'уточните, пожалуйста, причину отсутствия.'}
        </Ask>
        <OwnResponse response={state.response} />
      </View>
    );
  }

  if (state.kind === 'requested') {
    return (
      <View style={{ gap: 12 }}>
        <Ask>
          {teacher ? `Классный руководитель ${teacher} просит` : 'Классный руководитель просит'} указать причину
          отсутствия.{day.openRequest?.message ? ` «${day.openRequest.message}»` : ''}
        </Ask>
        <StatusLine color={c.markAbsent}>Причина не указана</StatusLine>
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <StatusLine color={c.markAbsent}>Причина не указана</StatusLine>
      <Txt style={{ fontSize: 14, lineHeight: 20, color: c.inkMuted }}>
        Запроса от классного руководителя нет — причину можно указать самостоятельно.
      </Txt>
    </View>
  );
}

function LessonList({ lessons }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Txt style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: c.ink3, textTransform: 'uppercase' }}>
        {missedTitle(lessons.length)}
      </Txt>
      {lessons.map((lesson, index) => (
        <View
          key={lesson.lessonId}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: c.border,
          }}
        >
          <Txt style={{ width: 44, fontSize: 14, color: c.ink3 }}>{String(lesson.startTime || '').slice(0, 5)}</Txt>
          <Txt style={{ flex: 1, minWidth: 0, fontSize: 15, color: c.ink }} numberOfLines={1}>{lesson.subjectName}</Txt>
          <View style={{ borderRadius: 6, borderWidth: 1, borderColor: c.markAbsent, backgroundColor: c.redSoft, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Txt style={{ fontSize: 12, fontWeight: '600', color: c.red }}>
              {lesson.mark === 'EXCUSED' ? 'Освобождён' : 'Отсутствовал'}
            </Txt>
          </View>
        </View>
      ))}
    </View>
  );
}
