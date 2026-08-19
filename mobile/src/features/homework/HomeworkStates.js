import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { StateView } from '@shared/components/ui';

/**
 * Состояния ленты ДЗ (Figma «ДЗ (моб.) — Загрузка / Нет актуальных / История пуста /
 * Ошибка», 853:19614…19745).
 *
 * Пустая «История» и пустые «Актуальные» — разные состояния, а не одно с разным текстом:
 * в первой ничего не появится, пока учитель не завершит задание, а вторая наполняется
 * сама. Обещать в них одно и то же значило бы соврать в одном из двух случаев.
 */

/**
 * Скелет вместо спиннера: строки известной высоты не дают экрану прыгнуть, когда
 * придут данные. Ширины фиксированные, а не случайные — мигающий при каждом ререндере
 * скелет читается как продолжающаяся загрузка.
 */
export function HomeworkSkeleton({ rows = 5 }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingTop: 12, gap: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ paddingHorizontal: 16, gap: 6 }}>
          <View style={{ width: 85, height: 12, borderRadius: 4, backgroundColor: c.bg2 }} />
          <View style={{ width: 255, height: 14, borderRadius: 4, backgroundColor: c.bg2 }} />
        </View>
      ))}
    </View>
  );
}

export function HomeworkEmpty({ scope }) {
  if (scope === 'HISTORY') {
    return (
      <StateView
        style={{ marginTop: 96 }}
        title="В истории пока ничего нет"
        subtitle="Завершённые и отменённые задания будут отображаться здесь"
      />
    );
  }
  return (
    <StateView
      style={{ marginTop: 96 }}
      title="Нет актуальных заданий"
      subtitle="Новые задания от учителей появятся здесь"
    />
  );
}

export function HomeworkError({ onRetry }) {
  return (
    <StateView
      style={{ marginTop: 88 }}
      icon="alertTriangle"
      tone="error"
      title="Не удалось загрузить задания"
      subtitle="Проверьте подключение к сети и попробуйте ещё раз"
      actionLabel="Повторить"
      onAction={onRetry}
    />
  );
}

/**
 * Раздел не для этой роли. Отдельно от ошибки загрузки: «Повторить» здесь ничего не
 * изменит, и предлагать его — вести по кругу.
 */
export function HomeworkForbidden({ forParent = false }) {
  return (
    <StateView
      style={{ marginTop: 96 }}
      icon="lock"
      title="Раздел недоступен"
      subtitle={
        forParent
          ? 'Похоже, к вашему профилю не привязан ни один ученик. Обратитесь к администратору школы.'
          : 'Задания доступны ученику. Если доступ нужен, обратитесь к администратору школы.'
      }
    />
  );
}

/** Задание удалено, отозвано или адресовано не вам. */
export function HomeworkMissing({ onBack }) {
  return (
    <StateView
      style={{ marginTop: 96 }}
      icon="info"
      title="Задание недоступно"
      subtitle="Оно могло быть удалено учителем или адресовано другому классу"
      actionLabel="К списку"
      onAction={onBack}
    />
  );
}

/** Карточка ещё грузится — те же блоки, что и в готовой, но без содержимого. */
export function HomeworkCardSkeleton() {
  const { c } = useTheme();
  const bar = (width, height = 14) => (
    <View style={{ width, height, borderRadius: 4, backgroundColor: c.bg2 }} />
  );
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 20 }}>
      <View style={{ gap: 8 }}>
        {bar('70%', 20)}
        {bar('45%', 12)}
      </View>
      <View style={{ gap: 8 }}>
        {bar('40%', 12)}
        {bar('100%')}
        {bar('85%')}
      </View>
      <View style={{ gap: 8 }}>
        {bar('35%', 12)}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {bar(120, 28)}
          {bar(100, 28)}
        </View>
      </View>
    </View>
  );
}

/** Заголовок ленты — «Задания» и, у родителя, подпись выбранного ребёнка. */
export function ListHeading({ children }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
      <Txt style={{ fontSize: 24, fontWeight: '800', color: c.blue }}>Задания</Txt>
      {children}
    </View>
  );
}
