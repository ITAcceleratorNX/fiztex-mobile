import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { ServiceStateView } from './components';

/**
 * Состояния разделов заявок (ТЗ SERVICE-FE-002 §14, Figma «Мои заявки / История —
 * пустой, загрузка, ошибка»).
 *
 * Пустые «Мои заявки» и пустая «История» — разные состояния, а не одно с разным текстом:
 * первый раздел наполняет сам человек, второй наполняется, только когда заявку закроют.
 * Обещать в них одно и то же значило бы соврать в одном из двух случаев.
 */

/**
 * Скелет вместо спиннера: карточки известной высоты не дают экрану прыгнуть, когда
 * придут данные. Ширины фиксированные — мигающий при каждом ререндере скелет читается
 * как продолжающаяся загрузка.
 */
export function ServiceListSkeleton({ rows = 4 }) {
  const { c } = useTheme();
  const bar = (width, height = 14) => (
    <View style={{ width, height, borderRadius: 4, backgroundColor: c.bg2 }} />
  );
  return (
    <View style={{ gap: 14 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 12,
            padding: 12,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {bar(56)}
            {bar(72, 18)}
          </View>
          {bar(110)}
          {bar('70%')}
          {bar('90%', 16)}
        </View>
      ))}
    </View>
  );
}

export function ServiceListEmpty({ section }) {
  if (section === 'HISTORY') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
        <ServiceStateView
          icon="clock"
          title="История пуста"
          subtitle="Здесь появятся выполненные и отменённые заявки"
        />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
      <ServiceStateView
        icon="clipboardCheck"
        title="Заявок пока нет"
        subtitle="Создайте первую заявку, чтобы получить помощь от технических служб"
      />
    </View>
  );
}

export function ServiceListError({ onRetry }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
      <ServiceStateView
        icon="alertTriangle"
        tone="error"
        title="Не удалось загрузить заявки"
        subtitle="Проверьте интернет-соединение и попробуйте ещё раз"
        actionLabel="Повторить"
        onAction={onRetry}
      />
    </View>
  );
}

/** Карточка ещё грузится — те же блоки, что и в готовой, но без содержимого. */
export function ServiceCardSkeleton() {
  const { c } = useTheme();
  const bar = (width, height = 14) => (
    <View style={{ width, height, borderRadius: 4, backgroundColor: c.bg2 }} />
  );
  const block = (children) => (
    <View
      style={{
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        padding: 14,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {bar(104, 32)}
        {bar(130, 20)}
      </View>
      {block(
        <>
          {bar('100%', 16)}
          {bar('100%', 16)}
          {bar('80%', 16)}
        </>,
      )}
      {bar(96, 18)}
      {block(
        <>
          {bar('100%', 14)}
          {bar('70%', 14)}
        </>,
      )}
    </View>
  );
}

/** Заявка удалена, отменена кем-то ещё или адресована не вам. */
export function ServiceCardMissing({ onBack }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
      <ServiceStateView
        icon="info"
        title="Заявка недоступна"
        subtitle="Она могла быть удалена или принадлежит другому сотруднику"
        actionLabel="К списку"
        onAction={onBack}
      />
    </View>
  );
}

export function ServiceCardError({ onRetry }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
      <ServiceStateView
        icon="alertTriangle"
        tone="error"
        title="Не удалось загрузить заявку"
        subtitle="Проверьте интернет-соединение и попробуйте ещё раз"
        actionLabel="Повторить"
        onAction={onRetry}
      />
    </View>
  );
}
