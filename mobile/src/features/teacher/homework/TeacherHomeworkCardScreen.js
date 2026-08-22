import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  Banner,
  Card,
  ConfirmDialog,
  FilledButton,
  OutlineButton,
  Pill,
  ScreenHeader,
  StateView,
} from '@shared/components/ui';
import { dueLong, homeworkStatusChip, subjectLine } from '@shared/api/homeworkMap';
import {
  homeworkActions,
  useHomeworkActions,
  useTeacherHomeworkCard,
} from '@shared/hooks/useTeacherHomework';
import { pickFiles } from '@features/homework/attachments';
import { HomeworkCardSkeleton } from '@features/homework/HomeworkStates';
import { RosterRow, ROSTER_FILTERS, filterRoster, rosterCount } from './roster';

/**
 * Карточка задания у учителя (ТЗ HOMEWORK-001 §5, 004 §4, 005.1 §5).
 *
 * Одна карточка на все состояния: задание, материалы и список работ в них одинаковы, а
 * различается только набор действий — и он выводится из статуса, а не из места, откуда
 * пришли. Отказ сервера остаётся последним словом: экран лишь не предлагает заведомо
 * недопустимое.
 *
 * Получатели живут здесь же, а не на отдельной вкладке: для учителя «задание» и «кто что
 * сдал» — один вопрос, а не два.
 */
export function TeacherHomeworkCardScreen({ nav, payload }) {
  const homeworkId = payload?.homeworkId;
  const { c } = useTheme();
  const { loading, error, homework, materials, roster, reload } = useTeacherHomeworkCard(homeworkId);

  const [filter, setFilter] = useState('ALL');
  const [confirm, setConfirm] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const onDone = useCallback(async (action, result) => {
    setConfirm(null);
    if (action === 'remove') {
      nav.back();
      return;
    }
    // Копия — отдельное задание, и смотреть после копирования нужно на неё, а не на
    // оригинал: дополнять и публиковать учитель будет именно копию.
    if (action === 'copy' && result?.id) {
      nav('homework-card', { homeworkId: result.id });
      return;
    }
    await reload(true);
  }, [nav, reload]);

  const actions = useHomeworkActions(homeworkId, { onDone });
  const can = homeworkActions(homework);

  // Возврат с правки или с проверки работы: и то и другое меняет то, что здесь показано.
  // Первый показ пропускается — экран только что загрузился сам.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) reload(true);
      else focusedBefore.current = true;
    }, [reload]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  }, [reload]);

  const students = useMemo(() => filterRoster(roster?.students ?? [], filter), [roster, filter]);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Домашнее задание" back={nav.back} />
        <HomeworkCardSkeleton />
      </Screen>
    );
  }

  if (error || !homework) {
    return (
      <Screen>
        <ScreenHeader title="Домашнее задание" back={nav.back} />
        <StateView
          style={{ marginTop: 96 }}
          icon={error === 'forbidden' || error === 'missing' ? 'lock' : 'alertTriangle'}
          tone={error === 'load' ? 'error' : 'default'}
          title={error === 'load' ? 'Не удалось загрузить' : 'Задание недоступно'}
          subtitle={
            error === 'load'
              ? 'Проверьте подключение к интернету'
              : 'Оно удалено или относится к урокам другого учителя'
          }
          actionLabel={error === 'load' ? 'Повторить' : 'К списку'}
          onAction={error === 'load' ? () => reload() : nav.back}
        />
      </Screen>
    );
  }

  const chip = homeworkStatusChip(homework);

  return (
    <Screen scroll={false}>
      <ScreenHeader
        title="Домашнее задание"
        back={nav.back}
        right={
          can.edit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Редактировать задание"
              onPress={() => nav('homework-create', { homeworkId })}
              hitSlop={8}
            >
              <Icon name="pencil" size={20} color={c.ink} />
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.ink3} />}
      >
        {actions.error ? (
          <Banner icon="alertTriangle" tone="soft">{actions.error}</Banner>
        ) : null}

        <Card elevated style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Txt style={{ fontSize: 13, fontWeight: '500', color: c.inkMuted, flex: 1 }} numberOfLines={1}>
              {subjectLine(homework)}
            </Txt>
            {chip ? <Pill color={chip.color}>{chip.label}</Pill> : null}
          </View>

          <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>{homework.title}</Txt>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="clock" size={14} color={c.ink3} />
            <Txt style={{ fontSize: 13, fontWeight: '500', color: c.inkMuted }}>
              {dueTeacherLabel(homework)}
            </Txt>
          </View>

          {homework.description ? (
            <Txt style={{ fontSize: 14, lineHeight: 21, color: c.ink }}>{homework.description}</Txt>
          ) : (
            <Txt style={{ fontSize: 14, color: c.ink3 }}>Описание не заполнено</Txt>
          )}

          {homework.updatedAfterPublish ? (
            <Banner icon="alertTriangle" tone="soft">
              Задание изменено после публикации — ученики видят новое условие
            </Banner>
          ) : null}
        </Card>

        <MaterialsCard
          materials={materials}
          canEdit={can.edit}
          busy={actions.busy === 'material'}
          onAdd={async () => {
            const picked = await pickFiles();
            for (const file of picked) await actions.addMaterial(file);
          }}
          onRemove={(materialId) => actions.deleteMaterial(materialId)}
        />

        {homework.status === 'DRAFT' ? (
          <Card elevated style={{ gap: 8 }}>
            <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Черновик</Txt>
            <Txt style={{ fontSize: 13, color: c.inkMuted, lineHeight: 19 }}>
              Ученики его не видят. Получатели фиксируются в момент публикации — до неё
              списка работ ещё нет.
            </Txt>
          </Card>
        ) : (
          <RosterCard
            roster={roster}
            students={students}
            filter={filter}
            onFilter={setFilter}
            canReview={can.review}
            onOpen={(student) =>
              nav('homework-submission', {
                homeworkId,
                studentProfileId: student.studentProfileId,
                studentName: student.fullName,
              })
            }
          />
        )}

        <ActionsCard can={can} busy={actions.busy} onAct={setConfirm} />
      </ScrollView>

      <ConfirmDialog
        visible={confirm != null}
        title={CONFIRMS[confirm]?.title}
        message={CONFIRMS[confirm]?.message}
        confirmLabel={CONFIRMS[confirm]?.confirm}
        busy={actions.busy != null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && actions[confirm]?.()}
      />
    </Screen>
  );
}

