import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { PrimaryButton } from '@shared/components/ui';
import Icon from '@shared/components/Icon';
import { daysInPeriod } from './model';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromIsoDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function monthName(value) {
  return fromIsoDate(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).replace(/^\d+\s*/, '');
}

function calendarPeriodLabel(from, to) {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  if (from === to) return `${fromDay} ${monthName(from)} ${fromYear}`;
  if (fromYear === toYear && fromMonth === toMonth) return `${fromDay}–${toDay} ${monthName(to)} ${toYear}`;
  if (fromYear === toYear) return `${fromDay} ${monthName(from)} – ${toDay} ${monthName(to)} ${toYear}`;
  return `${fromDay} ${monthName(from)} ${fromYear} – ${toDay} ${monthName(to)} ${toYear}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function occupiedDate(date, ranges) {
  return ranges.some((range) => date >= range.from && date <= range.to);
}

function pluralDays(days) {
  if (days % 10 === 1 && days % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) return 'дня';
  return 'дней';
}

export function TeacherRequestCalendarModal({ visible, from = '', to = '', occupiedRanges = [], onClose, onSelect }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const today = toIsoDate(new Date());
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMonth(startOfMonth(from ? fromIsoDate(from) : new Date()));
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to, visible]);

  const calendarDays = useMemo(() => {
    const offset = (startOfMonth(month).getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array(offset).fill(null),
      ...Array.from({ length: total }, (_, index) => index + 1),
    ];
  }, [month]);

  const monthLabel = month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const earliestMonth = startOfMonth(new Date());
  const canGoBack = month > earliestMonth;
  const selectionComplete = Boolean(draftFrom && draftTo);
  const selectedDays = selectionComplete ? daysInPeriod(draftFrom, draftTo) : 0;
  const monthTitle = monthLabel.charAt(0).toLocaleUpperCase('ru-RU') + monthLabel.slice(1);

  const selectDate = (date) => {
    if (date < today || occupiedDate(date, occupiedRanges)) return;

    if (!draftFrom || draftTo || date < draftFrom) {
      setDraftFrom(date);
      setDraftTo('');
      return;
    }

    if (date === draftFrom) {
      setDraftTo(date);
      return;
    }

    const overlapsBusyDate = occupiedRanges.some((range) => range.from <= date && range.to >= draftFrom);
    if (overlapsBusyDate) return;
    setDraftTo(date);
  };

  const rangeText = selectionComplete
    ? `${calendarPeriodLabel(draftFrom, draftTo)} · ${selectedDays} ${pluralDays(selectedDays)}`
    : draftFrom
      ? `Начало: ${calendarPeriodLabel(draftFrom, draftFrom)}. Выберите конец периода.`
      : 'Выберите даты отсутствия';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Предыдущий месяц"
              disabled={!canGoBack}
              onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: canGoBack ? 1 : 0.35 }}
            >
              <Icon name="chevronLeft" size={22} color={c.ink2} />
            </Pressable>
            <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink, textTransform: 'capitalize' }}>{monthTitle}</Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Следующий месяц"
              onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="chevronRight" size={22} color={c.ink2} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 18, marginBottom: 10 }}>
            {WEEKDAYS.map((day) => (
              <Txt key={day} style={{ flex: 1, textAlign: 'center', color: c.ink3, fontSize: 13, fontWeight: '600' }}>{day}</Txt>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((day, index) => {
              const date = day ? toIsoDate(new Date(month.getFullYear(), month.getMonth(), day)) : '';
              const past = Boolean(day && date < today);
              const occupied = Boolean(day && occupiedDate(date, occupiedRanges));
              const selected = Boolean(day && (date === draftFrom || date === draftTo));
              const inRange = Boolean(day && selectionComplete && date > draftFrom && date < draftTo);
              const isToday = day && date === today;
              const disabled = !day || past || occupied;

              return (
                <Pressable
                  key={`${index}-${day || 'blank'}`}
                  accessibilityRole={day ? 'button' : undefined}
                  accessibilityLabel={day ? `${day} ${monthTitle}${occupied ? ', занято' : past ? ', прошедшая дата' : ''}` : undefined}
                  accessibilityState={day ? { disabled, selected } : undefined}
                  disabled={disabled}
                  onPress={() => selectDate(date)}
                  style={{
                    width: `${100 / 7}%`,
                    height: 54,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: inRange ? c.blueSoft : 'transparent',
                    borderTopLeftRadius: date === draftFrom ? 12 : 0,
                    borderBottomLeftRadius: date === draftFrom ? 12 : 0,
                    borderTopRightRadius: date === draftTo ? 12 : 0,
                    borderBottomRightRadius: date === draftTo ? 12 : 0,
                  }}
                >
                  {day ? (
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? c.blue : occupied ? c.bg2 : 'transparent',
                    }}>
                      <Txt style={{ color: selected ? c.surface : past || occupied ? c.ink3 : c.ink, fontSize: 16, fontWeight: selected ? '700' : '500' }}>{day}</Txt>
                      {isToday || occupied ? (
                        <View style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: occupied ? c.ink3 : c.green }} />
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginTop: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.green }} />
              <Txt style={{ color: c.ink3, fontSize: 13 }}>Сегодня</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: c.bg2 }} />
              <Txt style={{ color: c.ink3, fontSize: 13 }}>Занято другой заявкой</Txt>
            </View>
          </View>
          <Txt style={{ marginTop: 16, color: c.ink3, fontSize: 13, lineHeight: 19 }}>
            Чтобы выбрать один день, нажмите на него дважды.
          </Txt>
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.border }}>
          <Txt style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.ink }}>{rangeText}</Txt>
          <PrimaryButton full={false} style={{ minWidth: 104, paddingHorizontal: 20 }} onPress={() => { if (selectionComplete) onSelect(draftFrom, draftTo); onClose(); }}>Готово</PrimaryButton>
        </View>
      </View>
    </Modal>
  );
}
