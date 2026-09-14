import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Card, ConfirmDialog, FilledButton, PickerSheet, Pill, StateView } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useKeyCard, useKeyCommands } from '@shared/hooks/useKeys';
import { KeyActionsSheet, KeysHero } from './KeyParts';
import { actionMeta, eventEmployee, formatKeyDate, problemLabel, PROBLEM_OPTIONS } from './keyModel';

function DetailRow({ label, children, last = false }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 16, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <Txt style={{ width: 100, fontSize: 12, color: c.inkMuted }}>{label}</Txt>
      <Txt style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.ink }}>{children || '—'}</Txt>
    </View>
  );
}

export function KeyDetailScreen({ nav, payload }) {
  const { c } = useTheme();
  const unitId = payload?.unitId;
  const group = payload?.group;
  const card = useKeyCard(unitId);
  const commands = useKeyCommands();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [success, setSuccess] = useState(payload?.success || null);
  const unit = card.card?.unit;

  async function finish(result, message) {
    if (!result) {
      await card.reload(true);
      return;
    }
    setSuccess(message);
    await card.reload(true);
  }

  const actions = [];
  if (unit) {
    if (unit.state === 'ISSUED') {
      actions.push({ label: 'Принять на пост', icon: 'inbox', onPress: async () => finish(await commands.returnKeys([unit.id]), 'Ключ принят на пост') });
      if (!unit.problem) actions.push({ label: 'Передать сотруднику', icon: 'users', onPress: () => nav?.('key-recipient', { mode: 'transfer', unitIds: [unit.id], excludeAccountId: unit.holder?.accountId }) });
    } else {
      if (unit.issuable) actions.push({ label: 'Выдать сотруднику', icon: 'users', onPress: () => nav?.('key-recipient', { mode: 'issue', unitIds: [unit.id] }) });
      actions.push({ label: 'Редактировать объект', icon: 'pencil', onPress: () => nav?.('key-group-form', { group: group || { id: unit.groupId, name: unit.groupName, units: [unit] } }) });
    }
    if (unit.problem) actions.push({ label: 'Снять проблему', icon: 'check', onPress: async () => finish(await commands.resolveProblem(unit.id), 'Проблема снята') });
    else actions.push({ label: 'Отметить проблему', icon: 'alertTriangle', onPress: () => setProblemOpen(true) });
    actions.push({ label: 'Удалить ключ', icon: 'trash', danger: true, onPress: () => setDeleteOpen(true) });
  }

  if (card.loading && !unit) {
    return <Screen><View style={{ paddingTop: 100, alignItems: 'center', gap: 12 }}><ActivityIndicator color={c.blue} /><Txt style={{ color: c.inkMuted }}>Загружаем ключ…</Txt></View></Screen>;
  }
  if (card.error || !unit) {
    return <Screen><KeysHero title="Детали ключа" onBack={() => nav?.back()} /><StateView icon="alertTriangle" tone="error" title="Не удалось загрузить ключ" subtitle={card.error} actionLabel="Повторить" onAction={() => card.reload()} style={{ marginTop: 80 }} /></Screen>;
  }

  const problem = problemLabel(unit.problem);
  return (
    <Screen contentStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}>
      <KeysHero title={unit.groupName || 'Детали ключа'} subtitle={unit.label || `Ключ ${unit.ordinal || ''}`} onBack={() => nav?.back()} />

      {success ? (
        <Pressable onPress={() => setSuccess(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.successSoft }}>
          <Icon name="check" size={19} color={c.success} strokeWidth={2.5} />
          <Txt style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.success }}>{success}</Txt>
          <Icon name="x" size={16} color={c.success} />
        </Pressable>
      ) : null}
      {commands.errorText ? (
        <Pressable onPress={commands.clearError} style={{ padding: 12, borderRadius: 12, backgroundColor: c.redSoft }}>
          <Txt accessibilityRole="alert" style={{ fontSize: 13, color: c.red }}>{commands.errorText}</Txt>
        </Pressable>
      ) : null}

      <Card style={{ borderRadius: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: problem ? c.redSoft : c.blueSoft }}>
            <Icon name="key" size={23} color={problem ? c.red : c.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{unit.label || `Ключ ${unit.ordinal || ''}`}</Txt>
            <Pill color={problem ? 'red' : unit.state === 'ISSUED' ? 'blue' : 'success'}>{problem || (unit.state === 'ISSUED' ? 'Выдан' : 'На посту')}</Pill>
          </View>
        </View>
        <DetailRow label="Объект">{unit.groupName}</DetailRow>
        <DetailRow label="Сотрудник">{unit.holder?.fullName}</DetailRow>
        <DetailRow label="Выдан">{unit.state === 'ISSUED' ? formatKeyDate(unit.issuedAt) : null}</DetailRow>
        <DetailRow label="Примечание" last>{unit.note}</DetailRow>
      </Card>

      {(card.card?.history ?? []).length ? (
        <Card style={{ borderRadius: 14 }}>
          <Txt style={{ marginBottom: 8, fontSize: 15, fontWeight: '700', color: c.ink }}>Последние события</Txt>
          {(card.card.history ?? []).slice(0, 3).map((event, index) => {
            const meta = actionMeta(event.action);
            return (
              <View key={event.id || index} style={{ paddingVertical: 10, borderBottomWidth: index === Math.min(2, card.card.history.length - 1) ? 0 : 1, borderBottomColor: c.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Pill color={meta.color}>{meta.label}</Pill><Txt style={{ fontSize: 11, color: c.ink3 }}>{formatKeyDate(event.createdAt)}</Txt></View>
                {eventEmployee(event) ? <Txt numberOfLines={1} style={{ marginTop: 5, fontSize: 12, color: c.ink2 }}>{eventEmployee(event)}</Txt> : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      <FilledButton disabled={commands.busy} onPress={() => setActionsOpen(true)}>Действия</FilledButton>

      <KeyActionsSheet visible={actionsOpen} actions={actions} onClose={() => setActionsOpen(false)} />
      <PickerSheet
        visible={problemOpen}
        title="Что случилось с ключом?"
        options={PROBLEM_OPTIONS}
        value={null}
        onClose={() => setProblemOpen(false)}
        onSelect={async (type) => {
          setProblemOpen(false);
          await finish(await commands.setProblem(unit.id, type), 'Проблема отмечена');
        }}
      />
      <ConfirmDialog
        visible={deleteOpen}
        title="Удалить ключ?"
        message={unit.state === 'ISSUED' ? 'Ключ сейчас у сотрудника. Удаление закроет выдачу и сохранит событие в истории.' : 'Ключ исчезнет из текущего списка, но его история сохранится.'}
        confirmLabel="Удалить"
        confirmTone="danger"
        busy={commands.busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          const deleted = await commands.deleteUnit(unit.id, unit.state === 'ISSUED');
          if (deleted !== null) {
            setDeleteOpen(false);
            nav?.tabs(unit.state === 'ISSUED' ? 'keys-issued' : 'keys-on-post');
          }
        }}
      />
    </Screen>
  );
}
