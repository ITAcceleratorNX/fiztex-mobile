import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  ConfirmDialog,
  FilledButton,
  OutlineButton,
  Pill,
  PickerSheet,
  StateView,
} from '@shared/components/ui';
import { TextEditSheet } from '@shared/components/TextEditSheet';
import { useLesson } from '@shared/hooks/useLesson';
import { useAttendanceEditor, useAttendanceHistory } from '@shared/hooks/useAttendance';
import { formatStamp } from '@shared/api/lessonMap';
import { REASON_OPTIONS, STATUS_OPTIONS, historyLine, sheetBadge } from '@shared/api/attendanceMap';
import { AttendanceStudentRow } from './AttendanceStudentRow';
import { AttendanceCancelled, AttendanceEmptyRoster, AttendanceSkeleton } from './AttendanceStates';

const COMMENT_MAX = 500;

/** Возврат к карточке урока (Figma `back-button`). */
function BackRow({ onBack }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Назад к уроку"
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.4} />
        <Txt style={{ fontSize: 18, fontWeight: '500', color: c.blue }}>К уроку</Txt>
      </Pressable>
    </View>
  );
}

/** Полоса-предупреждение над листом (Figma `reminder-banner`). */
function NoticeBanner({ children }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.greenSoft,
        borderWidth: 1,
        borderColor: c.green,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Txt style={{ fontSize: 13, fontWeight: '600', color: c.green }}>{children}</Txt>
    </View>
  );
}

/**
 * Конфликт правки (Figma `conflict-banner-mobile`): чужие изменения уже в базе, свои
 * ещё на экране. Единственное предложенное действие — забрать чужую версию: слить их
 * молча нельзя, а решать за учителя, чья правка важнее, тем более.
 */
function ConflictBanner({ onRefresh, busy }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.blueSoft,
        borderWidth: 1,
        borderColor: c.borderStrong,
        borderRadius: 12,
        padding: 12,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.borderStrong,
          }}
        >
          <Txt style={{ fontSize: 11, fontWeight: '700', color: c.blue }}>i</Txt>
        </View>
        <Txt style={{ flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 16, color: c.blue }}>
          Посещаемость была изменена другим пользователем. Обновите данные.
        </Txt>
      </View>
      <OutlineButton size="sm" onPress={onRefresh} disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Обновляем…' : 'Обновить данные'}
      </OutlineButton>
    </View>
  );
}

/**
 * История изменений (Figma: строка со счётчиком, на экране отменённого урока —
 * развёрнутая панель). Одна панель в двух состояниях, а не два блока: список тот же,
 * меняется только то, свёрнут он или нет.
 */
