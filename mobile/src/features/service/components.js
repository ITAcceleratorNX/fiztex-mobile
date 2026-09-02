import React from 'react';
import {
  View, Pressable, Image, Modal, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  MAX_PHOTOS,
  assigneeName,
  viewerContext,
  locationLine,
  serviceTypeMeta,
  shortDate,
  statusChip,
  eventAt,
} from '@shared/api/serviceRequestsMap';
import { serviceRequestFiles } from '@shared/api/serviceRequestsApi';

/**
 * Общие детали экранов сервисных заявок (Figma «Сервисные заявки», 1114:7948 и
 * 1118:19046). «Мои заявки» и «История» — один визуальный паттерн карточки (ТЗ §5), и
 * различаются они только тем, какие статусы в них попадают; поэтому карточка живёт
 * здесь, а не удваивается в двух списках.
 */


/**
 * Шапка раздела заявок: ссылка «Назад», крупный заголовок и, у формы, подпись шага
 * (Figma «Сервисные заявки» и «Создать заявку шаг 1/2»).
 *
 * Своя, а не общий {@link ScreenHeader}: тот ставит круглую кнопку и заголовок по
 * центру, а весь раздел свёрстан по левому краю с текстовой ссылкой.
 */
export function ServiceHeader({ title, step, onBack }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 6 }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          onPress={onBack}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
        >
          <Icon name="chevronLeft" size={14} color={c.blue} strokeWidth={2.4} />
          <Txt style={{ fontSize: 15, fontWeight: '500', color: c.blue }}>Назад</Txt>
        </Pressable>
      ) : null}
      <Txt style={{ fontSize: 26, fontWeight: '700', color: c.ink }}>{title}</Txt>
      {step ? <Txt style={{ fontSize: 14, color: c.ink3 }}>{step}</Txt> : null}
    </View>
  );
}

/** Чип статуса. Тон приходит из `statusChip`, цвет берётся здесь (Figma `r=12`, 10/700). */
export function StatusChip({ status, size = 'sm', style }) {
  const { c } = useTheme();
  const chip = statusChip(status);
  if (!chip) return null;

  const tones = {
    new: [c.srNewTint, c.srNewInk],
    progress: [c.srProgressTint, c.srProgressInk],
    done: [c.srDoneTint, c.srDoneInk],
    cancelled: [c.srCancelledTint, c.srCancelledInk],
  };
  const [bg, ink] = tones[chip.tone] || tones.new;
  const big = size === 'md';

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingVertical: big ? 8 : 3,
          paddingHorizontal: big ? 16 : 8,
          borderRadius: big ? 999 : 12,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Txt style={{ fontSize: big ? 15 : 10, fontWeight: '700', color: ink }}>{chip.label}</Txt>
    </View>
  );
}

/**
 * Метка «Экстренная» (§6). Отдельно от статуса, а не вместо него: срочность не отменяет
 * того, что заявка новая или уже в работе, и подменять статус ею значило бы скрыть,
 * дошла ли она до исполнителя.
 */
export function EmergencyTag({ style }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          alignSelf: 'flex-start',
          paddingVertical: 3,
          paddingHorizontal: 8,
          borderRadius: 12,
          backgroundColor: c.srUrgentTint,
        },
        style,
      ]}
    >
      <Icon name="zap" size={10} color={c.srUrgentInk} strokeWidth={2.4} />
      <Txt style={{ fontSize: 10, fontWeight: '700', color: c.srUrgentInk }}>Экстренная</Txt>
    </View>
  );
}

/** «Вы автор» / «Вы исполнитель» — контекст сотрудника на строке списка (§5). */
export function ContextTag({ label, style }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingVertical: 3,
          paddingHorizontal: 8,
          borderRadius: 12,
          backgroundColor: c.srNewTint,
        },
        style,
      ]}
    >
      <Txt style={{ fontSize: 10, fontWeight: '700', color: c.srNewInk }}>{label}</Txt>
    </View>
  );
}

/** Строка «иконка + название службы» — она же в карточке списка и в детали. */
export function ServiceTypeLine({ serviceType, size = 14 }) {
  const { c } = useTheme();
  const meta = serviceTypeMeta(serviceType);
  if (!meta) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={meta.icon} size={size} color={c.ink2} strokeWidth={2} />
      <Txt style={{ fontSize: size, fontWeight: '600', color: c.ink2 }}>{meta.label}</Txt>
    </View>
  );
}

