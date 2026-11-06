import React from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AUTH, DEMO, REQUEST } from '../theme/tokens';
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
export function FormPage({ title, subtitle, onBack, large = true, footer, layout = 'auth', gap: gapOverride, children }) {
  // `layout="request"` — заявка на доступ по макету (A1–A5): поля на 20, шаг 18, своя шапка
  // `FormHeader`. Экраны входа M1–M7 остаются на `auth`, пока их не сверили с макетом.
  const request = layout === 'request';
  const gutter = request ? REQUEST.gutter : AUTH.gutter;
  // Шаг между блоками: у форм заявки 18, у шагов входа M2–M7 — 24 (`gap={REQUEST.stepGap}`).
  const gap = gapOverride ?? (request ? REQUEST.gap : AUTH.gap);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen keyboardShouldPersistTaps="handled" contentStyle={{ flexGrow: 1, paddingBottom: AUTH.sectionGap }}>
        {request ? (
          <FormHeader large={large} title={title} subtitle={subtitle} onBack={onBack} />
        ) : (
          <ScreenHeader large={large} title={title} sub={subtitle} back={onBack} />
        )}
        <View style={{ paddingHorizontal: gutter, marginTop: large ? (request ? AUTH.sectionGap : AUTH.gap) : 0, gap }}>
          {children}
        </View>
        {footer ? (
          <>
            <View style={{ flex: 1, minHeight: AUTH.sectionGap }} />
            <View style={{ paddingHorizontal: gutter, gap: AUTH.captionGap }}>{footer}</View>
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Круглая «назад» 42 с рамкой (A1–A4); у экранов кодов — 40 (`size`). */
function BackCircle({ onPress, size = REQUEST.backSize }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Назад"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name="chevronLeft" size={18} color={c.ink} strokeWidth={2.2} />
    </Pressable>
  );
}

/**
 * Шапка форм заявки (Figma A1–A4). Крупная — «назад», под ней заголовок 30/800 и подзаголовок
 * (A1); маленькая — заголовок 16/700 слева, рядом с «назад» (A2–A4), а не по центру, как у
 * `ScreenHeader`: в макете он читается продолжением кнопки.
 */
export function FormHeader({ title, subtitle, onBack, large = true, backSize = REQUEST.backSize }) {
  const { c } = useTheme();
  if (large) {
    return (
      <View style={{ paddingHorizontal: REQUEST.gutter, paddingTop: 4 }}>
        {onBack ? <BackCircle onPress={onBack} /> : null}
        {title ? (
          <View style={{ marginTop: onBack ? AUTH.sectionGap : REQUEST.backSize + AUTH.sectionGap, gap: 8 }}>
            <Txt
              accessibilityRole="header"
              style={{
                fontSize: REQUEST.titleSize,
                lineHeight: REQUEST.titleLine,
                letterSpacing: REQUEST.titleTracking,
                fontWeight: '800',
              }}
            >
              {title}
            </Txt>
            {subtitle ? (
              <Txt style={{ fontSize: REQUEST.leadSize, lineHeight: REQUEST.leadLine, color: c.ink2 }}>{subtitle}</Txt>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View
      style={{
        paddingHorizontal: REQUEST.gutter,
        paddingTop: 4,
        paddingBottom: REQUEST.gap,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: REQUEST.backSize,
      }}
    >
      {onBack ? <BackCircle onPress={onBack} size={backSize} /> : null}
      {title ? (
        // Подзаголовок маленькой шапки — «7А · ученик 21 из 21» (2460:4292): 13 серым под заголовком.
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Txt
            accessibilityRole="header"
            numberOfLines={1}
            style={{ fontSize: REQUEST.headerTitleSize, lineHeight: REQUEST.headerTitleLine, fontWeight: '700' }}
          >
            {title}
          </Txt>
          {subtitle ? (
            <Txt numberOfLines={1} style={{ fontSize: REQUEST.hintSize, lineHeight: REQUEST.hintLine, color: c.inkMuted }}>{subtitle}</Txt>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Подпись раздела длинной формы — «О ВАС», «РЕБЁНОК» (A4): 13/700 капсом, серая. */
export function FormSectionLabel({ children }) {
  const { c } = useTheme();
  return (
    <Txt
      accessibilityRole="header"
      style={{
        fontSize: REQUEST.sectionLabelSize,
        lineHeight: REQUEST.hintLine,
        fontWeight: '700',
        letterSpacing: REQUEST.sectionLabelTracking,
        color: c.ink3,
      }}
    >
      {String(children).toUpperCase()}
    </Txt>
  );
}

/** Черта между разделами формы (A4): 1 px, с воздухом сверху и снизу. */
export function FormDivider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: REQUEST.sectionGap - REQUEST.gap }} />;
}

/**
 * Уже введённое на прошлом шаге (M2–M4): «Телефон +7 700…» и «Изменить». Логин здесь не
 * поле, а напоминание — править его возвращаются туда, где он и вводился.
 */
export function ValueCard({ label, value, code = false, action = 'Изменить', onAction, status, size = 'md' }) {
  const { c } = useTheme();
  const lg = size === 'lg';
  // `size="lg"` — карточка 65 по макету M2–M4: радиус 16, подпись 12/15, значение 16/20.
  // `status` вместо действия — «✓ Подтверждён» у кода на M4: менять его уже не нужно.
  return (
    <Card
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 12 },
        lg && { borderRadius: REQUEST.valueRadius, paddingVertical: REQUEST.valuePadV, paddingHorizontal: REQUEST.valuePadH, paddingRight: REQUEST.valuePadH - 8 },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt
          style={lg
            ? { fontSize: REQUEST.valueLabelSize, lineHeight: REQUEST.valueLabelLine, color: c.inkMuted }
            : { fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.ink2 }}
        >
          {label}
        </Txt>
        <Txt
          numberOfLines={1}
          style={{
            fontSize: lg ? REQUEST.valueSize : AUTH.valueSize,
            lineHeight: lg ? REQUEST.valueLine : undefined,
            fontWeight: '600',
            marginTop: 2,
            letterSpacing: code ? (lg ? REQUEST.valueTracking : AUTH.codeSpacing) : 0,
          }}
        >
          {value}
        </Txt>
      </View>
      {status ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 }}>
          <Icon name="check" size={14} color={c.success} strokeWidth={2.4} />
          <Txt style={{ fontSize: REQUEST.hintSize, lineHeight: REQUEST.hintLine, fontWeight: '600', color: c.success }}>{status}</Txt>
        </View>
      ) : onAction ? (
        // Зона нажатия остаётся 44, но в высоту карточки не входит — иначе карточка 72 вместо 65.
        <TextButton onPress={onAction} style={lg ? { marginVertical: -(DEMO.touchSize - REQUEST.valueLine) / 2 } : undefined}>
          {action}
        </TextButton>
      ) : null}
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

/** Квадратный значок с мягкой подложкой — у строк ролей (M6, A1). `large` — 48 на радиусе 14 (A1). */
export function IconBadge({ icon, tone, size, large = false }) {
  const { c } = useTheme();
  const [bg, fg] = toneColors(c, tone);
  const side = size ?? (large ? REQUEST.badgeSize : AUTH.badgeSize);
  return (
    <View
      style={{
        width: side,
        height: side,
        borderRadius: large ? REQUEST.badgeRadius : AUTH.badgeRadius,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={large ? REQUEST.badgeIcon : 20} color={fg} />
    </View>
  );
}

/**
 * Строка «значок роли + заголовок + пояснение» (M6, A1). `compact` — как в карточке M6 по макету:
 * заголовок 15/19, пояснение 14/20.
 */
export function IconBadgeRow({ icon, tone, title, children, compact = false }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <IconBadge icon={icon} tone={tone} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt
          style={compact
            ? { fontSize: REQUEST.rowTitleSize, lineHeight: REQUEST.rowTitleLine, fontWeight: '700' }
            : { fontSize: AUTH.bodySize, fontWeight: '700' }}
        >
          {title}
        </Txt>
        <Txt
          style={compact
            ? { marginTop: 2, fontSize: REQUEST.rowTextSize, lineHeight: REQUEST.rowTextLine, color: c.ink2 }
            : { marginTop: 4, fontSize: AUTH.bodySize, lineHeight: AUTH.bodyLine, color: c.ink2 }}
        >
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
export function ChoiceCard({ icon, tone, title, children, onPress, size = 'md' }) {
  const { c } = useTheme();
  if (size === 'lg') {
    // A1: карточка 20, значок 48, заголовок 17/700, пояснение 14/20. Нажатая — navy-рамка, как
    // «Я ученик» в макете: так видно, какую строку сейчас выбрали.
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: REQUEST.choiceGap,
          paddingVertical: REQUEST.choicePadV,
          paddingHorizontal: REQUEST.choicePadH,
          borderRadius: REQUEST.choiceRadius,
          borderWidth: 1,
          borderColor: pressed ? c.blueInk : c.border,
          backgroundColor: c.surface,
        })}
      >
        <IconBadge icon={icon} tone={tone} large />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt style={{ fontSize: REQUEST.choiceTitleSize, lineHeight: REQUEST.choiceTitleLine, fontWeight: '700' }}>
            {title}
          </Txt>
          <Txt style={{ marginTop: 2, fontSize: REQUEST.choiceTextSize, lineHeight: REQUEST.choiceTextLine, color: c.ink2 }}>
            {children}
          </Txt>
        </View>
        <Icon name="chevronRight" size={REQUEST.chevron} color={c.ink2} />
      </Pressable>
    );
  }
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

/**
 * Крупный круглый значок над заголовком экрана-итога (A5 «отправлена», S6 «на проверке»).
 * `large` — 72 со значком 34, как на A5.
 */
export function StatusMark({ icon, tone, large = false, square = false }) {
  // `square` — значок 56 на радиусе 18 у левого края, над заголовком отказа (S4).
  const { c } = useTheme();
  const [bg, fg] = toneColors(c, tone);
  const side = square ? REQUEST.problemSize : large ? REQUEST.markSize : AUTH.markSize;
  return (
    <View
      style={{
        width: side,
        height: side,
        borderRadius: square ? REQUEST.problemRadius : 999,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: square ? 'flex-start' : 'center',
      }}
    >
      <Icon
        name={icon}
        size={square ? REQUEST.problemIcon : large ? REQUEST.markIconSize : AUTH.markIconSize}
        color={fg}
        strokeWidth={2.2}
      />
    </View>
  );
}

/**
 * Шкала рассмотрения (S2): точка 22 — пройдено (зелёная с галочкой), сейчас (белая с оранжевым
 * кольцом 6), впереди (белая с серой рамкой); между точками черта 2, зелёная за пройденным шагом.
 * `steps` — `{ title, caption?, state: 'done' | 'current' | 'todo' }`.
 */
export function StatusTimeline({ steps }) {
  const { c } = useTheme();
  return (
    <Card style={{ paddingVertical: REQUEST.choicePadV }}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const done = step.state === 'done';
        const current = step.state === 'current';
        return (
          <View key={step.title} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: REQUEST.timelineDot }}>
              <View
                style={{
                  width: REQUEST.timelineDot,
                  height: REQUEST.timelineDot,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? c.success : c.surface,
                  borderWidth: done ? 0 : current ? REQUEST.timelineRing : REQUEST.timelineTodoBorder,
                  borderColor: current ? c.green : c.borderStrong,
                }}
              >
                {done ? <Icon name="check" size={12} color={c.heroInk} strokeWidth={3} /> : null}
              </View>
              {!last ? (
                <View style={{ width: REQUEST.timelineLine, flex: 1, minHeight: 12, backgroundColor: done ? c.success : c.border }} />
              ) : null}
            </View>
            <View style={{ flex: 1, minHeight: REQUEST.timelineDot, paddingBottom: last ? 0 : REQUEST.timelineRowGap, justifyContent: last ? 'center' : 'flex-start' }}>
              <Txt
                style={{
                  fontSize: REQUEST.rowTitleSize,
                  lineHeight: REQUEST.rowTitleLine,
                  fontWeight: '600',
                  color: step.state === 'todo' ? c.ink3 : c.ink,
                }}
              >
                {step.title}
              </Txt>
              {step.caption ? (
                <Txt style={{ fontSize: REQUEST.hintSize, lineHeight: REQUEST.hintLine, color: c.inkMuted }}>{step.caption}</Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

/**
 * Сводка заявки. `compact` — строки 14/18 без черт (S2, «что школа видит сейчас»); `table` — строки
 * 15/19 с чертами (S4 «Что вы отправили»: таблица, которую сверяют с причиной отказа). `rows` —
 * `{ label, value, muted? }`; `muted` — пустое значение серым («Не указан»).
 */
export function SummaryCard({ rows, variant = 'compact' }) {
  const { c } = useTheme();
  const table = variant === 'table';
  if (!table) {
    return (
      <Card style={{ paddingVertical: REQUEST.summaryPadV, gap: REQUEST.summaryRowGap }}>
        {rows.map((row) => (
          <View key={row.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Txt style={{ flex: 1, fontSize: REQUEST.summarySize, lineHeight: REQUEST.summaryLine, color: c.inkMuted }}>{row.label}</Txt>
            <Txt style={{ flexShrink: 1, fontSize: REQUEST.summarySize, lineHeight: REQUEST.summaryLine, fontWeight: '600', textAlign: 'right' }}>
              {row.value}
            </Txt>
          </View>
        ))}
      </Card>
    );
  }
  return (
    <Card padded={false}>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: REQUEST.fieldInset,
            paddingVertical: REQUEST.tableRowPadV,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: c.border,
          }}
        >
          <Txt style={{ flex: 1, fontSize: REQUEST.tableSize, lineHeight: REQUEST.tableLine, color: c.inkMuted }}>{row.label}</Txt>
          <Txt
            style={{
              flexShrink: 1,
              fontSize: REQUEST.tableSize,
              lineHeight: REQUEST.tableLine,
              fontWeight: '600',
              textAlign: 'right',
              color: row.muted ? c.ink3 : c.ink,
            }}
          >
            {row.value}
          </Txt>
        </View>
      ))}
    </Card>
  );
}

/** Шаги первого входа (S3): navy-кружок 28 с номером, заголовок 15/19, пояснение 14/20. */
export function NumberedSteps({ steps }) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: REQUEST.stepGap }}>
      {steps.map((step, index) => (
        <View key={step.title} style={{ flexDirection: 'row', gap: 12 }}>
          <View
            style={{
              width: REQUEST.stepBadge,
              height: REQUEST.stepBadge,
              borderRadius: 999,
              backgroundColor: c.blue,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt style={{ fontSize: REQUEST.labelSize, lineHeight: REQUEST.labelLine, fontWeight: '700', color: c.heroInk }}>{index + 1}</Txt>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt style={{ fontSize: REQUEST.rowTitleSize, lineHeight: REQUEST.rowTitleLine, fontWeight: '700' }}>{step.title}</Txt>
            <Txt style={{ marginTop: 2, fontSize: REQUEST.rowTextSize, lineHeight: REQUEST.rowTextLine, color: c.ink2 }}>{step.text}</Txt>
          </View>
        </View>
      ))}
    </Card>
  );
}

