import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { LogoWatermark } from '@shared/components/ui';

/**
 * Figma `step-1-info` — шапка карточки урока: фирменная подложка с водяным знаком,
 * статус, время, предмет и строки «где и с кем».
 *
 * Подложка не зависит от темы (тема переключает фон экрана, но не этот блок), зато
 * зависит от роли: ученик — navy со знаками #88A7F9 3%, родитель — оранжевая с белыми
 * знаками 6%. Поэтому цвета поверх берутся из hero-токенов, а не из обычных `ink`.
 */
const TONES = {
  student: (c) => ({
    bg: c.heroBg,
    mark: c.heroWatermark,
    markOpacity: c.heroWatermarkOpacity,
    accent: c.blue,
  }),
  parent: (c) => ({
    bg: c.heroBgParent,
    mark: c.heroWatermarkParent,
    markOpacity: c.heroWatermarkParentOpacity,
    accent: c.green,
  }),
};

/**
 * Статусный чип урока. Цвет приходит из общей модели карточки (`lesson.badge`), а как он
 * ложится на подложку — решает шапка: «Следующий» повторяет её цвет и отличается белой
 * обводкой, а чип, который совпал бы с подложкой по заливке («Сейчас» на оранжевой),
 * выворачивается — белый фон и цветной текст, иначе он бы просто исчез.
 */
function HeroChip({ badge, tone }) {
  const { c } = useTheme();
  if (!badge) return null;

  const onOrange = tone.bg === c.heroBgParent;
  const styles = {
    red: { backgroundColor: c.red, color: c.heroInk },
    green: onOrange
      ? { backgroundColor: c.heroInk, color: c.green }
      : { backgroundColor: c.green, color: c.heroInk },
    blue: { backgroundColor: tone.bg, color: c.heroInk, borderColor: c.heroInk, borderWidth: 1 },
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
function HeroNotice({ children, tone }) {
  const { c } = useTheme();
  // Оранжевый значок на оранжевой подложке не виден — там он белый, как и текст.
  const iconColor = tone.bg === c.heroBgParent ? c.heroInk : c.green;
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
      <Icon name="alertTriangle" size={14} color={iconColor} strokeWidth={2.2} />
      <Txt style={{ flex: 1, fontSize: 12, fontWeight: '600', color: c.heroInk }}>{children}</Txt>
    </View>
  );
}

/**
 * @param {'student'|'parent'} variant чей это экран. У родителя (Figma «Родитель —
 *   полный экран») подложка оранжевая, а класс уже назван в подзаголовке экрана,
 *   поэтому в шапке он не повторяется и учитель с кабинетом идут одной строкой.
 */
export function LessonHero({ lesson, variant = 'student' }) {
  const { c } = useTheme();
  const tone = (TONES[variant] || TONES.student)(c);
  const compactMeta = variant === 'parent';
  const audience = [lesson.className, lesson.subgroupName].filter(Boolean).join(' · ');

  return (
    <View
      style={{
        backgroundColor: tone.bg,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        overflow: 'hidden',
      }}
    >
      {/* Сетка знаков как в макете (Figma `ЛогоGroup`): знак 49×54, шаг 62.6×67,
          заливка без обводки — подложка остаётся цветом роли. */}
      <LogoWatermark
        color={tone.mark}
        opacity={tone.markOpacity}
        mark={49}
        gap={0.135}
        stroke="none"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <HeroChip badge={lesson.badge} tone={tone} />
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.heroInk }}>{lesson.timeRange}</Txt>
      </View>

      <Txt style={{ fontSize: 22, fontWeight: '700', color: c.heroInk }}>{lesson.subject}</Txt>

      {/* В строке учителя остаётся учитель урока, даже когда есть замена: подменяет её
          полоска ниже, а не эта строка — иначе из карточки исчезло бы, чей это урок. */}
      {compactMeta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <HeroMeta icon="userCheck">{lesson.teacherName}</HeroMeta>
          <HeroMeta icon="mapPin">{lesson.room}</HeroMeta>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <HeroMeta icon="users">{audience}</HeroMeta>
          <HeroMeta icon="mapPin">{lesson.room}</HeroMeta>
          <HeroMeta icon="userCheck">{lesson.teacherName}</HeroMeta>
        </View>
      )}

      {lesson.substituteName ? (
        <HeroNotice tone={tone}>{`Урок проводит: ${lesson.substituteName} · замена`}</HeroNotice>
      ) : null}

      {lesson.status === 'CANCELLED' && lesson.cancellationComment ? (
        <HeroNotice tone={tone}>{lesson.cancellationComment}</HeroNotice>
      ) : null}
    </View>
  );
}
