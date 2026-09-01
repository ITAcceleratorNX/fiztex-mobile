import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, Image, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { useAuth } from '@features/auth/AuthContext';
import { authHeaders } from '@shared/api/upload';
import { serviceRequestFiles } from '@shared/api/serviceRequestsApi';
import {
  assigneeName,
  canCancel,
  canClaim,
  canExecute,
  canReturnCompleted,
  claimErrorText,
  historyEventLabel,
  locationLine,
  otherServiceType,
  returnWindowLeft,
  serviceTypeMeta,
  stamp,
} from '@shared/api/serviceRequestsMap';
import { useMyProfile } from '@shared/hooks/useProfile';
import { useServiceRequest, useServiceRequestAction } from '@shared/hooks/useServiceRequests';
import {
  CompleteSheet, ConfirmSheet, NoticeBanner, ReasonSheet, ServiceHeader, ServiceTypeLine,
  StatusChip,
} from './components';
import { pickFromCamera, pickFromLibrary } from './photos';
import { ServiceCardError, ServiceCardMissing, ServiceCardSkeleton } from './ServiceStates';

/**
 * Карточка заявки глазами автора (ТЗ SERVICE-FE-002 §8–§12; Figma «Новая заявка —
 * Детальная стр», «Заявка в работе», «Заявка выполнена», «Заявка отменена»).
 *
 * Один экран на все четыре статуса, а не четыре: состав данных у них общий, различаются
 * только строки, которых у заявки ещё не было, и действия внизу — а различает их статус.
 *
 * Экран ничего не решает за бэкенд. «Удалить» и «Вернуть в работу» он прячет по тем же
 * условиям, по которым сервер откажет, — но именно прячет, а не разрешает: результат
 * действия всегда берётся из ответа, включая новый статус и нового исполнителя.
 */