function HistoryPanel({ total, rows, expanded, onToggle }) {
  const { c } = useTheme();
  if (total == null) return null;
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink }}>
          {`История изменений (${total})`}
        </Txt>
        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={16} color={c.ink3} />
      </Pressable>
      {expanded ? (
        <View style={{ gap: 10 }}>
          {rows.length === 0 ? (
            <Txt style={{ fontSize: 12, fontWeight: '400', color: c.ink3 }}>
              Изменений пока не было
            </Txt>
          ) : (
            rows.map((row) => (
              <Txt key={row.id} style={{ fontSize: 12, fontWeight: '400', color: c.ink2 }}>
                {historyLine(row, formatStamp)}
              </Txt>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Посещаемость урока — рабочий экран учителя (Figma «Посещаемость», node 2086:5806
 * и соседние состояния).
 *
 * <b>Просмотр и правка — разные режимы одного экрана</b>, как в макете: сначала лист
 * читается, «Редактировать» включает управление. Так открытие урока не выглядит
 * приглашением что-то в нём поменять, а случайный тап по чипу не меняет отметку.
 *
 * <b>Что разрешено, решает бэк.</b> `canFill` и `canPublish` приходят посчитанными
 * (`attendance-read-contract.md` §4): экран не проверяет ни время урока, ни отмену, ни
 * роль — иначе кнопка и сервер разошлись бы в понимании одного правила.
 *
 * `payload` — из карточки урока: `lessonInstanceId` и дата для шапки.
 */
export function AttendanceScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const lessonId = payload?.lessonInstanceId ?? null;
  const { lesson } = useLesson(lessonId, { history: false });
  const attendance = useAttendanceEditor(lessonId);
  const {
    loading, error, forbidden, sheet, rows, dirty,
    markedCount, totalCount, editing, startEditing, stopEditing,
    busy, conflict, unmarked, bulkConfirm, actionError,
    dismissBulkConfirm, dismissActionError,
    setStatus, toggleMark, setReason, setComment,
    saveDraft, publish, markAllPresent, refresh, reload,
  } = attendance;

  const history = useAttendanceHistory(lessonId, { enabled: Boolean(lesson?.can.viewHistory) });
  // `null` — «учитель ещё не трогал панель»: тогда её раскрытость решает экран, и на
  // отменённом уроке история открыта сразу (макет 2086:7325) — там она единственное,
  // что осталось посмотреть. Инициализировать состояние сразу нельзя: при первом
  // рендере ещё неизвестно, отменён ли урок.
  const [historyOpen, setHistoryOpen] = useState(null);

  // Какой ученик сейчас правится и чем именно. Один слот на все три шита: открыть
  // два сразу нельзя, а три независимых состояния разошлись бы при закрытии.
  const [picker, setPicker] = useState(null); // { kind: 'status'|'reason'|'comment', id }
  const closePicker = useCallback(() => setPicker(null), []);
  const pickedRow = useMemo(
    () => rows.find((row) => row.studentProfileId === picker?.id) || null,
    [rows, picker],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      await history.reload();
    } finally {
      setRefreshing(false);
    }
  }, [refresh, history]);

  const onBack = useCallback(() => nav?.back?.(), [nav]);

  if (loading || forbidden || (!sheet && error)) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        <BackRow onBack={onBack} />
        {loading ? (
          <View style={{ padding: 16 }}>
            <AttendanceSkeleton />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
            {forbidden ? (
              <StateView
                icon="lock"
                tone="brand"
                title="У вас нет доступа к посещаемости этого урока"
                subtitle="Лист видят администратор и учителя урока"
                actionLabel="Вернуться к уроку"
                onAction={onBack}
              />
            ) : (
              <StateView
                icon="alertTriangle"
                tone="warn"
                title="Не удалось загрузить посещаемость"
                subtitle="Проверьте подключение к сети интернет и попробуйте ещё раз"
                actionLabel="Повторить"
                onAction={() => reload()}
              />
            )}
          </View>
        )}
      </Screen>
    );
  }

  const cancelled = lesson?.status === 'CANCELLED' || sheet?.state === 'ANNULLED';
  const audience = [lesson?.className, lesson?.subgroupName].filter(Boolean).join(' · ');
  // Заполнять нельзя, а урок ещё не начался — единственная причина, о которой стоит
  // сказать: она пройдёт сама. Остальные («нет прав», «урок отменён») уже видны из
  // бейджа и тела экрана.
  const notStartedYet = !sheet?.canFill && !cancelled && lesson?.temporalStatus === 'UPCOMING';
  const canEdit = Boolean(sheet?.canFill);
  const showList = !cancelled && rows.length > 0;
  const saving = busy === 'draft';
  const publishing = busy === 'publish';

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + 32 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <BackRow onBack={onBack} />

      <View style={{ padding: 16, gap: 12 }}>
        {/* Порядок не косметический: конфликт блокирует работу, восстановление
            объясняет, почему лист снова черновик, напоминание — самое общее из трёх. */}
        {conflict ? <ConflictBanner onRefresh={onRefresh} busy={refreshing} /> : null}
        {!conflict && sheet?.restoredAt ? (
          <NoticeBanner>⚠ Урок восстановлен — посещаемость требует повторной публикации</NoticeBanner>
        ) : null}
        {!conflict && !sheet?.restoredAt && sheet?.reminder ? (
          <NoticeBanner>⚠ Заполните посещаемость по текущему уроку</NoticeBanner>
        ) : null}

        {error ? (
          <Txt style={{ fontSize: 12, color: c.red }}>
            Не удалось обновить — показаны последние загруженные данные
          </Txt>
        ) : null}

        {/* Шапка — Figma `step-1-info` */}
        <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt style={{ flex: 1, fontSize: 22, fontWeight: '700', color: c.blue }}>
              Посещаемость
            </Txt>
            <View style={{ backgroundColor: c.bg2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Txt style={{ fontSize: 10, fontWeight: '700', color: c.ink2 }}>
                {sheetBadge(sheet, { cancelled })}
              </Txt>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Txt style={{ fontSize: 14, fontWeight: '600', color: c.blue }} numberOfLines={1}>
              {lesson?.subject || 'Урок'}
            </Txt>
            {lesson?.badge ? <Pill color={lesson.badge.color}>{lesson.badge.label}</Pill> : null}
            <Txt style={{ fontSize: 14, fontWeight: '600', color: c.blue }}>{lesson?.timeRange}</Txt>
          </View>

          {audience ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="users" size={16} color={c.blue} strokeWidth={2} />
              <Txt style={{ fontSize: 14, fontWeight: '400', color: c.ink }}>{audience}</Txt>
            </View>
          ) : null}
        </View>

        {/* Строка списка. «Все присутствуют» — только в правке: в просмотре это была бы
            кнопка, меняющая данные с экрана, который данные не меняет. */}
        <View
          style={{
            minHeight: 40,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>Список учеников</Txt>
          {editing && canEdit && showList ? (
            <OutlineButton onPress={() => markAllPresent()} disabled={busy === 'bulk'}>
              {busy === 'bulk' ? 'Отмечаем…' : 'Все присутствуют'}
            </OutlineButton>
          ) : (
            totalCount > 0 ? (
              <Txt style={{ fontSize: 13, fontWeight: '600', color: c.inkMuted }}>
                {`${markedCount} из ${totalCount}`}
              </Txt>
            ) : null
          )}
        </View>

        {notStartedYet ? (
          <View style={{ backgroundColor: c.bg2, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink2 }}>
              Отметка станет доступна с начала урока
            </Txt>
          </View>
        ) : null}

        {actionError ? (
          <Pressable onPress={dismissActionError}>
            <View style={{ backgroundColor: c.redSoft, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Txt style={{ fontSize: 13, fontWeight: '600', color: c.red }}>{actionError}</Txt>
            </View>
          </Pressable>
        ) : null}

        {/* Тело: отменённый урок, пустой состав или сам лист. */}
        {cancelled ? (
          <AttendanceCancelled annulled={sheet?.state === 'ANNULLED'} />
        ) : rows.length === 0 ? (
          <AttendanceEmptyRoster />
        ) : (
          <View style={{ gap: 12 }}>
            {rows.map((row) => (
              <AttendanceStudentRow
                key={row.studentProfileId}
                row={row}
                editable={editing && canEdit}
                highlight={unmarked.includes(row.studentProfileId)}
                onPickStatus={() => setPicker({ kind: 'status', id: row.studentProfileId })}
                onToggleMark={() => toggleMark(row.studentProfileId)}
                onPickReason={() => setPicker({ kind: 'reason', id: row.studentProfileId })}
                onEditComment={() => setPicker({ kind: 'comment', id: row.studentProfileId })}
              />
            ))}
          </View>
        )}

        <HistoryPanel
          total={history.total}
          rows={history.rows}
          expanded={historyOpen ?? cancelled}
          onToggle={() => setHistoryOpen((v) => !(v ?? cancelled))}
        />

        {/* Подвал. В просмотре одна кнопка — вход в правку; в правке две, и «Опубликовать»
            остаётся выключённой, пока лист неполный: это условие бэка (§14), и повторять
            его догадкой на клиенте не нужно — оно уже посчитано. */}
        {editing ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <OutlineButton
              size="lg"
              style={{ flex: 1 }}
              disabled={!dirty || saving || publishing}
              onPress={saveDraft}
            >
              {saving ? 'Сохраняем…' : 'Черновик'}
            </OutlineButton>
            <FilledButton
              size="lg"
              style={{ flex: 1 }}
              disabled={publishing || saving || markedCount !== totalCount || totalCount === 0}
              onPress={async () => {
                if (await publish()) stopEditing();
              }}
            >
              {publishing ? <ActivityIndicator color="#fff" size="small" /> : 'Опубликовать'}
            </FilledButton>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <OutlineButton
              size="lg"
              style={{ width: 166 }}
              disabled={!canEdit || !showList}
              onPress={startEditing}
            >
              Редактировать
            </OutlineButton>
          </View>
        )}

        {/* Выход из правки есть всегда, пока она включена: без него зайти в режим и
            ничего не менять — тупик, из которого выводит только уход с экрана. */}
        {editing ? (
          <Pressable
            accessibilityRole="button"
            onPress={stopEditing}
            style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt style={{ fontSize: 13, fontWeight: '600', color: c.inkMuted }}>
              {dirty ? 'Отменить правки' : 'Выйти из правки'}
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <PickerSheet
        visible={picker?.kind === 'status'}
        title={pickedRow?.fullName}
        options={STATUS_OPTIONS}
        value={pickedRow?.marking?.status || 'NOT_MARKED'}
        onSelect={(value) => {
          setStatus(picker.id, value);
          closePicker();
        }}
        onClose={closePicker}
      />

      <PickerSheet
        visible={picker?.kind === 'reason'}
        title="Причина отсутствия"
        options={REASON_OPTIONS}
        value={pickedRow?.marking?.reason ?? null}
        onSelect={(value) => {
          setReason(picker.id, value);
          closePicker();
        }}
        onClose={closePicker}
      />

      <TextEditSheet
        visible={picker?.kind === 'comment'}
        title={pickedRow?.fullName || 'Комментарий'}
        label="Комментарий к отметке"
        placeholder="Например: предупредил заранее"
        initialValue={pickedRow?.marking?.comment || ''}
        maxLength={COMMENT_MAX}
        multiline
        readOnly={!(editing && canEdit)}
        onSave={(value) => {
          setComment(picker.id, value);
          closePicker();
        }}
        onDelete={() => {
          setComment(picker.id, null);
          closePicker();
        }}
        onClose={closePicker}
      />

      <ConfirmDialog
        visible={Boolean(bulkConfirm)}
        title="Все присутствуют?"
        message="Все индивидуальные отметки будут заменены на «Присутствовал». Продолжить?"
        busy={busy === 'bulk'}
        onCancel={dismissBulkConfirm}
        onConfirm={() => markAllPresent({ confirmOverwrite: true })}
      />
    </Screen>
  );
}