/**
 * Подпись срока у учителя. «Без срока» и «до следующего урока» — полноправные варианты,
 * а не отсутствие даты: у второго момент подставляет публикация, и до неё числа нет.
 */
function dueTeacherLabel(homework) {
  if (homework?.dueType === 'NEXT_LESSON' && !homework?.dueAt) return 'До следующего урока';
  if (homework?.dueType === 'NEXT_LESSON') return `${dueLong(homework)} (следующий урок)`;
  return dueLong(homework);
}

const CONFIRMS = {
  publish: {
    title: 'Опубликовать задание?',
    message: 'Ученики увидят его сразу, а состав получателей зафиксируется.',
    confirm: 'Опубликовать',
  },
  complete: {
    title: 'Завершить задание?',
    message: 'Оно уйдёт в историю. Отправлять работы будет нельзя, проверять — можно.',
    confirm: 'Завершить',
  },
  reopen: {
    title: 'Открыть повторно?',
    message: 'Задание вернётся в актуальные, ученики снова смогут отправлять работы.',
    confirm: 'Открыть',
  },
  cancel: {
    title: 'Отменить задание?',
    message: 'Ученики увидят, что задание отменено. Отправленные работы сохранятся.',
    confirm: 'Отменить задание',
  },
  copy: {
    title: 'Сделать копию?',
    message: 'Появится новый черновик с тем же условием и материалами. Ответы учеников не копируются.',
    confirm: 'Скопировать',
  },
  remove: {
    title: 'Удалить черновик?',
    message: 'Черновик исчезнет безвозвратно. Опубликованные задания так не удаляются.',
    confirm: 'Удалить',
  },
};