/**
 * Карточка списка (Figma `card-№2185`): номер и статус, служба, местоположение, начало
 * описания и, если снимок есть, его миниатюра. Нижняя строка — исполнитель и дата.
 *
 * Имя исполнителя приходит той же выдачей (`assignedToName`), а не добирается запросом
 * на строку: у заявки без исполнителя левая половина нижней строки просто пуста — так
 * же, как у отменённой в макете.
 */
export function ServiceRequestCard({ request, headers, accountId, onPress }) {
  const { c } = useTheme();
  const photo = request.photos?.[0] ?? null;
  const place = locationLine(request);
  const executor = assigneeName(request);
  const extraPhotos = Math.max(0, (request.photos?.length ?? 0) - 1);
  const context = viewerContext(request, accountId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Открыть заявку ${request.requestNumber ?? ''}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? c.bg2 : c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        padding: 12,
        gap: 8,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.ink3 }}>
          {request.requestNumber}
        </Txt>
        {request.emergency ? <EmergencyTag /> : null}
        <StatusChip status={request.status} />
      </View>

      {/* §5: одна карточка на заявку, где сотрудник и автор, и исполнитель — подпись
          говорит, с какой стороны он к ней причастен. */}
      {context ? <ContextTag label={context} /> : null}

      <ServiceTypeLine serviceType={request.serviceType} />

      {place ? (
        <Txt style={{ fontSize: 14, fontWeight: '400', color: c.ink3 }} numberOfLines={1}>
          {place}
        </Txt>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt style={{ flex: 1, fontSize: 13, fontWeight: '400', color: c.ink }} numberOfLines={2}>
          {request.description}
        </Txt>
        {photo ? (
          <View>
            <Image
              source={{ uri: serviceRequestFiles.photo(request.id, photo.id), headers }}
              style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: c.bg2 }}
            />
            {/* «+2» вместо второй и третьей миниатюры (SERVICE-DESIGN-001 §3): в строке
                списка на них нет места, но знать, что снимков больше одного, нужно —
                иначе фотография результата выглядела бы единственной. */}
            {extraPhotos > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderTopLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  backgroundColor: 'rgba(15,23,42,0.72)',
                }}
              >
                <Txt style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                  +{extraPhotos}
                </Txt>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt style={{ flex: 1, fontSize: 11, fontWeight: '400', color: c.ink3 }} numberOfLines={1}>
          {executor ? `Исполнитель: ${executor}` : ' '}
        </Txt>
        <Txt style={{ fontSize: 11, fontWeight: '400', color: c.ink3 }}>
          {shortDate(eventAt(request))}
        </Txt>
      </View>
    </Pressable>
  );
}