export function ServiceRequestCardScreen({ nav, payload }) {
  const requestId = payload?.requestId;
  const { c } = useTheme();
  const { token, role } = useAuth();
  const insets = useSafeAreaInsets();
  const { profile } = useMyProfile();
  const { loading, error, request, history, reload } = useServiceRequest(requestId);
  const action = useServiceRequestAction();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [returning, setReturning] = useState(false);
  const [zoomed, setZoomed] = useState(null);
  // Исполнительские шиты (§6): у каждого своя обязательная часть, поэтому и состояние
  // раздельное — общий «шит с причиной» пришлось бы каждый раз спрашивать, чей он.
  const [sheet, setSheet] = useState(null); // 'return' | 'transfer' | 'complete'
  const [resultPhotos, setResultPhotos] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  // Плашка удачи приходит из формы создания (§14) и ставится сама после возврата в
  // работу — оба раза человек уже на этой карточке и ждёт подтверждения, что вышло.
  const [notice, setNotice] = useState(payload?.notice ?? null);

  const headers = useMemo(() => authHeaders(token), [token]);
  const accountId = profile?.accountId ?? null;

  const onDelete = useCallback(async () => {
    const updated = await action.cancel(requestId);
    if (!updated) return;
    setConfirmDelete(false);
    // §10: после отмены заявка исчезает из «Моих заявок» и появляется в «Истории».
    // Возврат в список, а не показ той же карточки с новым статусом: человек нажал
    // «удалить», и остаться на ней значило бы ответить не на то, что он просил.
    nav.back();
  }, [action, requestId, nav]);

  /** §4: взятие из очереди. Отказ показываем сообщением сервера — оно точнее общего. */
  const onClaim = useCallback(async () => {
    const updated = await action.claim(requestId);
    if (!updated) return;
    setNotice('Заявка взята в работу');
    await reload(true);
  }, [action, requestId, reload]);

  /** §6: вернуть в очередь своей службы. Причина обязательна, фотографий здесь нет. */
  const onReturnToQueue = useCallback(async (reason) => {
    const updated = await action.returnToQueue(requestId, reason);
    if (!updated) return false;
    setSheet(null);
    // §6: заявка уходит из активного списка бывшего исполнителя — оставаться на её
    // карточке незачем, доступа к ней у него больше нет.
    nav.back();
    return true;
  }, [action, requestId, nav]);

  /** §6: передача другой службе. Служб ровно две, поэтому цель однозначна. */
  const onTransfer = useCallback(async (reason) => {
    const target = otherServiceType(request?.serviceType);
    const updated = await action.transfer(requestId, target, reason);
    if (!updated) return false;
    setSheet(null);
    nav.back();
    return true;
  }, [action, requestId, request?.serviceType, nav]);

  /** §7: выполнение — текст результата и/или до трёх снимков. */
  const onComplete = useCallback(async (comment) => {
    const updated = await action.complete(requestId, { comment, photos: resultPhotos });
    if (!updated) return false;
    setSheet(null);
    setResultPhotos([]);
    setNotice('Заявка выполнена');
    await reload(true);
    return true;
  }, [action, requestId, resultPhotos, reload]);

  const addResultPhoto = useCallback(async (pick) => {
    setPhotoError(null);
    const result = await pick(resultPhotos.length);
    if (result.photos.length > 0) setResultPhotos((prev) => [...prev, ...result.photos]);
    if (result.error) setPhotoError(result.error);
  }, [resultPhotos.length]);

  const onReturn = useCallback(async (reason) => {
    const updated = await action.reopen(requestId, reason);
    if (!updated) return false;
    setReturning(false);
    setNotice('Заявка возвращена в работу');
    // §11: показываем фактическое состояние, которое вернул бэкенд, — статус и
    // назначение после возврата решает он.
    await reload(true);
    return true;
  }, [action, requestId, reload]);

  if (loading) {
    return (
      <Screen>
        <ServiceHeader title="Заявка" onBack={nav.back} />
        <ServiceCardSkeleton />
      </Screen>
    );
  }

  if (error === 'missing' || error === 'forbidden' || requestId == null) {
    return (
      <Screen scroll={false}>
        <ServiceHeader title="Заявка" onBack={nav.back} />
        <ServiceCardMissing onBack={nav.back} />
      </Screen>
    );
  }

  if (error || !request) {
    return (
      <Screen scroll={false}>
        <ServiceHeader title="Заявка" onBack={nav.back} />
        <ServiceCardError onRetry={() => reload()} />
      </Screen>
    );
  }

  const executor = assigneeName(request, history);
  const deletable = canCancel(request, accountId);
  const returnable = canReturnCompleted(request, accountId);
  const claimable = canClaim(request, role);
  const executable = canExecute(request, accountId);
  const transferTitle = `Передать в «${serviceTypeMeta(otherServiceType(request.serviceType))?.label ?? ''}»`;
  const windowLeft = returnable ? returnWindowLeft(request) : null;
  // §8: «Фото» — это снимки создания, а не все снимки заявки. `request.photos` содержит
  // и фотографии результата, которые приложил исполнитель, — их место в ленте, под
  // событием «Заявка выполнена», иначе они выглядели бы как то, что снял сам автор.
  // Если лента не догрузилась, показываем плоский список: лучше все, чем ни одной.
  const created = history.find((event) => event.action === 'CREATED');
  const photos = created ? (created.photos ?? []) : (request.photos ?? []);

  return (
    <Screen scroll={false}>
      <ServiceHeader title={`Заявка ${request.requestNumber || ''}`.trim()} onBack={nav.back} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: insets.bottom + 40,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {notice ? (
          <NoticeBanner onClose={() => setNotice(null)}>{notice}</NoticeBanner>
        ) : null}

        {action.errorText ? (
          <NoticeBanner tone="error" onClose={action.clearError}>{action.errorText}</NoticeBanner>
        ) : null}

        {/* Статус слева, служба справа: одна строка отвечает и «что с заявкой», и «чья
            она» (Figma). «Экстренная» — признак поверх статуса, а не пятый статус (§6). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <StatusChip status={request.status} size="md" />
          {request.emergency ? <UrgentPill /> : null}
          <View style={{ flex: 1 }} />
          <ServiceTypeLine serviceType={request.serviceType} size={16} />
        </View>

        {/* §8: строк ровно столько, сколько с заявкой уже произошло — «время выполнения: —»
            сообщало бы о ней то, чего не было. Исполнитель — исключение: его строка стоит
            всегда, потому что «не назначен» это ответ, а не пустота (Figma). */}
        <Card>
          {[
            { label: 'Номер', value: request.requestNumber },
            { label: 'Дата создания', value: stamp(request.createdAt) },
            { label: 'Автор', value: request.authorName },
            { label: 'Местоположение', value: locationLine(request) },
            { label: 'Исполнитель', value: executor || 'Не назначен', muted: !executor },
            { label: 'Взято в работу', value: stamp(request.claimedAt) },
            { label: 'Выполнено', value: stamp(request.completedAt), tone: 'success' },
            { label: 'Отменена', value: stamp(request.cancelledAt), tone: 'danger' },
          ].filter((row) => row.value).map((row, index, rows) => (
            <InfoRow key={row.label} {...row} last={index === rows.length - 1} />
          ))}
        </Card>

        <View style={{ gap: 10 }}>
          <SectionLabel>Описание</SectionLabel>
          <Card padded>
            <Txt style={{ fontSize: 16, lineHeight: 24, color: c.ink2 }}>{request.description}</Txt>
          </Card>
        </View>

        {photos.length > 0 ? (
          <View style={{ gap: 10 }}>
            <SectionLabel>Фото</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть ${photo.fileName || 'фотографию'}`}
                  onPress={() => setZoomed({ ...photo, requestId: request.id })}
                >
                  <Image
                    source={{ uri: serviceRequestFiles.photo(request.id, photo.id), headers }}
                    style={{ width: 78, height: 74, borderRadius: 8, backgroundColor: c.bg2 }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* §4: свободную заявку своей службы можно открыть целиком и взять отсюда же. */}
      {claimable ? (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <Divider />
          <ActionButton onPress={onClaim} disabled={action.busy}>
            {action.busy ? 'Берём…' : 'Взять в работу'}
          </ActionButton>
        </View>
      ) : null}

      {/* §6: три действия текущего исполнителя. Условие допуска у них общее — бэкенд
          задаёт им одну и ту же возможность, — поэтому и блок один. */}
      {executable ? (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          <Divider />
          <ActionButton onPress={() => setSheet('complete')} disabled={action.busy}>
            Выполнить
          </ActionButton>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ActionButton tone="outline" onPress={() => setSheet('return')} disabled={action.busy}>
              Вернуть в очередь
            </ActionButton>
            <ActionButton tone="outline" onPress={() => setSheet('transfer')} disabled={action.busy}>
              Передать
            </ActionButton>
          </View>
        </View>
      ) : null}

      {/* §9: действия автора задаёт статус. У «В работе» и «Отменена» их нет — только просмотр. */}
        {deletable ? (
          <>
            <Divider />
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmDelete(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon name="trash" size={20} color={c.red} strokeWidth={2} />
              <Txt style={{ fontSize: 17, fontWeight: '600', color: c.red }}>Удалить заявку</Txt>
            </Pressable>
            <Divider />
          </>
        ) : null}

        {returnable ? (
          <View style={{ gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReturning(true)}
              style={({ pressed }) => ({
                height: 56,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: c.green,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Txt style={{ fontSize: 16, fontWeight: '700', color: c.green }}>Вернуть в работу</Txt>
            </Pressable>
            {/* §11: окно закрывается через 48 часов, и знать, сколько осталось, важнее,
                чем узнать об отказе после нажатия. */}
            {windowLeft ? (
              <Txt style={{ fontSize: 13, color: c.ink3, textAlign: 'center' }}>
                {windowLeft} на возврат
              </Txt>
            ) : null}
          </View>
        ) : null}

        <HistoryFeed
          history={history}
          requestId={request.id}
          headers={headers}
          onZoom={setZoomed}
        />
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        title={`Удалить заявку ${request.requestNumber || ''}?`.replace(' ?', '?')}
        message="Заявка будет перемещена в историю со статусом «Отменена». Это действие нельзя отменить."
        confirmLabel="Удалить"
        busy={action.busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ReasonSheet
        visible={sheet === 'return'}
        title="Вернуть заявку в очередь"
        label="Причина"
        placeholder="Почему заявка возвращается в очередь?"
        submitLabel="Вернуть в очередь"
        busy={action.busy}
        error={action.errorText}
        onSubmit={onReturnToQueue}
        onClose={() => {
          action.clearError();
          setSheet(null);
        }}
      />

      <ReasonSheet
        visible={sheet === 'transfer'}
        title={transferTitle}
        label="Причина"
        placeholder="Почему заявка передаётся другой службе?"
        submitLabel="Передать"
        busy={action.busy}
        error={action.errorText}
        onSubmit={onTransfer}
        onClose={() => {
          action.clearError();
          setSheet(null);
        }}
      />

      <CompleteSheet
        visible={sheet === 'complete'}
        busy={action.busy}
        error={photoError || action.errorText}
        photos={resultPhotos}
        onPickCamera={() => addResultPhoto(pickFromCamera)}
        onPickLibrary={() => addResultPhoto(pickFromLibrary)}
        onRemovePhoto={(index) => setResultPhotos((prev) => prev.filter((_, i) => i !== index))}
        onSubmit={onComplete}
        onClose={() => {
          action.clearError();
          setPhotoError(null);
          setSheet(null);
        }}
      />

      <ReasonSheet
        visible={returning}
        title="Вернуть заявку в работу"
        label="Комментарий"
        placeholder="Что нужно исправить?"
        submitLabel="Вернуть в работу"
        busy={action.busy}
        error={action.errorText}
        onSubmit={onReturn}
        onClose={() => {
          action.clearError();
          setReturning(false);
        }}
      />

      <PhotoZoom photo={zoomed} headers={headers} onClose={() => setZoomed(null)} />
    </Screen>
  );
}

/**
 * Лента событий (§12) — хронология, а не переписка: у события есть название, кто и когда,
 * причина, если бэкенд её вернул, и фотографии результата. Поля ввода здесь нет и не
 * будет: §13 прямо исключает чат, свободные комментарии и добавление фото через ленту.
 *
 * Каждое событие — своя карточка со значком: выполнение зелёное, отмена красная,
 * остальное нейтральное. Цвет здесь не украшение — по нему видно, чем кончилось, не
 * читая последнюю строку.
 */
function HistoryFeed({ history, requestId, headers, onZoom }) {
  const { c } = useTheme();
  if (history.length === 0) return null;

  const badges = {
    COMPLETED: { icon: 'check', bg: c.srDoneTint, ink: c.srDoneInk },
    CANCELLED: { icon: 'x', bg: c.srCancelledTint, ink: c.srCancelledInk },
  };

  return (
    <View style={{ gap: 10 }}>
      <SectionLabel>Лента</SectionLabel>
      {history.map((event) => {
        const badge = badges[event.action] || { icon: 'info', bg: c.bg2, ink: c.ink3 };
        return (
          <Card key={event.id} padded>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: badge.bg,
                }}
              >
                <Icon name={badge.icon} size={16} color={badge.ink} strokeWidth={2.4} />
              </View>

              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Txt style={{ fontSize: 16, fontWeight: '600', color: c.ink }}>
                  {historyEventLabel(event.action)}
                </Txt>
                {event.assigneeAfterName ? (
                  <Txt style={{ fontSize: 14, color: c.ink2 }}>
                    Исполнитель: {event.assigneeAfterName}
                  </Txt>
                ) : null}
                {/* У события создания `comment` — это описание заявки, и оно уже стоит
                    выше отдельным блоком. Повторять его в ленте значило бы показать
                    один и тот же текст дважды; в макете под «Заявка создана» его нет. */}
                {event.comment && event.action !== 'CREATED' ? (
                  <Txt style={{ fontSize: 14, lineHeight: 20, color: c.ink2 }}>{event.comment}</Txt>
                ) : null}
                <Txt style={{ fontSize: 13, color: c.ink3 }}>
                  {[event.actorName, stamp(event.createdAt)].filter(Boolean).join(' · ')}
                </Txt>
                {event.photos?.length ? (
                  <View style={{ flexDirection: 'row', gap: 6, paddingTop: 4 }}>
                    {event.photos.map((photo) => (
                      <Pressable
                        key={photo.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Открыть ${photo.fileName || 'фотографию'}`}
                        onPress={() => onZoom({ ...photo, requestId })}
                      >
                        <Image
                          source={{ uri: serviceRequestFiles.photo(requestId, photo.id), headers }}
                          style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: c.bg2 }}
                        />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/**
 * Увеличение снимка — наложением внутри экрана, а не новой вкладкой: заявка остаётся
 * открытой, и возврат к ней не требует ничего искать.
 */
function PhotoZoom({ photo, headers, onClose }) {
  return (
    <Modal visible={Boolean(photo)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.88)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {photo ? (
          <Image
            source={{ uri: serviceRequestFiles.photo(photo.requestId, photo.id), headers }}
            resizeMode="contain"
            style={{ width: '100%', height: '80%' }}
          />
        ) : null}
        <Txt style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          Нажмите, чтобы закрыть
        </Txt>
      </Pressable>
    </Modal>
  );
}

/** Метка «Экстренная» в шапке карточки — крупнее списочной, вровень с чипом статуса. */
function UrgentPill() {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: c.srUrgentTint,
      }}
    >
      <Icon name="zap" size={13} color={c.srUrgentInk} strokeWidth={2.4} />
      <Txt style={{ fontSize: 13, fontWeight: '700', color: c.srUrgentInk }}>Экстренная</Txt>
    </View>
  );
}

