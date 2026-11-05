import React from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AUTH } from '../theme/tokens';
import { Screen } from '../components/Screen';
import { TextButton } from '../components/TextButton';
import { Txt } from '../components/Txt';
import Icon from '../components/Icon';
import { Card, ScreenHeader } from '../components/ui';

/**
 * Детали экранов-форм из макетов `Admin_Admissions` (вход M1–M7, заявка A1–A5, статус S1–S6).
 * Вынесены в `shared`, когда понадобились второму разделу: вход и заявка на доступ говорят
 * одним визуальным языком, и копия по месту разошлась бы с оригиналом.
 */

/**
 * Тон значка: подложка и глиф. Оранжевый — фирменный CTA, «внимание» без тревоги. Синий глиф —
 * `blueInk`: в светлой теме он и есть фирменный navy, а в тёмной navy на тёмно-синей подложке
 * почти пропадал (шапочка вступительного теста на M1).
 */
function toneColors(c, tone) {
  switch (tone) {
    case 'orange': return [c.greenSoft, c.green];
    case 'success': return [c.successSoft, c.success];
    case 'danger': return [c.redSoft, c.red];
    default: return [c.blueSoft, c.blueInk];
  }
}

/**
 * Каркас экрана-формы: круглая кнопка «назад», заголовок и колонка содержимого. Крупный
 * заголовок с подзаголовком (`large`) — у шагов входа и экранов статуса; маленький по центру —
 * у длинных форм заявки, где место нужно полям. Без `onBack` кнопки нет: с обязательной смены
 * пароля (M7) вернуться некуда.
 *
 * `footer` прижимается к низу экрана, пока содержимое короче экрана, и уезжает вниз вместе
 * с ним, когда длиннее, — главная кнопка не перекрывает поля.
 */
export function FormPage({ title, subtitle, onBack, large = true, footer, children }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen keyboardShouldPersistTaps="handled" contentStyle={{ flexGrow: 1, paddingBottom: AUTH.sectionGap }}>
        <ScreenHeader large={large} title={title} sub={subtitle} back={onBack} />
        <View style={{ paddingHorizontal: AUTH.gutter, marginTop: large ? AUTH.gap : 0, gap: AUTH.gap }}>
          {children}
        </View>
        {footer ? (
          <>
            <View style={{ flex: 1, minHeight: AUTH.sectionGap }} />
            <View style={{ paddingHorizontal: AUTH.gutter, gap: AUTH.captionGap }}>{footer}</View>
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

/**
 * Уже введённое на прошлом шаге (M2–M4): «Телефон +7 700…» и «Изменить». Логин здесь не
 * поле, а напоминание — править его возвращаются туда, где он и вводился.
 */
export function ValueCard({ label, value, code = false, action = 'Изменить', onAction }) {
  const { c } = useTheme();
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.ink2 }}>{label}</Txt>
        <Txt
          numberOfLines={1}
          style={{
            fontSize: AUTH.valueSize,
            fontWeight: '600',
            marginTop: 2,
            letterSpacing: code ? AUTH.codeSpacing : 0,
          }}
        >
          {value}
        </Txt>
      </View>
      {onAction ? <TextButton onPress={onAction}>{action}</TextButton> : null}
    </Card>
  );
}

/** Отказ под полем (Figma M5): значок и текст, а не только красная рамка. */
export function FormError({ children }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 8, marginTop: AUTH.captionGap }}>
      <View style={{ marginTop: 1 }}>
        <Icon name="alertCircle" size={AUTH.iconSize} color={c.red} />
      </View>
      <Txt style={{ flex: 1, fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.red }}>
        {children}
      </Txt>
    </View>
  );
}

/** Подсказка под полем или сноска внизу экрана. */
export function Hint({ children, center = false }) {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        marginTop: AUTH.captionGap,
        fontSize: AUTH.captionSize,
        lineHeight: AUTH.captionLine,
        color: c.inkMuted,
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </Txt>
  );
}

/** Правило нового пароля (M7, A3): галочка, когда выполнено, крестик — пока нет. */
export function Rule({ met, children }) {
  const { c } = useTheme();
  const color = met ? c.success : c.ink3;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: AUTH.captionGap }}>
      <Icon name={met ? 'check' : 'x'} size={AUTH.iconSize} color={color} strokeWidth={2} />
      <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color }}>{children}</Txt>
    </View>
  );
}

/** Квадратный значок с мягкой подложкой — у строк ролей (M6, A1). */
export function IconBadge({ icon, tone, size = AUTH.badgeSize }) {
  const { c } = useTheme();
  const [bg, fg] = toneColors(c, tone);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: AUTH.badgeRadius,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={20} color={fg} />
    </View>
  );
}

/** Строка «значок роли + заголовок + пояснение» (M6, A1). */
export function IconBadgeRow({ icon, tone, title, children }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <IconBadge icon={icon} tone={tone} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: AUTH.bodySize, fontWeight: '700' }}>{title}</Txt>
        <Txt style={{ marginTop: 4, fontSize: AUTH.bodySize, lineHeight: AUTH.bodyLine, color: c.ink2 }}>
          {children}
        </Txt>
      </View>
    </View>
  );
}

/**
 * Нажимаемая карточка с той же строкой и шевроном — выбор пути: роль на A1, вступительный тест
 * на M1. Одна на оба экрана, чтобы «куда ещё можно пойти» выглядело везде одинаково.
 */
export function ChoiceCard({ icon, tone, title, children, onPress }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <IconBadgeRow icon={icon} tone={tone} title={title}>
          {children}
        </IconBadgeRow>
      </View>
      <Icon name="chevronRight" size={20} color={c.ink3} />
    </Card>
  );
}

/** Крупный круглый значок над заголовком экрана-итога (A5 «отправлена», S6 «на проверке»). */
export function StatusMark({ icon, tone }) {
  const { c } = useTheme();
  const [bg, fg] = toneColors(c, tone);
  return (
    <View
      style={{
        width: AUTH.markSize,
        height: AUTH.markSize,
        borderRadius: 999,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
      }}
    >
      <Icon name={icon} size={AUTH.markIconSize} color={fg} strokeWidth={2.2} />
    </View>
  );
}