/** Пилюли «Мои заявки / История» на серой дорожке (Figma `segmented-toggle`). */
export function SectionTabs({ value, onChange, tabs }) {
  const { c } = useTheme();
  // Три подписи вместо двух не влезают тем же кеглем: у исполнителя добавляется «Общая
  // очередь», и на 390 точках строка иначе обрезается посередине слова.
  const dense = tabs.length > 2;
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: c.border, borderRadius: 8, padding: 3 }}
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
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 6,
              paddingHorizontal: 2,
              borderRadius: 6,
              backgroundColor: selected ? c.green : 'transparent',
            }}
          >
            <Txt
              numberOfLines={1}
              style={{
                fontSize: dense ? 12 : 13,
                fontWeight: selected ? '700' : '500',
                color: selected ? '#fff' : c.ink2,
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

/** Плавающая кнопка «Создать заявку» (Figma `fab`). */
export function CreateFab({ onPress, bottom }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 16,
        bottom,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        backgroundColor: c.green,
        shadowColor: '#0F172A',
        shadowOpacity: 0.16,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Icon name="plus" size={18} color="#fff" strokeWidth={2.4} />
      <Txt style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Создать заявку</Txt>
    </Pressable>
  );
}

/**
 * Плашка исхода действия (Figma «Заявка успешно создана», «Заявка возвращена в работу»,
 * «Не удалось создать заявку»).
 *
 * Одна форма на удачу и на отказ, потому что в макете она одна и та же — различается
 * только цвет. С крестиком, а не с таймером: человек только что сделал то, о чём она
 * сообщает, и решать, дочитал он или нет, должен он сам.
 */
export function NoticeBanner({ children, tone = 'success', onClose }) {
  const { c } = useTheme();
  const tones = {
    success: [c.successSoft, c.success],
    error: [c.redSoft, c.red],
  };
  const [bg, ink] = tones[tone] || tones.success;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: bg,
      }}
    >
      <Txt style={{ flex: 1, fontSize: 15, fontWeight: '500', color: ink }}>{children}</Txt>
      {onClose ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Скрыть" onPress={onClose}>
          <Icon name="x" size={16} color={ink} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Пустой раздел и ошибка загрузки (Figma «Мои заявки — пустой / ошибка»).
 *
 * Свой, а не общий {@link StateView}: в разделе заявок круг крупнее, а «Повторить» —
 * оранжевая пилюля с контуром, тогда как общий компонент рисует навy-кнопку во всю
 * ширину. Менять общий значило бы переверстать этим макетом все остальные экраны.
 */
export function ServiceStateView({ icon, tone = 'neutral', title, subtitle, actionLabel, onAction }) {
  const { c } = useTheme();
  const tones = {
    neutral: [c.bg2, c.ink3],
    error: [c.redSoft, c.red],
  };
  const [bg, ink] = tones[tone] || tones.neutral;

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, gap: 16 }}>
      <View
        style={{
          width: 150,
          height: 150,
          borderRadius: 75,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
        }}
      >
        <Icon name={icon} size={56} color={ink} strokeWidth={1.6} />
      </View>
      <View style={{ gap: 8 }}>
        <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink, textAlign: 'center' }}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt style={{ fontSize: 15, color: c.ink3, textAlign: 'center', lineHeight: 21 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => ({
            paddingVertical: 12,
            paddingHorizontal: 28,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: c.green,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Txt style={{ fontSize: 15, fontWeight: '700', color: c.green }}>{actionLabel}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Подтверждение необратимого действия (Figma «Удалить заявку»).
 *
 * Шит снизу, а не диалог по центру: так нарисовано, и так же спрашивают согласие
 * остальные шиты раздела. Промах мимо шита его закрывает — отказ от удаления должен
 * даваться легче, чем само удаление.
 */
export function ConfirmSheet({
  visible, title, message, confirmLabel, cancelLabel = 'Отмена', busy, onConfirm, onCancel,
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }} onPress={onCancel} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(24, insets.bottom + 12),
            gap: 16,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong }} />
          </View>
          <View style={{ gap: 10 }}>
            <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>{title}</Txt>
            {message ? (
              <Txt style={{ fontSize: 15, lineHeight: 22, color: c.ink2 }}>{message}</Txt>
            ) : null}
          </View>
          <SheetButton tone="danger" busy={busy} onPress={onConfirm}>{confirmLabel}</SheetButton>
          <SheetButton tone="outline" onPress={busy ? undefined : onCancel}>{cancelLabel}</SheetButton>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Действие с обязательной причиной (Figma «Вернуть в работу»).
 *
 * Отдельно от {@link ConfirmSheet}: там вопрос «точно?», а здесь обязательный текст, и
 * кнопка не включается, пока его не написали, — §11 требует причину, и узнать о её
 * отсутствии от сервера было бы поздно.
 */
export function ReasonSheet({
  visible, title, label, placeholder, submitLabel, busy, error, onSubmit, onClose,
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = React.useState('');

  const submit = async () => {
    if (await onSubmit(reason.trim())) setReason('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(24, insets.bottom + 12),
            gap: 14,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong }} />
          </View>
          <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>{title}</Txt>

          <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>
            {label}
            <Txt style={{ color: c.red }}> *</Txt>
          </Txt>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={placeholder}
            placeholderTextColor={c.ink3}
            multiline
            maxLength={1000}
            style={{
              minHeight: 130,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 14,
              paddingTop: 14,
              fontSize: 16,
              color: c.ink,
              backgroundColor: c.surface2,
              textAlignVertical: 'top',
            }}
          />

          {error ? <Txt style={{ fontSize: 13, color: c.red }}>{error}</Txt> : null}

          <SheetButton
            tone="primary"
            busy={busy}
            disabled={reason.trim().length === 0}
            onPress={submit}
          >
            {submitLabel}
          </SheetButton>
          <SheetButton tone="ghost" onPress={busy ? undefined : onClose}>Отмена</SheetButton>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Кнопка внутри шита. Выключенная — свой серый, а не полупрозрачная включённая:
 * приглушённый оранжевый остаётся оранжевым и продолжает звать нажать.
 */
function SheetButton({ children, tone = 'primary', busy, disabled, onPress }) {
  const { c } = useTheme();
  const off = disabled || busy;
  const tones = {
    primary: { bg: off ? c.border : c.green, ink: off ? c.ink3 : '#fff', border: 'transparent' },
    danger: { bg: off ? c.border : c.red, ink: off ? c.ink3 : '#fff', border: 'transparent' },
    outline: { bg: c.surface, ink: c.ink, border: c.border },
    ghost: { bg: 'transparent', ink: c.ink2, border: 'transparent' },
  };
  const t = tones[tone] || tones.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off) }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: 12,
        borderWidth: t.border === 'transparent' ? 0 : 1,
        borderColor: t.border,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={tone === 'outline' || tone === 'ghost' ? c.ink2 : '#fff'} />
      ) : (
        <Txt style={{ fontSize: 16, fontWeight: '700', color: t.ink }}>{children}</Txt>
      )}
    </Pressable>
  );
}

