import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { LogoWatermark } from '@shared/components/ui';

/**
 * Figma `step-1-info` (экран ученика) — шапка карточки урока: фирменная navy-подложка
 * с водяным знаком, статус, время, предмет и три строки «где и с кем».
 *
 * Подложка одна в обеих темах, поэтому цвета поверх неё берутся из hero-токенов, а не из
 * обычных `ink`: тема переключает фон экрана, но не этот блок.
 */

/**
 * Статусный чип урока. Цвет приходит из общей модели карточки (`lesson.badge`), а как он
 * выглядит на синем — решает шапка: у ученика чип залит целиком, а «Следующий» отличается
 * от подложки белой обводкой, а не другим фоном.
 */
function HeroChip({ badge }) {
  const { c } = useTheme();
  if (!badge) return null;

  const styles = {
    red: { backgroundColor: c.red, color: c.heroInk },
    green: { backgroundColor: c.green, color: c.heroInk },
    blue: { backgroundColor: c.blue, color: c.heroInk, borderColor: c.heroInk, borderWidth: 1 },
    gray: { backgroundColor: c.heroChipBg, color: c.heroChipInk },
  };
  const s = styles[badge.color] || styles.gray;

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: s.backgroundColor,
        borderWidth: s.borderWidth || 0,
        borderColor: s.borderColor,
        alignSelf: 'flex-start',
      }}
    >
      <Txt style={{ fontSize: 12, fontWeight: '700', color: s.color }}>{badge.label}</Txt>
    </View>
  );
}

/** Строка «иконка + значение» внутри шапки. */
function HeroMeta({ icon, children }) {
  const { c } = useTheme();
  if (!children) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={16} color={c.heroInk} strokeWidth={2} />
      <Txt style={{ fontSize: 14, fontWeight: '400', color: c.heroInk }}>{children}</Txt>
    </View>
  );
}

/**
 * Полоска поверх шапки: замена учителя и причина отмены. Обе — про «с этим уроком что-то
 * не так, как в расписании», поэтому выглядят одинаково и стоят в одном месте.
 */
function HeroNotice({ children }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: c.heroSurface,
      }}
    >
      <Icon name="alertTriangle" size={14} color={c.green} strokeWidth={2.2} />
      <Txt style={{ flex: 1, fontSize: 12, fontWeight: '600', color: c.heroInk }}>{children}</Txt>
    </View>
  );
}

export function LessonHero({ lesson }) {
  const { c } = useTheme();
  const audience = [lesson.className, lesson.subgroupName].filter(Boolean).join(' · ');

  return (
    <View
      style={{
        backgroundColor: c.heroBg,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        overflow: 'hidden',
      }}
    >
      {/* Сетка знаков как в макете (Figma `ЛогоGroup`): знак 49×54, шаг 62.6×67,
          заливка без обводки, прозрачность 3% — подложка остаётся navy. */}
      <LogoWatermark
        color={c.heroWatermark}
        opacity={c.heroWatermarkOpacity}
        mark={49}
        gap={0.135}
        stroke="none"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <HeroChip badge={lesson.badge} />
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.heroInk }}>{lesson.timeRange}</Txt>
      </View>

      <Txt style={{ fontSize: 22, fontWeight: '700', color: c.heroInk }}>{lesson.subject}</Txt>

      <View style={{ gap: 8 }}>
        <HeroMeta icon="users">{audience}</HeroMeta>
        <HeroMeta icon="mapPin">{lesson.room}</HeroMeta>
        {/* В строке остаётся учитель урока, даже когда есть замена: подменяет её полоска
            ниже, а не эта строка — иначе из карточки исчезло бы, чей это урок вообще. */}
        <HeroMeta icon="userCheck">{lesson.teacherName}</HeroMeta>
      </View>

      {lesson.substituteName ? (
        <HeroNotice>{`Урок проводит: ${lesson.substituteName} · замена`}</HeroNotice>
      ) : null}

      {lesson.status === 'CANCELLED' && lesson.cancellationComment ? (
        <HeroNotice>{lesson.cancellationComment}</HeroNotice>
      ) : null}
    </View>
  );
}
