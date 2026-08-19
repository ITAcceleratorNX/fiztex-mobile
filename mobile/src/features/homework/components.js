import React from 'react';
import { View, Pressable, ScrollView, Image, Modal } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  dueShort,
  isOverdueOpen,
  submissionStatusChip,
} from '@shared/api/homeworkMap';

/**
 * Общие детали экранов ДЗ ученика и родителя (Figma «ДЗ (моб.)» 853:19518 и
 * «Родитель ДЗ» 901:14854…). Списки у ролей дословно одинаковые, а карточки различаются
 * только тем, что показывают ниже шапки, — поэтому шапка, чип и чипы вложений живут
 * здесь, а не удваиваются в двух экранах.
 */

/** Чип статуса работы. Тон приходит из `submissionStatusChip`, цвет берётся здесь. */
export function StatusChip({ row, size = 'sm' }) {
  const { c } = useTheme();
  const chip = submissionStatusChip(row);
  if (!chip) return null;

  const tones = {
    pending: [c.hwPendingTint, c.hwPendingInk],
    review: [c.hwReviewTint, c.hwReviewInk],
    returned: [c.hwReturnedTint, c.hwReturnedInk],
    done: [c.hwDoneTint, c.hwDoneInk],
    failed: [c.hwFailedTint, c.hwFailedInk],
  };
  const [bg, ink] = tones[chip.tone] || tones.pending;
  const big = size === 'md';

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: big ? 12 : 20,
        backgroundColor: bg,
      }}
    >
      <Txt style={{ fontSize: big ? 10 : 11, fontWeight: '700', color: ink }}>{chip.label}</Txt>
    </View>
  );
}

/**
 * «Дедлайн истёк» — тег под чипом статуса. Отдельно от статуса, а не вместо него:
 * задание остаётся открытым, и подменять «Не отправлено» просрочкой значило бы скрыть
 * от ученика, что сдать ещё можно (ТЗ HOMEWORK-001 §9).
 */
export function OverdueTag() {
  const { c } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-end',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 20,
        backgroundColor: c.redSoft,
      }}
    >
      <Txt style={{ fontSize: 10, fontWeight: '500', color: c.red }}>Дедлайн истёк</Txt>
    </View>
  );
}