function Card({ children, padded }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: padded ? 14 : 2,
      }}
    >
      {children}
    </View>
  );
}

function InfoRow({ label, value, tone, muted, last }) {
  const { c } = useTheme();
  const inks = { success: c.srDoneInk, danger: c.srCancelledInk };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.bg2,
      }}
    >
      <Txt style={{ fontSize: 15, color: c.ink3 }}>{label}</Txt>
      <Txt
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: muted ? '400' : '700',
          fontStyle: muted ? 'italic' : 'normal',
          color: muted ? c.ink3 : (inks[tone] || c.ink),
          textAlign: 'right',
        }}
      >
        {value}
      </Txt>
    </View>
  );
}

/**
 * Кнопка действия исполнителя. Выключенная — свой серый, а не полупрозрачная включённая:
 * приглушённый оранжевый остаётся оранжевым и продолжает звать нажать.
 */
function ActionButton({ children, onPress, disabled, tone = 'filled' }) {
  const { c } = useTheme();
  const outline = tone === 'outline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        flex: outline ? 1 : undefined,
        height: 52,
        borderRadius: 12,
        borderWidth: outline ? 1.5 : 0,
        borderColor: disabled ? c.border : c.blue,
        backgroundColor: outline ? c.surface : disabled ? c.border : c.green,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Txt
        numberOfLines={1}
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: outline ? (disabled ? c.ink3 : c.blue) : disabled ? c.ink3 : '#fff',
        }}
      >
        {children}
      </Txt>
    </Pressable>
  );
}

function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

function SectionLabel({ children }) {
  const { c } = useTheme();
  return <Txt style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>{children}</Txt>;
}
