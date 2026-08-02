import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { StateView } from '@shared/components/ui';

/**
 * Заголовок карточки урока: возврат в расписание слева, дата урока справа.
 * Общий для всех ролей — экран урока один и тот же объект, откуда бы в него ни зашли.
 *
 * `subtitle` — вторая строка под возвратом (у родителя там ребёнок, в чьём контексте
 * открыт урок). Отступ 21px выравнивает её по тексту «Расписание», а не по шеврону.
 */
export function LessonCardHeader({ dateLabel, subtitle, onBack }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад к расписанию"
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.4} />
          <Txt style={{ fontSize: 18, fontWeight: '500', color: c.blue }}>Расписание</Txt>
        </Pressable>
        {dateLabel ? (
          <Txt style={{ fontSize: 14, fontWeight: '500', color: c.inkMuted }}>{dateLabel}</Txt>
        ) : null}
      </View>
      {subtitle ? <View style={{ paddingLeft: 21 }}>{subtitle}</View> : null}
    </View>
  );
}

/**
 * Figma «Загрузка»: скелет повторяет геометрию самой карточки — тонированный блок шапки,
 * белый блок учебной части и разделы урока. Так контент не прыгает при подмене, а экран
 * сразу читается как «карточка урока», а не как абстрактный лоадер.
 *
 * @param {'grid'|'rows'} sections как выложены разделы урока: сетка 2×2 (учитель) или
 *   строки во всю ширину (ученик). Скелет обязан совпадать с тем, что появится после него.
 */
export function LessonCardSkeleton({ sections = 'grid' }) {
  const { c } = useTheme();
  // Плейсхолдеры берут те же токены, что и реальные поверхности, поэтому скелет
  // сам подстраивается под тему — отдельной палитры для загрузки не нужно.
  const strong = c.stripeIdle;
  const soft = c.bg2;

  const bar = (width, height = 12, color = strong) => (
    <View style={{ width, height, borderRadius: 4, backgroundColor: color }} />
  );

  const block = (key, height) => (
    <View
      key={key}
      style={{
        flex: 1,
        height,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    />
  );

  return (
    <View style={{ padding: 16, gap: 12 }} accessibilityLabel="Загрузка урока">
      <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {bar(96, 20)}
          {bar(76, 16, soft)}
        </View>
        {bar('70%', 24)}
        <View style={{ gap: 8 }}>
          {bar('55%', 14, soft)}
          {bar('40%', 14, soft)}
          {bar('48%', 14, soft)}
        </View>
      </View>

      <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, gap: 14 }}>
        {bar(84, 10, soft)}
        {bar('88%', 14)}
        <View style={{ height: 1, backgroundColor: c.border }} />
        {bar(140, 10, soft)}
        {bar('100%', 14)}
        {bar('62%', 14)}
      </View>

      <View style={{ gap: 10 }}>
        {sections === 'grid'
          ? [0, 1].map((row) => (
              <View key={row} style={{ flexDirection: 'row', gap: 10 }}>
                {[0, 1].map((col) => block(col, 72))}
              </View>
            ))
          : [0, 1, 2].map((row) => (
              <View key={row} style={{ flexDirection: 'row' }}>
                {block(row, 68)}
              </View>
            ))}
      </View>
    </View>
  );
}

/**
 * Состояния до карточки — загрузка, «нет доступа» и сбой загрузки.
 *
 * Один компонент на все роли: тексты и геометрия этих экранов не зависят от того, кто
 * открыл урок, а расходиться они начинают ровно тогда, когда их копируют по экранам.
 *
 * @param {'loading'|'forbidden'|'error'} kind
 * @param {string} [dateLabel] дата из строки расписания — при загрузке она уже известна,
 *   и показать её сразу честнее, чем держать шапку пустой
 */
export function LessonCardFallback({ kind, dateLabel, sections, onBack, onRetry }) {
  const { c } = useTheme();

  return (
    <Screen scroll={false} style={{ backgroundColor: c.bg }}>
      <LessonCardHeader dateLabel={kind === 'loading' ? dateLabel : null} onBack={onBack} />
      {kind === 'loading' ? (
        <LessonCardSkeleton sections={sections} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 80 }}>
          {kind === 'forbidden' ? (
            <StateView
              icon="lock"
              tone="brand"
              title="У вас нет доступа к этому уроку"
              subtitle="Урок принадлежит другому классу или группе"
              actionLabel="Вернуться к расписанию"
              onAction={onBack}
            />
          ) : (
            <StateView
              icon="alertTriangle"
              tone="warn"
              title="Не удалось загрузить урок"
              subtitle="Проверьте подключение к сети интернет и попробуйте ещё раз"
              actionLabel="Повторить"
              onAction={onRetry}
            />
          )}
        </View>
      )}
    </Screen>
  );
}
