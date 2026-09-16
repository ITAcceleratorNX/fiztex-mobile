import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Card, ConfirmDialog, FilledButton, PickerSheet, Pill, StateView } from '@shared/components/ui';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useEquipmentCommands, useEquipmentUnit } from '@shared/hooks/useEquipment';
import { EquipmentActionsSheet, EquipmentHero } from './EquipmentParts';
import {
  actionMeta,
  conflictHolder,
  eventEmployee,
  formatEquipmentDate,
  problemLabel,
  PROBLEM_OPTIONS,
  stateMeta,
  unitActions,
} from './equipmentModel';

function DetailRow({ label, children, last = false }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 16, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <Txt style={{ width: 110, fontSize: 12, color: c.inkMuted }}>{label}</Txt>
      <Txt style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.ink }}>{children || '—'}</Txt>
    </View>
  );
}

/**
 * Карточка экземпляра — единственное место, где над ним совершают действия (ТЗ §9).
 *
 * <p>Что можно сделать, решает сервер: `unitActions` раскладывает по кнопкам готовые
 * `issuable` и `transferable`, а не собирает условие заново. Списание выданного
 * подтверждается именем держателя, и если вещь выдали в другой сессии, сервер отвечает
 * отказом с новым держателем — диалог переспрашивает (§11).
 */
