import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { ConfirmDialog, PickerSheet, SegmentedSwitch, StateView } from '@shared/components/ui';
import { FinalChip } from '@shared/ui/grades';
import { useClassFinals, useGradebookContext, useJournal } from '@shared/hooks/useGrades';
import { finalsProgress, formatAverage, incompleteStudentIds } from '@shared/api/gradesMap';
import { GradesSkeleton, NoGradesState, NoPeriodDataState } from './GradeStates';
import { FinalGradeSheet } from './FinalGradeSheet';

/** Заголовок экрана с возвратом (Figma `header-section`). */
function JournalHeader({ tab, onTab, onBack }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      <Pressable
        accessibilityRole="button"
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
        <Icon name="chevronLeft" size={14} color={c.blue} strokeWidth={2.4} />
        <Txt style={{ fontSize: 15, fontWeight: '500', color: c.blue }}>Назад</Txt>
      </Pressable>

      <Txt style={{ fontSize: 26, fontWeight: '700', color: c.ink }}>Журнал</Txt>

      <SegmentedSwitch
        value={tab}
        options={[
          { value: 'JOURNAL', label: 'Журнал' },
          { value: 'FINALS', label: 'Итоги четверти' },
        ]}
        onChange={onTab}
      />
    </View>
  );
}

/** Один фильтр строки: значение и шеврон, выбор — в шите (Figma `Dropdown`). */
function FilterChip({ label, onPress, flex = 1 }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt style={{ flex: 1, fontSize: 13, fontWeight: '500', color: c.ink }} numberOfLines={1}>
        {label}
      </Txt>
      <Icon name="chevronDown" size={12} color={c.ink3} strokeWidth={2.2} />
    </Pressable>
  );
}

/**
 * Журнал класса и итоги четверти (Figma `mobile-journal-list`, `mobile-quarter-results`).
 *
 * <b>Ничего не считает.</b> Средние, рекомендации и признак «можно ли выставлять»
 * приходят с бэка (GRADEBOOK-001 §5, GRADEBOOK-002 §4, §9): второй расчёт на клиенте
 * разошёлся бы с дневником ученика.
 *
 * <b>Журнал — зеркало.</b> Оценка ставится на уроке, где у неё есть источник и автор;
 * отсюда в урок можно только уйти. Итоги четверти, наоборот, живут только здесь.
 *
 * <b>Список того, что можно открыть, приходит с сервера</b> (`/api/gradebook/context`):
 * чужого класса в фильтре не будет, своего — не потеряется.
 */
