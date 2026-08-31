import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TextInput, Pressable, Image, Switch, ActivityIndicator,
  KeyboardAvoidingView, Keyboard, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Screen } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  FIELD_LIMITS,
  MAX_PHOTOS,
  SERVICE_TYPES,
  floorLabel,
  serviceTypeMeta,
} from '@shared/api/serviceRequestsMap';
import { useServiceRequestAction } from '@shared/hooks/useServiceRequests';
import { NoticeBanner, ServiceHeader } from './components';
import { pickFromCamera, pickFromLibrary } from './photos';

/**
 * Создание заявки в два шага (ТЗ SERVICE-FE-002 §6, §7; Figma «Создать заявку шаг 1/2»).
 *
 * Шаги не косметика: на первом человек отвечает, что и где, на втором — описывает и
 * прикладывает снимки. Разделение позволяет спросить обязательное местоположение до
 * того, как он напишет тысячу символов описания, а на втором шаге напомнить ответ
 * первого одной строкой-сводкой.
 *
 * Заявка уходит одним запросом со второго шага: серверного черновика у неё нет, и
 * промежуточное «сохранено» было бы неправдой.
 */
export function ServiceRequestCreateScreen({ nav }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { create, busy, errorText, fields: serverFields, clearError } = useServiceRequestAction();

  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState(null);
  const [buildingText, setBuildingText] = useState('');
  const [floorText, setFloorText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  // Подсветка обязательных полей появляется после того, как поле покинули, а не с
  // первого символа: красное поле, которого ещё не касались, — упрёк за незаконченную
  // форму.
  //
  // Отмечает именно уход из поля, а не нажатие «Далее»: кнопка заблокирована, пока форма
  // неполная, и по ней подсветка не наступила бы никогда — состояние из макета
  // («Кабинет / зона» красный при выключенной кнопке) было бы недостижимо.
  const [touched, setTouched] = useState(false);
  const [blurred, setBlurred] = useState({});
  const keyboardUp = useKeyboardUp();
  const markBlurred = (field) => () => setBlurred((prev) => ({ ...prev, [field]: true }));

  const stepOneValid = Boolean(serviceType)
    && buildingText.trim() && floorText.trim() && locationText.trim();
  const stepTwoValid = description.trim().length > 0;

  const summary = [
    serviceTypeMeta(serviceType)?.label,
    buildingText.trim(),
    floorLabel(floorText.trim()),
    locationText.trim(),
  ].filter(Boolean).join(' · ');

  const goNext = () => {
    setTouched(true);
    if (!stepOneValid) return;
    setTouched(false);
    setBlurred({});
    clearError();
    setStep(2);
  };

  const goBack = () => {
    if (step === 1) return nav.back();
    clearError();
    setTouched(false);
    setBlurred({});
    return setStep(1);
  };

  const addPhotos = useCallback(async (pick) => {
    setPhotoError(null);
    const result = await pick(photos.length);
    if (result.photos.length > 0) setPhotos((prev) => [...prev, ...result.photos]);
    if (result.error) setPhotoError(result.error);
  }, [photos.length]);

  const submit = useCallback(async () => {
    setTouched(true);
    if (!stepTwoValid) return;
    const created = await create({
      serviceType,
      emergency,
      buildingText: buildingText.trim(),
      floorText: floorText.trim(),
      locationText: locationText.trim(),
      description: description.trim(),
      photos,
    });
    if (!created) return;
    // Открывается карточка созданной заявки с плашкой удачи (Figma «Заявка успешно
    // создана»): человек видит номер, который ему теперь называть.
    //
    // `replace`, а не переход: форма не должна остаться в стеке под карточкой — иначе
    // «назад» вернуло бы к полям уже созданной заявки.
    nav.replace('service-request', { requestId: created.id, notice: 'Заявка успешно создана' });
  }, [stepTwoValid, create, serviceType, emergency, buildingText, floorText, locationText,
      description, photos, nav]);

  const errorFor = (field, value, message) => serverFields[field]
    || ((touched || blurred[field]) && !value.trim() ? message : null);

  // Правка поля снимает отказ сервера по нему: подсветка, которая держится, пока человек
  // исправляет ровно то, на что ему указали, читается как «всё ещё неверно».
  const edit = (setter) => (value) => {
    if (errorText) clearError();
    setter(value);
  };

  return (
    <Screen scroll={false}>
      <ServiceHeader title="Создать заявку" step={`Шаг ${step} из 2`} onBack={goBack} />

      {/*
        `keyboardVerticalOffset` — ноль, а не высота шапки: при `behavior="padding"`
        отступ считается как «низ этого блока минус верх клавиатуры плюс offset», а сам
        блок начинается уже под шапкой и меряется в координатах окна. Прежние 90 просто
        добавлялись сверху нужного — кнопка уезжала выше клавиатуры, и между ними
        оставалась пустая полоса.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Отказ, не привязанный к полю: сеть, конфликт, что-то ещё. Полевые ошибки
              показывают сами поля — дублировать их плашкой значило бы сказать дважды. */}
          {errorText && Object.keys(serverFields).length === 0 ? (
            <NoticeBanner tone="error" onClose={clearError}>{errorText}</NoticeBanner>
          ) : null}

          {step === 1 ? (
            <>
              <View style={{ gap: 8 }}>
                <FieldLabel required>Тип заявки</FieldLabel>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {SERVICE_TYPES.map((type) => (
                    <TypeCard
                      key={type.value}
                      type={type}
                      selected={type.value === serviceType}
                      onPress={() => edit(setServiceType)(type.value)}
                    />
                  ))}
                </View>
                <FieldError>
                  {touched && !serviceType ? 'Выберите тип заявки' : serverFields.serviceType}
                </FieldError>
              </View>

              <Field
                label="Корпус"
                value={buildingText}
                onChangeText={edit(setBuildingText)}
                onBlur={markBlurred('buildingText')}
                placeholder="Введите корпус"
                maxLength={FIELD_LIMITS.buildingText}
                error={errorFor('buildingText', buildingText, 'Заполните это поле')}
              />

              <Field
                label="Этаж"
                value={floorText}
                onChangeText={edit(setFloorText)}
                onBlur={markBlurred('floorText')}
                placeholder="Введите этаж"
                maxLength={FIELD_LIMITS.floorText}
                error={errorFor('floorText', floorText, 'Заполните это поле')}
              />

              <Field
                label="Кабинет / зона"
                value={locationText}
                onChangeText={edit(setLocationText)}
                onBlur={markBlurred('locationText')}
                placeholder="Введите кабинет или зону"
                maxLength={FIELD_LIMITS.locationText}
                error={errorFor('locationText', locationText, 'Заполните это поле')}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Txt style={{ flex: 1, fontSize: 16, fontWeight: '600', color: c.ink }}>
                  Экстренная заявка
                </Txt>
                <Switch
                  value={emergency}
                  onValueChange={setEmergency}
                  trackColor={{ false: c.borderStrong, true: c.green }}
                  thumbColor="#fff"
                  ios_backgroundColor={c.borderStrong}
                />
              </View>
            </>
          ) : (
            <>
              {/* Сводка первого шага (Figma `step2` — серая плашка над описанием): что
                  именно описывают, видно, не возвращаясь назад. */}
              <View
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: c.bg2,
                }}
              >
                <Txt style={{ fontSize: 15, color: c.ink2 }}>{summary}</Txt>
              </View>

              <Field
                label="Описание"
                value={description}
                onChangeText={edit(setDescription)}
                onBlur={markBlurred('description')}
                placeholder="Опишите проблему подробнее..."
                maxLength={FIELD_LIMITS.description}
                error={errorFor('description', description, 'Заполните это поле')}
                multiline
              />

              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>Фото</Txt>
                  <Txt style={{ fontSize: 14, color: c.ink3 }}>до {MAX_PHOTOS} фото</Txt>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {photos.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: c.bg2 }}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Убрать фотографию"
                        onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
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

                  {photos.length < MAX_PHOTOS ? (
                    <AddPhotoTile
                      onCamera={() => addPhotos(pickFromCamera)}
                      onLibrary={() => addPhotos(pickFromLibrary)}
                    />
                  ) : null}
                </View>

                <FieldError>{photoError || serverFields.photos}</FieldError>

                <Txt style={{ fontSize: 13, color: c.ink3 }}>JPG, PNG, HEIC · до 10 МБ</Txt>
              </View>
            </>
          )}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 10,
            // Пока клавиатура открыта, домашней полоски под кнопкой нет — она под
            // клавиатурой, и её отступ добавил бы к дыре ещё сантиметр.
            paddingBottom: keyboardUp ? 12 : insets.bottom + 12,
          }}
        >
          {step === 2 ? (
            <SecondaryAction onPress={goBack} disabled={busy}>Назад</SecondaryAction>
          ) : null}
          {step === 1 ? (
            <PrimaryAction onPress={goNext} disabled={!stepOneValid}>Далее</PrimaryAction>
          ) : (
            <PrimaryAction onPress={submit} disabled={!stepTwoValid || busy}>
              {busy ? 'Отправляем…' : 'Создать заявку'}
            </PrimaryAction>
          )}
        </View>
      </KeyboardAvoidingView>

      {busy ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15,23,42,0.2)',
          }}
        >
          <ActivityIndicator color={c.green} size="large" />
        </View>
      ) : null}
    </Screen>
  );
}

