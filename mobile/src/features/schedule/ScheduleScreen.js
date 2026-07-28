import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen, shadowSm } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Avatar } from '@shared/components/ui';
import { FiztexMark } from '@shared/components/Hex';
import { LessonRow } from '@shared/ui/rows';
import {
  shortName,
  useMySchedule,
  useChildSchedule,
  useParentChildren,
  weekDayChips,
  lessonsForDate,
} from '@shared/hooks/useSchedule';
import { scheduleStatusMessage } from '@shared/api/scheduleMap';

/** Subtle repeating Φ watermark — Figma schedule background. */
function ScheduleWatermark() {
  const { c } = useTheme();
  const marks = Array.from({ length: 48 });
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        opacity: 0.045,
        overflow: 'hidden',
      }}
    >
      {marks.map((_, i) => (
        <View key={i} style={{ width: '25%', height: 110, alignItems: 'center', justifyContent: 'center' }}>
          <FiztexMark size={36} color={c.blue} />
        </View>
      ))}
    </View>
  );
}

function DayChips({ chips, day, onSelect }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 }}>
      {chips.map((d, i) => {
        const on = i === day;
        return (
          <Pressable
            key={d.date}
            onPress={() => onSelect(i)}
            style={{
              flex: 1,
              height: 64,
              borderRadius: 16,
              backgroundColor: on ? c.blue : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt style={{ fontSize: 12, fontWeight: '600', color: on ? '#fff' : '#64748B' }}>{d.label}</Txt>
            <Txt style={{ fontSize: 16, fontWeight: '700', marginTop: 2, color: on ? '#fff' : '#1A1F36' }}>
              {d.dayNum}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScheduleEmpty({ status, message, error }) {
  const { c } = useTheme();
  const copy =
    error ||
    message ||
    scheduleStatusMessage(status) ||
    'На этот день уроков нет';

  const icon =
    status === 'schedule_not_published'
      ? 'bell'
      : status === 'non_working_day' || status === 'calendar_no_lessons'
        ? 'calendar'
        : error
          ? 'x'
          : 'calendar';

  return (
    <View style={{ paddingHorizontal: 32, paddingTop: 72, alignItems: 'center' }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: c.blueSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <Icon name={icon} size={36} color={c.blue} />
      </View>
      <Txt style={{ fontSize: 16, fontWeight: '600', color: c.ink2, textAlign: 'center', lineHeight: 24 }}>
        {copy}
      </Txt>
    </View>
  );
}

function markNextLesson(lessons) {
  const list = lessons.map((l) => ({ ...l }));
  const nowIdx = list.findIndex((l) => l.status === 'now');
  const start = nowIdx >= 0 ? nowIdx + 1 : 0;
  for (let i = start; i < list.length; i += 1) {
    if (list[i].status === 'upcoming') {
      list[i] = { ...list[i], status: 'next' };
      break;
    }
  }
  return list;
}

/**
 * Shared Figma schedule screen for student / parent / teacher.
 * @param {'student'|'parent'|'teacher'} role
 */
export function ScheduleScreen({ nav, role = 'student' }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const isParent = role === 'parent';
  const isTeacher = role === 'teacher';

  const { children, loading: childrenLoading } = useParentChildren(isParent);
  const [childId, setChildId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (isParent && children.length && !childId) setChildId(children[0].id);
  }, [isParent, children, childId]);

  const me = useMySchedule({ week: true });
  const child = useChildSchedule(isParent ? childId : null, { week: true });
  const { loading, error, data, emptyMessage } = isParent ? child : me;

  const chips = useMemo(() => weekDayChips(data), [data]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(0);

  useEffect(() => {
    const idx = chips.findIndex((d) => d.date === todayStr);
    if (idx >= 0) setDay(idx);
  }, [chips, todayStr]);

  const selected = chips[day] || chips[0];
  const rawLessons = lessonsForDate(data, selected?.date);
  const lessons = markNextLesson(rawLessons);
  const selectedChild = children.find((ch) => ch.id === childId);

  const showEmpty = !loading && lessons.length === 0;

  return (
    <Screen scroll contentStyle={{ paddingBottom: insets.bottom + 100 }} style={{ backgroundColor: c.bg }}>
      <ScheduleWatermark />

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Txt style={{ fontSize: 24, fontWeight: '800', color: c.blue, letterSpacing: -0.4 }}>Расписание</Txt>
      </View>

      {isParent ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          {childrenLoading ? (
            <ActivityIndicator color={c.blue} />
          ) : selectedChild ? (
            <Pressable
              onPress={() => (children.length > 1 ? setPickerOpen(true) : null)}
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                ...shadowSm,
                shadowOpacity: 0.05,
              }}
            >
              <Avatar name={selectedChild.fullName} size={28} color="blue" />
              <Txt style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>
                {shortName(selectedChild.fullName)}
                {selectedChild.fullName.split(/\s+/).length > 1
                  ? ` ${selectedChild.fullName.split(/\s+/)[0][0]}.`
                  : ''}
                {selectedChild.className ? ` · ${selectedChild.className}` : ''}
              </Txt>
              {children.length > 1 ? <Icon name="chevronDown" size={16} color={c.ink3} /> : null}
            </Pressable>
          ) : (
            <Txt style={{ color: c.ink3, fontSize: 14 }}>Нет связанных детей</Txt>
          )}
        </View>
      ) : null}

      <DayChips chips={chips} day={day} onSelect={setDay} />

      {loading ? (
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={c.blue} />
        </View>
      ) : showEmpty ? (
        <ScheduleEmpty status={data?.status} message={emptyMessage} error={error} />
      ) : (
        <View style={{ gap: 10, paddingHorizontal: 16 }}>
          {lessons.map((l, i) => (
            <LessonRow
              key={l.lessonId || i}
              lesson={l}
              showClassBadge={isTeacher}
              onPress={() => nav?.('lesson', l)}
            />
          ))}
        </View>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' }}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: insets.bottom + 16,
              maxHeight: '55%',
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} />
            </View>
            <Txt style={{ fontSize: 17, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 }}>
              Выберите ребёнка
            </Txt>
            <FlatList
              data={children}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const on = item.id === childId;
                return (
                  <Pressable
                    onPress={() => {
                      setChildId(item.id);
                      setPickerOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: on ? c.blueSoft : 'transparent',
                    }}
                  >
                    <Avatar name={item.fullName} size={40} color="blue" />
                    <View style={{ flex: 1 }}>
                      <Txt style={{ fontSize: 15, fontWeight: '700' }}>{item.fullName}</Txt>
                      <Txt style={{ fontSize: 13, color: c.ink3, marginTop: 2 }}>
                        {item.className || 'Класс не назначен'}
                      </Txt>
                    </View>
                    {on ? <Icon name="check" size={18} color={c.blue} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