export function JournalScreen({ nav }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('JOURNAL');
  const [picker, setPicker] = useState(null); // 'class' | 'subject' | 'period'
  const [target, setTarget] = useState({ classId: null, subjectId: null, periodId: null });
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [finalsError, setFinalsError] = useState(null);
  const [missing, setMissing] = useState([]);
  const [editing, setEditing] = useState(null); // строка, которой выставляют итог

  const context = useGradebookContext();
  const { scopes, periods } = context;

  // Значения по умолчанию берутся из ответа: первая доступная пара и текущая четверть.
  // Считать их в рендере нельзя — фильтры должны переживать переключение вкладок.
  useEffect(() => {
    if (target.classId || scopes.length === 0) return;
    const first = scopes[0];
    const current = periods.find((period) => period.current) || periods[0] || null;
    setTarget({
      classId: first.classId,
      subjectId: first.subjectId,
      periodId: current?.id ?? null,
    });
  }, [scopes, periods, target.classId]);

  const classes = useMemo(() => {
    const map = new Map();
    for (const scope of scopes) map.set(scope.classId, scope.className);
    return [...map].map(([id, name]) => ({ value: id, label: name }));
  }, [scopes]);

  const subjects = useMemo(
    () => scopes
      .filter((scope) => scope.classId === target.classId)
      .map((scope) => ({ value: scope.subjectId, label: scope.subjectName })),
    [scopes, target.classId],
  );

  const periodOptions = useMemo(
    () => periods.map((period) => ({ value: period.id, label: period.name })),
    [periods],
  );

  const query = {
    classId: target.classId,
    subjectId: target.subjectId,
    academicPeriodId: target.periodId,
  };
  // Оба запроса живут всё время, а не по вкладке: переключение туда-обратно иначе
  // перезагружало бы таблицу каждый раз, а журнал нужен ещё и экрану ученика.
  // Колонка «Итог. четв.» в списке — это тот же ответ итогов.
  const journal = useJournal(query);
  const finals = useClassFinals(query);

  const currentClass = classes.find((item) => item.value === target.classId)?.label || 'Класс';
  const currentSubject = subjects.find((item) => item.value === target.subjectId)?.label || 'Предмет';
  const currentPeriod = periodOptions.find((item) => item.value === target.periodId)?.label || 'Период';

  const onBack = useCallback(() => nav?.back?.(), [nav]);

  function choose(kind, value) {
    setPicker(null);
    setMissing([]);
    setFinalsError(null);
    if (kind === 'class') {
      // Предмет привязан к классу: чужой в новом классе не откроется, поэтому берётся
      // первый доступный, а не сохраняется прежний.
      const next = scopes.find((scope) => scope.classId === value);
      setTarget((prev) => ({ ...prev, classId: value, subjectId: next?.subjectId ?? null }));
      return;
    }
    if (kind === 'subject') setTarget((prev) => ({ ...prev, subjectId: value }));
    if (kind === 'period') setTarget((prev) => ({ ...prev, periodId: value }));
  }

  async function pickFinal(value) {
    const row = editing;
    setFinalsError(null);
    const failure = await finals.setFinalValue(row, value);
    if (failure) {
      setFinalsError(
        failure.code === 'FINAL_GRADE_YEAR_LOCKED'
          ? 'Годовая оценка опубликована — четвертные по этому предмету закрыты'
          : failure.message || 'Не удалось сохранить итоговую оценку',
      );
      return;
    }
    setMissing((ids) => ids.filter((id) => id !== row.studentProfileId));
    setEditing(null);
  }

  async function publish() {
    setConfirmPublish(false);
    setFinalsError(null);
    const failure = await finals.publishAll();
    if (!failure) {
      setMissing([]);
      return;
    }
    if (failure.code === 'FINAL_GRADE_SET_INCOMPLETE') {
      setMissing(incompleteStudentIds(failure.details));
      setFinalsError('Итоги выставлены не всем ученикам — опубликовать четверть нельзя');
      return;
    }
    setFinalsError(failure.message || 'Не удалось опубликовать итоги');
  }

  const header = (
    <>
      <JournalHeader tab={tab} onTab={setTab} onBack={onBack} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
        <FilterChip label={currentClass} flex={0.8} onPress={() => setPicker('class')} />
        <FilterChip label={currentSubject} flex={1.4} onPress={() => setPicker('subject')} />
        <FilterChip label={currentPeriod} flex={1} onPress={() => setPicker('period')} />
      </View>
    </>
  );

  if (context.loading) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        {header}
        <View style={{ padding: 16 }}>
          <GradesSkeleton header={false} />
        </View>
      </Screen>
    );
  }

  if (context.error || scopes.length === 0) {
    return (
      <Screen scroll={false} style={{ backgroundColor: c.bg }}>
        {header}
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
          {context.error ? (
            <StateView
              icon="alertTriangle"
              tone="warn"
              title="Не удалось загрузить"
              subtitle="Проверьте соединение и попробуйте снова"
              actionLabel="Повторить"
              onAction={() => context.reload()}
            />
          ) : (
            <StateView
              icon="info"
              title="Журнал пока не по чему открыть"
              subtitle="Ни один предмет в классе за вами не закреплён — обратитесь к администратору школы"
            />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      style={{ backgroundColor: c.bg }}
      contentStyle={{ paddingBottom: insets.bottom + 140 }}
    >
      {header}

      {tab === 'JOURNAL' ? (
        <JournalTab
          journal={journal}
          nav={nav}
          finals={finals.finals}
          className={currentClass}
          subjectName={currentSubject}
        />
      ) : (
        <FinalsTab
          finals={finals}
          missing={missing}
          error={finalsError}
          context={`${currentPeriod} · ${currentClass} · ${currentSubject}`}
          onEdit={setEditing}
          onPublish={() => setConfirmPublish(true)}
        />
      )}

      <PickerSheet
        visible={picker === 'class'}
        title="Класс"
        options={classes}
        value={target.classId}
        onSelect={(value) => choose('class', value)}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'subject'}
        title="Предмет"
        options={subjects}
        value={target.subjectId}
        onSelect={(value) => choose('subject', value)}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'period'}
        title="Учебный период"
        options={periodOptions}
        value={target.periodId}
        onSelect={(value) => choose('period', value)}
        onClose={() => setPicker(null)}
      />

      <FinalGradeSheet
        visible={Boolean(editing)}
        studentName={editing?.studentName || ''}
        value={editing?.finalGrade?.value ?? null}
        busy={finals.busy}
        onPick={pickFinal}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        visible={confirmPublish}
        title="Опубликовать итоги четверти?"
        message="После публикации итоговые оценки увидят ученики и родители. Изменить их можно будет до публикации годовой оценки."
        confirmLabel="Опубликовать"
        busy={finals.busy}
        onConfirm={publish}
        onCancel={() => setConfirmPublish(false)}
      />
    </Screen>
  );
}