/** Открыта ли клавиатура — от этого зависит нижний отступ подвала с кнопками. */
function useKeyboardUp() {
  const [up, setUp] = useState(false);
  useEffect(() => {
    // `WillShow`/`WillHide` на iOS: отступ меняется вместе с анимацией клавиатуры,
    // а не рывком после неё.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(showEvent, () => setUp(true));
    const hidden = Keyboard.addListener(hideEvent, () => setUp(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return up;
}

/**
 * Плитка типа заявки (Figma: выбранная — оранжевый контур, тёплая заливка и галочка
 * в углу). Галочка, а не только цвет: выбор должен читаться и без различения оттенков.
 */
function TypeCard({ type, selected, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 88,
        borderRadius: 12,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? c.green : c.border,
        backgroundColor: selected ? c.greenSoft : c.surface,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Icon name={type.icon} size={22} color={selected ? c.green : c.ink2} strokeWidth={2} />
      <Txt style={{ fontSize: 15, fontWeight: '500', color: selected ? c.green : c.ink }}>
        {type.label}
      </Txt>
      {selected ? (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.green,
            }}
          >
            <Icon name="check" size={12} color="#fff" strokeWidth={3} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Плитка «добавить фото» (Figma: пунктирный квадрат с плюсом).
 *
 * Одна плитка на камеру и галерею, а не две кнопки: §7 требует оба источника, а места
 * под вторую плитку в ряду из трёх снимков нет. Первое нажатие открывает выбор.
 */
function AddPhotoTile({ onCamera, onLibrary }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SourceTile icon="camera" label="Камера" onPress={() => { setOpen(false); onCamera(); }} />
        <SourceTile icon="upload" label="Галерея" onPress={() => { setOpen(false); onLibrary(); }} />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Добавить фото"
      onPress={() => setOpen(true)}
      style={({ pressed }) => ({
        width: 64,
        height: 64,
        borderRadius: 8,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: c.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name="plus" size={20} color={c.ink3} strokeWidth={2} />
    </Pressable>
  );
}

function SourceTile({ icon, label, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 64,
        height: 64,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: c.blue,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={18} color={c.blue} strokeWidth={2} />
      <Txt style={{ fontSize: 11, fontWeight: '600', color: c.blue }}>{label}</Txt>
    </Pressable>
  );
}

function Field({ label, error, multiline, ...props }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <FieldLabel required>{label}</FieldLabel>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={c.ink3}
        style={{
          minHeight: multiline ? 220 : 56,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? c.red : c.border,
          paddingHorizontal: 14,
          paddingTop: multiline ? 14 : 0,
          paddingBottom: multiline ? 14 : 0,
          fontSize: 16,
          color: c.ink,
          backgroundColor: c.surface,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      <FieldError>{error}</FieldError>
    </View>
  );
}

/** Звёздочка у обязательного поля — как в макете: подпись, а не подсказка после отказа. */
function FieldLabel({ children, required }) {
  const { c } = useTheme();
  return (
    <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>
      {children}
      {required ? <Txt style={{ color: c.red }}> *</Txt> : null}
    </Txt>
  );
}

function FieldError({ children }) {
  const { c } = useTheme();
  if (!children) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name="alertTriangle" size={13} color={c.red} strokeWidth={2.2} />
      <Txt style={{ flex: 1, fontSize: 13, color: c.red }}>{children}</Txt>
    </View>
  );
}

/**
 * Выключенная кнопка — свой серый, а не включённая с прозрачностью: полупрозрачный
 * оранжевый остаётся оранжевым и продолжает звать нажать (то же правило, что у
 * `FilledButton` в общих компонентах).
 */
function PrimaryAction({ children, onPress, disabled }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? c.border : c.green,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Txt style={{ fontSize: 16, fontWeight: '700', color: disabled ? c.ink3 : '#fff' }}>
        {children}
      </Txt>
    </Pressable>
  );
}

function SecondaryAction({ children, onPress, disabled }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Txt style={{ fontSize: 16, fontWeight: '600', color: c.ink2 }}>{children}</Txt>
    </Pressable>
  );
}