/** Строка ленты: предмет и срок сверху, название снизу, статус справа. */
export function HomeworkRow({ row, onPress }) {
  const { c } = useTheme();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть задание «${row.title ?? ''}»`}
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: pressed ? c.bg2 : 'transparent',
        })}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt
              style={{ fontSize: 13, fontWeight: '600', color: c.inkMuted, flexShrink: 1 }}
              numberOfLines={1}
            >
              {row.subjectName}
            </Txt>
            <Txt style={{ fontSize: 13, fontWeight: '400', color: c.ink3 }}>{dueShort(row)}</Txt>
          </View>
          <Txt style={{ fontSize: 15, fontWeight: '500', color: c.ink }} numberOfLines={1}>
            {row.title}
          </Txt>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusChip row={row} />
          {isOverdueOpen(row) ? <OverdueTag /> : null}
        </View>
      </Pressable>
      <View style={{ height: 1, backgroundColor: c.bg2 }} />
    </View>
  );
}

/** Пилюли «Актуальные / История» на серой дорожке. */
export function ScopeTabs({ value, onChange }) {
  const { c } = useTheme();
  const tabs = [
    { value: 'ACTUAL', label: 'Актуальные' },
    { value: 'HISTORY', label: 'История' },
  ];
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: c.bg2,
        borderRadius: 10,
        padding: 3,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.value)}
            style={{
              flex: 1,
              height: 31,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? c.surface : 'transparent',
              ...(selected
                ? {
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }
                : null),
            }}
          >
            <Txt
              style={{
                fontSize: 14,
                fontWeight: selected ? '600' : '500',
                color: selected ? c.ink : c.inkMuted,
              }}
            >
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Заголовок раздела внутри карточки — «Материалы учителя», «Обратная связь». */
export function SectionLabel({ children, style }) {
  const { c } = useTheme();
  return (
    <Txt style={[{ fontSize: 14, fontWeight: '600', color: c.ink }, style]}>{children}</Txt>
  );
}

/**
 * Чип вложения. Ссылка помечена иконкой, а не другим цветом: ссылку открывают браузером,
 * файл скачивают, и на ощупь это должно различаться до нажатия.
 */
export function FileChip({ label, icon = 'paperclip', onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: c.hwChipBg,
        opacity: pressed && onPress ? 0.75 : 1,
      })}
    >
      <Icon name={icon} size={13} color={c.ink2} strokeWidth={2} />
      <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink }} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function ChipRow({ children }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>
  );
}

/** Плашка состояния над содержимым карточки. */
export function Notice({ tone = 'warn', children }) {
  const { c } = useTheme();
  const tones = {
    warn: [c.hwReturnedTint, c.hwReturnedInk, '600'],
    danger: [c.hwFailedTint, c.hwFailedInk, '400'],
  };
  const [bg, ink, weight] = tones[tone] || tones.warn;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: bg,
      }}
    >
      <Txt style={{ flex: 1, fontSize: 13, fontWeight: weight, color: ink }}>{children}</Txt>
    </View>
  );
}

/** Курсивная строка «чего ждём» под содержимым карточки. */
export function StatusHint({ children }) {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        fontSize: 13,
        fontWeight: '400',
        fontStyle: 'italic',
        color: c.inkMuted,
        textAlign: 'center',
        paddingTop: 16,
      }}
    >
      {children}
    </Txt>
  );
}

/**
 * Комментарий учителя. Два вида: на возвращённой работе он подсвечен — его нужно
 * прочитать, чтобы понять, что исправлять; на принятой это уже просто отзыв, и кричать
 * ему незачем.
 */
export function FeedbackBox({ title = 'Комментарий учителя', text, highlighted = true, children }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        gap: 4,
        padding: 12,
        borderRadius: highlighted ? 12 : 10,
        backgroundColor: highlighted ? c.hwFeedbackTint : c.bg2,
      }}
    >
      <Txt
        style={{
          fontSize: 13,
          fontWeight: highlighted ? '700' : '500',
          color: highlighted ? c.hwFeedbackInk : c.inkMuted,
        }}
      >
        {title}
      </Txt>
      {text ? (
        <Txt style={{ fontSize: 14, fontWeight: '400', lineHeight: 20, color: c.ink }}>{text}</Txt>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Полоса фотографий обратной связи. Открываются наложением внутри экрана, а не новой
 * вкладкой: на пометках учителя весь смысл в мелких деталях, и рассмотреть их надо
 * не выходя из задания.
 */
export function PhotoStrip({ photos = [], uriFor, headers, label }) {
  const { c } = useTheme();
  const [zoomed, setZoomed] = React.useState(null);
  if (photos.length === 0) return null;

  return (
    <View style={{ gap: 6, paddingTop: 8 }}>
      {label ? (
        <Txt style={{ fontSize: 12, fontWeight: '600', color: c.inkMuted }}>
          {label} ({photos.length})
        </Txt>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {photos.map((photo) => (
            <Pressable
              key={photo.id}
              accessibilityRole="button"
              accessibilityLabel={`Открыть ${photo.fileName || 'фотографию'}`}
              onPress={() => setZoomed(photo)}
            >
              <Image
                source={{ uri: uriFor(photo), headers }}
                style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: c.bg2 }}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={Boolean(zoomed)} transparent animationType="fade" onRequestClose={() => setZoomed(null)}>
        <Pressable
          onPress={() => setZoomed(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.88)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {zoomed ? (
            <Image
              source={{ uri: uriFor(zoomed), headers }}
              resizeMode="contain"
              style={{ width: '100%', height: '80%' }}
            />
          ) : null}
          <Txt style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            Нажмите, чтобы закрыть
          </Txt>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Тонкая линия между блоками карточки. */
export function Divider({ style }) {
  const { c } = useTheme();
  return <View style={[{ height: 1, backgroundColor: c.bg2 }, style]} />;
}