/** Список учеников со средним баллом (Figma `mobile-journal-list`). */
function JournalTab({ journal, nav, finals, className, subjectName }) {
  const { c } = useTheme();

  if (journal.loading) {
    return (
      <View style={{ padding: 16 }}>
        <GradesSkeleton header={false} />
      </View>
    );
  }

  if (journal.forbidden) {
    return (
      <View style={{ paddingTop: 48 }}>
        <StateView
          icon="lock"
          tone="brand"
          title="Этот предмет в этом классе ведёт другой учитель"
          subtitle="Откройте журнал своего класса"
        />
      </View>
    );
  }

  if (journal.error) {
    return (
      <View style={{ paddingTop: 48 }}>
        <StateView
          icon="alertTriangle"
          tone="warn"
          title="Не удалось загрузить"
          subtitle="Проверьте соединение и попробуйте снова"
          actionLabel="Повторить"
          onAction={() => journal.reload()}
        />
      </View>
    );
  }

  const columns = journal.journal?.columns || [];
  const rows = journal.journal?.rows || [];

  if (columns.length === 0) return <NoPeriodDataState />;
  if (rows.every((row) => (row.cells || []).length === 0)) return <NoGradesState />;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 10 }}>
      <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Список учеников</Txt>
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
        }}
      >
        {rows.map((row) => (
          <Pressable
            key={row.studentProfileId}
            accessibilityRole="button"
            onPress={() =>
              nav?.('journal-student', {
                journal: journal.journal,
                studentProfileId: row.studentProfileId,
                className,
                subjectName,
                finalGrade: (finals?.rows || []).find(
                  (item) => item.studentProfileId === row.studentProfileId,
                )?.finalGrade?.value ?? null,
              })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 56,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              backgroundColor: pressed ? c.bg2 : 'transparent',
            })}
          >
            <Txt style={{ flex: 1, fontSize: 15, fontWeight: '500', color: c.ink }} numberOfLines={1}>
              {row.studentName}
            </Txt>
            <Txt style={{ fontSize: 14, fontWeight: '600', color: c.ink2 }}>
              Ср. балл: {formatAverage(row.average?.value)}
            </Txt>
            <Icon name="chevronRight" size={14} color={c.ink3} strokeWidth={2.2} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Итоги четверти (Figma `mobile-quarter-results`, `mobile-quarter-finished`). */
function FinalsTab({ finals, missing, error, context, onEdit, onPublish }) {
  const { c } = useTheme();

  if (finals.loading) {
    return (
      <View style={{ padding: 16 }}>
        <GradesSkeleton header={false} />
      </View>
    );
  }

  if (finals.forbidden || finals.error) {
    return (
      <View style={{ paddingTop: 48 }}>
        <StateView
          icon={finals.forbidden ? 'lock' : 'alertTriangle'}
          tone={finals.forbidden ? 'brand' : 'warn'}
          title={finals.forbidden ? 'Итоги ведёт другой учитель' : 'Не удалось загрузить'}
          subtitle={
            finals.forbidden
              ? 'Этот предмет в этом классе закреплён не за вами'
              : 'Проверьте соединение и попробуйте снова'
          }
          actionLabel={finals.forbidden ? undefined : 'Повторить'}
          onAction={finals.forbidden ? undefined : () => finals.reload()}
        />
      </View>
    );
  }

  const view = finals.finals;
  const rows = view?.rows || [];
  const canManage = Boolean(view?.canManage);
  const progress = finalsProgress(view);

  if (rows.length === 0) {
    return (
      <View style={{ paddingTop: 48 }}>
        <StateView
          icon="users"
          title="В классе нет учеников"
          subtitle="Проверьте состав класса или подгруппы у администратора"
        />
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 16, gap: 12 }}>
      {progress.published ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginHorizontal: 16,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: c.blueSoft,
          }}
        >
          <Icon name="check" size={16} color={c.blue} strokeWidth={2.6} />
          <Txt style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.blue }}>
            Итоги четверти опубликованы — их видят ученик и родитель
          </Txt>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
        <Txt style={{ flex: 1, fontSize: 13, fontWeight: '500', color: c.ink2 }} numberOfLines={1}>
          {context}
        </Txt>
        <View
          style={{
            backgroundColor: c.bg2,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Txt style={{ fontSize: 11, fontWeight: '700', color: c.ink2 }}>
            {progress.published ? 'Опубликована' : 'Не завершена'}
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 32, gap: 24 }}>
        <Txt style={{ flex: 1, fontSize: 11, fontWeight: '700', color: c.ink3 }}>УЧЕНИК</Txt>
        <Txt style={{ width: 32, fontSize: 11, fontWeight: '700', color: c.ink3, textAlign: 'center' }}>
          РЕК.
        </Txt>
        <Txt style={{ width: 32, fontSize: 11, fontWeight: '700', color: c.ink3, textAlign: 'center' }}>
          ИТОГ.
        </Txt>
      </View>

      <View
        style={{
          marginHorizontal: 16,
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
        }}
      >
        {rows.map((row) => (
          <View
            key={row.studentProfileId}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 24,
              minHeight: 56,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              backgroundColor: missing.includes(row.studentProfileId) ? c.redSoft : 'transparent',
            }}
          >
            <Txt style={{ flex: 1, fontSize: 15, fontWeight: '500', color: c.ink }} numberOfLines={1}>
              {row.studentName}
            </Txt>
            <FinalChip value={row.recommendedValue} tone="hint" />
            {row.yearLocked ? (
              <View style={{ width: 32, alignItems: 'center' }}>
                <Icon name="lock" size={16} color={c.ink3} strokeWidth={2} />
              </View>
            ) : (
              <FinalChip
                value={row.finalGrade?.value ?? null}
                disabled={finals.busy}
                onPress={canManage ? () => onEdit(row) : undefined}
              />
            )}
          </View>
        ))}
      </View>

      {/* §10: годовая — отдельный экран и отдельное решение учителя. Здесь она
          только показывается, и до публикации у неё нейтральный текст (ТЗ §7). */}
      <View
        style={{
          marginHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          borderRadius: 16,
          backgroundColor: c.bg2,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>Годовая оценка</Txt>
          <Txt style={{ fontSize: 12, fontWeight: '500', color: c.ink3 }}>
            Годовая оценка ещё не опубликована
          </Txt>
        </View>
        <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink3 }}>—</Txt>
      </View>

      {error ? (
        <Txt
          style={{
            marginHorizontal: 16,
            fontSize: 13,
            fontWeight: '600',
            color: c.red,
          }}
        >
          {error}
        </Txt>
      ) : null}

      {canManage ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            disabled={!progress.allFilled || progress.published || finals.busy}
            onPress={onPublish}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                !progress.allFilled || progress.published ? c.stripeIdle : c.green,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Txt style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              Опубликовать итоги четверти
            </Txt>
          </Pressable>
          <Txt style={{ fontSize: 12, fontWeight: '500', color: c.ink3, textAlign: 'center' }}>
            {progress.published
              ? 'Итоги можно менять до публикации годовой оценки'
              : progress.allFilled
                ? `Все итоги выставлены (${progress.filled} из ${progress.total})`
                : `Выставьте итоговые оценки всем ученикам (${progress.filled} из ${progress.total})`}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