function ActionsCard({ can, busy, onAct }) {
  const buttons = [
    can.publish && { key: 'publish', label: 'Опубликовать', kind: 'primary' },
    can.complete && { key: 'complete', label: 'Завершить', kind: 'outline' },
    can.reopen && { key: 'reopen', label: 'Открыть повторно', kind: 'primary' },
    // Копия доступна в любом состоянии: с завершённого задания её как раз и делают,
    // чтобы выдать то же самое следующему классу (001 §11).
    { key: 'copy', label: 'Сделать копию', kind: 'outline' },
    can.cancel && { key: 'cancel', label: 'Отменить задание', kind: 'outline' },
    can.remove && { key: 'remove', label: 'Удалить черновик', kind: 'outline' },
  ].filter(Boolean);

  if (buttons.length === 0) return null;

  return (
    <Card elevated style={{ gap: 10 }}>
      {buttons.map((button) =>
        button.kind === 'primary' ? (
          <FilledButton
            key={button.key}
            disabled={busy != null}
            onPress={() => onAct(button.key)}
          >
            {busy === button.key ? 'Сохраняем…' : button.label}
          </FilledButton>
        ) : (
          <OutlineButton
            key={button.key}
            size="lg"
            disabled={busy != null}
            onPress={() => onAct(button.key)}
          >
            {busy === button.key ? 'Сохраняем…' : button.label}
          </OutlineButton>
        ),
      )}
    </Card>
  );
}

function MaterialsCard({ materials, canEdit, busy, onAdd, onRemove }) {
  const { c } = useTheme();
  if (!canEdit && materials.length === 0) return null;

  return (
    <Card elevated style={{ gap: 10 }}>
      <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Материалы учителя</Txt>

      {materials.length === 0 ? (
        <Txt style={{ fontSize: 13, color: c.ink3 }}>Файлов пока нет</Txt>
      ) : (
        materials.map((material) => (
          <View
            key={material.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Icon name="paperclip" size={14} color={c.ink3} />
            <Txt style={{ flex: 1, fontSize: 13, color: c.ink }} numberOfLines={1}>
              {material.fileName || material.url}
            </Txt>
            {canEdit ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Удалить ${material.fileName || 'материал'}`}
                disabled={busy}
                onPress={() => onRemove(material.id)}
                hitSlop={8}
              >
                <Icon name="x" size={16} color={c.ink3} />
              </Pressable>
            ) : null}
          </View>
        ))
      )}

      {canEdit ? (
        <OutlineButton disabled={busy} onPress={onAdd}>
          {busy ? 'Загружаем…' : 'Прикрепить файл'}
        </OutlineButton>
      ) : null}
    </Card>
  );
}

/**
 * Работы учеников. Фильтр отбирает уже пришедший ростер — это полный состав получателей,
 * а не страница, поэтому отбор на клиенте ничего не скрывает за пределами ответа.
 */
function RosterCard({ roster, students, filter, onFilter, canReview, onOpen }) {
  const { c } = useTheme();

  return (
    <Card elevated padded={false} style={{ paddingVertical: 12, gap: 10 }}>
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>Работы учеников</Txt>
        <Txt style={{ fontSize: 13, fontWeight: '600', color: c.inkMuted }}>
          {roster ? `${roster.submitted ?? 0} / ${roster.total ?? 0}` : '—'}
        </Txt>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {ROSTER_FILTERS.map((item) => {
          const selected = item.value === filter;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onFilter(item.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: selected ? c.ink : c.bg2,
              }}
            >
              <Txt style={{ fontSize: 13, fontWeight: '600', color: selected ? c.surface : c.inkMuted }}>
                {item.label} · {rosterCount(roster, item.value)}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {students.length === 0 ? (
        <Txt style={{ paddingHorizontal: 16, fontSize: 13, color: c.ink3 }}>
          {roster?.total
            ? 'Под этот фильтр не подходит ни один ученик'
            : 'Получателей нет — состав зафиксирован пустым'}
        </Txt>
      ) : (
        students.map((student) => (
          <RosterRow
            key={student.studentProfileId}
            student={student}
            onPress={canReview ? () => onOpen(student) : undefined}
          />
        ))
      )}

      {roster == null ? (
        <Txt style={{ paddingHorizontal: 16, fontSize: 13, color: c.ink3 }}>
          Список работ не загрузился — потяните экран, чтобы обновить
        </Txt>
      ) : null}
    </Card>
  );
}