/**
 * Выполнение заявки (SERVICE-FE-003 §7).
 *
 * Отличается от {@link ReasonSheet} тем, что обязательно не поле, а сам факт результата:
 * §7 разрешает отправить только текст, только снимки или и то и другое. Поэтому кнопка
 * включается, когда есть хоть что-то, — правило записано здесь один раз, а не собрано
 * из двух отдельных проверок на экране.
 */
export function CompleteSheet({
  visible, busy, error, photos, onPickCamera, onPickLibrary, onRemovePhoto, onSubmit, onClose,
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [comment, setComment] = React.useState('');

  const submit = async () => {
    if (await onSubmit(comment.trim())) setComment('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }} onPress={onClose} />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(24, insets.bottom + 12),
            gap: 14,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong }} />
          </View>
          <Txt style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>Выполнить заявку</Txt>
          <Txt style={{ fontSize: 13, color: c.ink2 }}>
            Опишите результат, приложите фото — или сделайте и то, и другое.
          </Txt>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Что было сделано"
            placeholderTextColor={c.ink3}
            multiline
            maxLength={1000}
            style={{
              minHeight: 110,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 14,
              paddingTop: 14,
              fontSize: 16,
              color: c.ink,
              backgroundColor: c.surface2,
              textAlignVertical: 'top',
            }}
          />

          <PhotoRow
            photos={photos}
            onCamera={onPickCamera}
            onLibrary={onPickLibrary}
            onRemove={onRemovePhoto}
          />

          {error ? <Txt style={{ fontSize: 13, color: c.red }}>{error}</Txt> : null}

          <SheetButton
            tone="primary"
            busy={busy}
            disabled={comment.trim().length === 0 && photos.length === 0}
            onPress={submit}
          >
            Выполнить
          </SheetButton>
          <SheetButton tone="ghost" onPress={busy ? undefined : onClose}>Отмена</SheetButton>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Полоса снимков результата: превью, удаление до отправки и две кнопки источника (§7). */
function PhotoRow({ photos, onCamera, onLibrary, onRemove }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((photo, index) => (
          <View key={`${photo.uri}-${index}`}>
            <Image
              source={{ uri: photo.uri }}
              style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: c.bg2 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Убрать фотографию"
              onPress={() => onRemove(index)}
              style={{
                position: 'absolute',
                top: -7,
                right: -7,
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.ink,
              }}
            >
              <Icon name="x" size={11} color="#fff" strokeWidth={3} />
            </Pressable>
          </View>
        ))}
      </View>

      {photos.length < MAX_PHOTOS ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SourceButton icon="camera" label="Камера" onPress={onCamera} />
          <SourceButton icon="upload" label="Галерея" onPress={onLibrary} />
        </View>
      ) : null}

      <Txt style={{ fontSize: 12, color: c.ink3 }}>
        До {MAX_PHOTOS} фото, JPG, PNG или HEIC, не больше 10 МБ каждое.
      </Txt>
    </View>
  );
}

function SourceButton({ icon, label, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: c.blue,
        backgroundColor: c.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={16} color={c.blue} strokeWidth={2} />
      <Txt style={{ fontSize: 14, fontWeight: '700', color: c.blue }}>{label}</Txt>
    </Pressable>
  );
}