export function EquipmentDetailScreen({ nav, payload }) {
  const { c } = useTheme();
  const unitId = payload?.unitId;
  const card = useEquipmentUnit(unitId);
  const commands = useEquipmentCommands();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [writeOffHolder, setWriteOffHolder] = useState(null);
  const [success, setSuccess] = useState(payload?.success || null);
  const unit = card.card?.unit;

  async function finish(result, message) {
    if (result) setSuccess(message);
    await card.reload(true);
  }

  async function confirmWriteOff() {
    const result = await commands.writeOff(unit.id, {
      // Подтверждаем ровно то, что видно на карточке: иначе экран закрыл бы чужую выдачу
      // молча (§11).
      confirmIssued: unit.state === 'ISSUED' || writeOffHolder != null,
    });
    if (result) {
      setWriteOffOpen(false);
      setWriteOffHolder(null);
      nav?.tabs('equipment-stock', { success: 'Экземпляр списан' });
      return;
    }
    const holder = conflictHolder(commands.error);
    if (holder) {
      setWriteOffHolder(holder);
      await card.reload(true);
      return;
    }
    setWriteOffOpen(false);
  }

  async function runAction(key) {
    if (key === 'return') {
      await finish(await commands.returnUnits([unit.id]), 'Экземпляр принят обратно');
    } else if (key === 'issue') {
      nav?.('equipment-recipient', { mode: 'issue', unitIds: [unit.id] });
    } else if (key === 'transfer') {
      nav?.('equipment-recipient', {
        mode: 'transfer', unitIds: [unit.id], excludeAccountId: unit.holder?.accountId,
      });
    } else if (key === 'edit') {
      nav?.('equipment-form', { unit });
    } else if (key === 'set-problem') {
      setProblemOpen(true);
    } else if (key === 'resolve-problem') {
      await finish(await commands.resolveProblem(unit.id), 'Проблема снята');
    } else if (key === 'write-off') {
      setWriteOffOpen(true);
    }
  }

  if (card.loading && !unit) {
    return (
      <Screen>
        <View style={{ paddingTop: 100, alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={c.blue} />
          <Txt style={{ color: c.inkMuted }}>Загружаем экземпляр…</Txt>
        </View>
      </Screen>
    );
  }
  if (card.error || !unit) {
    return (
      <Screen>
        <EquipmentHero title="Экземпляр" onBack={() => nav?.back()} />
        <StateView
          icon="alertTriangle"
          tone="error"
          title="Не удалось загрузить экземпляр"
          subtitle={card.error}
          actionLabel="Повторить"
          onAction={() => card.reload()}
          style={{ marginTop: 80 }}
        />
      </Screen>
    );
  }

  const problem = problemLabel(unit.problem);
  const state = stateMeta(unit.state);
  const actions = unitActions(unit);
  const history = card.card?.history ?? [];

  return (
    <Screen contentStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}>
      <EquipmentHero title={unit.itemName || 'Экземпляр'} subtitle={`Инв. № ${unit.inventoryNumber || '—'}`} onBack={() => nav?.back()} />

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
            <Icon name="laptop" size={23} color={problem ? c.red : c.blue} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{unit.inventoryNumber || 'Без номера'}</Txt>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pill color={state.color}>{state.label}</Pill>
              {problem ? <Pill color="red">{problem}</Pill> : null}
            </View>
          </View>
        </View>
        <DetailRow label="Позиция">{unit.itemName}</DetailRow>
        <DetailRow label="Серийный номер">{unit.serialNumber}</DetailRow>
        <DetailRow label="У кого">{unit.state === 'ISSUED' ? unit.holder?.fullName : null}</DetailRow>
        <DetailRow label="Выдано">{unit.state === 'ISSUED' ? formatEquipmentDate(unit.issuedAt) : null}</DetailRow>
        <DetailRow label="Комментарий">{unit.issueComment}</DetailRow>
        <DetailRow label="Примечание" last>{unit.note}</DetailRow>
      </Card>

      {history.length ? (
        <Card style={{ borderRadius: 14 }}>
          <Txt style={{ marginBottom: 8, fontSize: 15, fontWeight: '700', color: c.ink }}>Последние события</Txt>
          {history.slice(0, 3).map((event, index) => {
            const meta = actionMeta(event.action);
            return (
              <View key={event.id || index} style={{ paddingVertical: 10, borderBottomWidth: index === Math.min(2, history.length - 1) ? 0 : 1, borderBottomColor: c.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Pill color={meta.color}>{meta.label}</Pill>
                  <Txt style={{ fontSize: 11, color: c.ink3 }}>{formatEquipmentDate(event.createdAt)}</Txt>
                </View>
                {eventEmployee(event) ? (
                  <Txt numberOfLines={1} style={{ marginTop: 5, fontSize: 12, color: c.ink2 }}>{eventEmployee(event)}</Txt>
                ) : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {actions.length ? (
        <FilledButton disabled={commands.busy} onPress={() => setActionsOpen(true)}>Действия</FilledButton>
      ) : (
        <Txt style={{ fontSize: 13, color: c.inkMuted, textAlign: 'center' }}>
          Экземпляр списан {formatEquipmentDate(unit.writtenOffAt)} — остаётся только история.
        </Txt>
      )}

      <EquipmentActionsSheet
        visible={actionsOpen}
        actions={actions}
        onClose={() => setActionsOpen(false)}
        onSelect={runAction}
      />
      <PickerSheet
        visible={problemOpen}
        title="Что случилось с техникой?"
        options={PROBLEM_OPTIONS}
        value={unit.problem?.type ?? null}
        onClose={() => setProblemOpen(false)}
        onSelect={async (type) => {
          setProblemOpen(false);
          await finish(await commands.setProblem(unit.id, type), 'Проблема отмечена');
        }}
      />
      <ConfirmDialog
        visible={writeOffOpen}
        title="Списать экземпляр?"
        message={
          writeOffHolder
            ? `Экземпляр уже числится за сотрудником ${writeOffHolder} — его выдали, пока карточка была открыта. Списание закроет выдачу.`
            : unit.state === 'ISSUED'
              ? `Экземпляр числится за сотрудником ${unit.holder?.fullName || ''}. Списание закроет выдачу и сохранит событие в истории.`
              : 'Экземпляр исчезнет из рабочих списков и больше не будет выдаваться. История сохранится.'
        }
        confirmLabel="Списать"
        confirmTone="danger"
        busy={commands.busy}
        onCancel={() => { setWriteOffOpen(false); setWriteOffHolder(null); }}
        onConfirm={confirmWriteOff}
      />
    </Screen>
  );
}
