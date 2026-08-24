import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';

/**
 * Пустое тело экрана (Figma `empty-state-container`, `error-container`).
 *
 * Не `StateView`: у того кнопка снизу на всю ширину и другой размер круга, а здесь по
 * макету иконка в мягком квадрате и текст по центру. Кнопка появляется только там, где
 * есть что повторить.
 */
export function GradesEmptyBody({ icon, title, subtitle, action }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 56, gap: 20 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.bg2,
        }}
      >
        <Icon name={icon} size={26} color={c.ink3} strokeWidth={2} />
      </View>
      <View style={{ gap: 8 }}>
        {title ? (
          <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center' }}>
            {title}
          </Txt>
        ) : null}
        {subtitle ? (
          <Txt
            style={{
              fontSize: 13,
              fontWeight: '500',
              lineHeight: 18,
              color: c.ink3,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {action}
    </View>
  );
}

/** Отменённый урок: оценок нет и не будет — списку взяться неоткуда (GRADES-001 §9). */
export function LessonCancelledState() {
  return (
    <GradesEmptyBody
      icon="calendar"
      title="Урок отменён — оценки недоступны"
      subtitle="Оценки можно выставлять только для проведённых уроков"
    />
  );
}

/** Состав пуст — это вопрос к классу, а не к оценкам. */
export function EmptyRosterState() {
  return (
    <GradesEmptyBody
      icon="users"
      title="В уроке отсутствуют ученики"
      subtitle="Проверьте состав класса или подгруппы у администратора"
    />
  );
}

/** Журнал открыт, уроки есть, оценок пока не поставили. */
export function NoGradesState() {
  return (
    <GradesEmptyBody
      icon="list"
      title="Оценок пока нет"
      subtitle="Оценки появятся после выставления на уроках"
    />
  );
}

/** Окно журнала пусто: период ещё не начался или уроков этого предмета в нём нет. */
export function NoPeriodDataState() {
  return (
    <GradesEmptyBody
      icon="search"
      title="Нет данных за выбранный период"
      subtitle="Попробуйте изменить фильтры"
    />
  );
}

/** Скелет списка: повторяет геометрию строки, чтобы содержимое не прыгало при подмене. */
export function GradesSkeleton({ rows = 6, header = true }) {
  const { c } = useTheme();
  const bar = (width, height = 12, color) => (
    <View style={{ width, height, borderRadius: 4, backgroundColor: color || c.bg2 }} />
  );

  return (
    <View style={{ gap: 12 }} accessibilityLabel="Загрузка оценок">
      {header ? (
        <View style={{ backgroundColor: c.blueSoft, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {bar(120, 22, c.stripeIdle)}
            {bar(70, 16)}
          </View>
          {bar('60%', 16)}
          {bar('45%', 14)}
        </View>
      ) : null}
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 56,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            paddingHorizontal: 16,
            justifyContent: 'center',
          }}
        >
          {bar('55%', 14)}
        </View>
      ))}
    </View>
  );
}
