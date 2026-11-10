import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from './Txt';
import { Card, PrimaryButton } from './ui';
import Icon from './Icon';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DatePickerModal({ visible, value, onSelect, onClose, title = 'Выберите дату', occupiedRanges = [] }) {
  const { c } = useTheme();
  const [month, setMonth] = useState(() => {
    const initial = value ? new Date(`${value}T12:00:00`) : new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  useEffect(() => {
    if (!visible) return;
    const initial = value ? new Date(`${value}T12:00:00`) : new Date();
    setMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
  }, [value, visible]);
  const days = useMemo(() => {
    const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: total }, (_, index) => index + 1)];
  }, [month]);
  const label = month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: c.modalBackdrop }}>
        <Card style={{ gap: 16, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt style={{ fontSize: 18, fontWeight: '700' }}>{title}</Txt>
            <Pressable onPress={onClose} accessibilityLabel="Закрыть календарь"><Icon name="x" size={20} color={c.ink2} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={{ padding: 8 }}><Icon name="chevronLeft" size={18} color={c.ink} /></Pressable>
            <Txt style={{ textTransform: 'capitalize', fontSize: 15, fontWeight: '700' }}>{label}</Txt>
            <Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={{ padding: 8 }}><Icon name="chevronRight" size={18} color={c.ink} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>{WEEKDAYS.map((day) => <Txt key={day} style={{ flex: 1, textAlign: 'center', color: c.ink3, fontSize: 12 }}>{day}</Txt>)}</View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{days.map((day, index) => {
            const iso = day ? isoDate(new Date(month.getFullYear(), month.getMonth(), day)) : '';
            const selected = iso === value;
            const occupied = day && occupiedRanges.some((range) => iso >= range.from && iso <= range.to);
            return <Pressable key={`${index}-${day || 'blank'}`} disabled={!day || occupied} onPress={() => { onSelect(iso); onClose(); }} style={{ width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' }}>
              {day ? <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? c.blue : 'transparent', opacity: occupied ? 0.3 : 1 }}><Txt style={{ color: selected ? c.surface : c.ink, fontWeight: selected ? '700' : '500', textDecorationLine: occupied ? 'line-through' : 'none' }}>{day}</Txt></View> : null}
            </Pressable>;
          })}</View>
          {occupiedRanges.length ? <Txt style={{ color: c.ink3, fontSize: 12 }}>Зачёркнутые даты заняты другой заявкой.</Txt> : null}
          <PrimaryButton color="ghost" onPress={onClose}>Закрыть</PrimaryButton>
        </Card>
      </View>
    </Modal>
  );
}
