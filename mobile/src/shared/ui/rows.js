import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { Card, Pill, Avatar } from '@shared/components/ui';
import { HexBadge } from '@shared/components/Hex';
import Icon from '@shared/components/Icon';
import { SUBJECT_COLORS } from '@shared/data/mock';
import { shadowSm } from '@shared/components/Screen';

// Resolve a brand colour-name to a theme hex (falls back to muted ink).
export function brandColor(c, name) {
  return {
    green: c.green,
    greenDeep: c.greenDeep,
    blue: c.blue,
    blueDeep: c.blueDeep,
    red: c.red,
    redDeep: c.redDeep,
    gold: c.gold,
    goldDeep: c.goldDeep,
  }[name] || c.ink3;
}

export function softColor(c, name) {
  return { green: c.greenSoft, blue: c.blueSoft, red: c.redSoft, gold: c.goldSoft }[name] || c.bg2;
}

/**
 * Figma schedule lesson card:
 * time | accent stripe | subject+meta | status badge
 * done = muted; now = orange stripe + outline pill; next = navy stripe + outline pill
 */
export function LessonRow({ lesson, onPress, showClassBadge = false }) {
  const { c } = useTheme();
  const status = lesson.status || 'upcoming';
  const muted = status === 'done';

  const stripe =
    status === 'now' ? c.green : status === 'next' ? c.blue : muted ? '#D1D5DB' : '#D1D5DB';

  const ink = muted ? '#94A3B8' : c.ink;
  const ink2 = muted ? '#CBD5E1' : c.ink2;

  let badge = null;
  if (status === 'now') {
    badge = (
      <View
        style={{
          paddingVertical: 5,
          paddingHorizontal: 10,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: c.green,
        }}
      >
        <Txt style={{ fontSize: 12, fontWeight: '700', color: c.green }}>Сейчас</Txt>
      </View>
    );
  } else if (status === 'next') {
    badge = (
      <View
        style={{
          paddingVertical: 5,
          paddingHorizontal: 10,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: c.blue,
        }}
      >
        <Txt style={{ fontSize: 12, fontWeight: '700', color: c.blue }}>Следующий</Txt>
      </View>
    );
  }

  const metaParts = [];
  if (lesson.teacher) metaParts.push(lesson.teacher);
  if (lesson.room && lesson.room !== '—') metaParts.push(lesson.room);
  if (lesson.subgroupName) metaParts.push(lesson.subgroupName);
  const meta = metaParts.join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: c.surface,
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.92 : 1,
          ...shadowSm,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        },
      ]}
    >
      <View style={{ minWidth: 52 }}>
        <Txt style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: ink }}>{lesson.time}</Txt>
        <Txt style={{ fontSize: 12, color: ink2, marginTop: 2 }}>{lesson.end}</Txt>
      </View>

      <View style={{ width: 4, height: 38, borderRadius: 2, backgroundColor: stripe }} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 15, fontWeight: '700', color: ink }} numberOfLines={1}>
          {lesson.subject}
        </Txt>
        {meta ? (
          <Txt style={{ fontSize: 12, color: ink2, marginTop: 3 }} numberOfLines={1}>
            {meta}
          </Txt>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {showClassBadge && lesson.className ? (
          <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: c.bg2 }}>
            <Txt style={{ fontSize: 11, fontWeight: '700', color: c.ink2 }}>{lesson.className}</Txt>
          </View>
        ) : null}
        {badge}
      </View>
    </Pressable>
  );
}

export function SubjectRow({ subject, onPress }) {
  const { c } = useTheme();
  const subInfo = SUBJECT_COLORS[subject.name] || { color: 'gray' };
  return (
    <Card onPress={onPress} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <HexBadge size={44} fill={brandColor(c, subInfo.color)}>
        <Txt style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>{subject.avg}</Txt>
      </HexBadge>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 15, fontWeight: '600' }}>{subject.name}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {subject.last.map((g, i) => (
            <View
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: g === 5 ? c.greenSoft : g === 4 ? c.goldSoft : c.redSoft,
              }}
            >
              <Txt style={{ fontSize: 11, fontWeight: '700', color: g === 5 ? c.green : g === 4 ? c.goldDeep : c.red }}>{g}</Txt>
            </View>
          ))}
        </View>
      </View>
      {subject.hw > 0 ? <Pill color="red">{`${subject.hw} ДЗ`}</Pill> : null}
    </Card>
  );
}

export function ProfileRow({ icon, title, value, last }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.bg2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Icon name={icon} size={16} color={c.ink2} />
      </View>
      <Txt style={{ flex: 1, fontSize: 14, fontWeight: '500' }}>{title}</Txt>
      {value ? <Txt style={{ fontSize: 13, color: c.ink3, fontWeight: '600' }}>{value}</Txt> : <Icon name="chevronRight" size={16} color={c.ink3} />}
    </View>
  );
}

export function QuickAction({ icon, color, label, onPress }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ flex: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <HexBadge size={40} fill={brandColor(c, color)} icon={icon} iconColor="#fff" iconSize={18} />
      <Txt style={{ flex: 1, fontSize: 13, fontWeight: '700' }}>{label}</Txt>
    </Card>
  );
}

export function QRMockup({ size = 180 }) {
  const { c } = useTheme();
  const cells = 11;
  const gap = 2;
  const cell = (size - gap * (cells - 1)) / cells;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {Array.from({ length: cells * cells }).map((_, i) => {
        const on = ((i * 7) % 11) > 4;
        return (
          <View
            key={i}
            style={{
              width: cell,
              height: cell,
              borderRadius: 2,
              backgroundColor: on ? c.ink : c.bg2,
            }}
          />
        );
      })}
    </View>
  );
}
