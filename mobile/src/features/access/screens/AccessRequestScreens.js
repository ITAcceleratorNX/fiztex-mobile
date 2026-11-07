import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH, REQUEST } from '@shared/theme/tokens';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { TextButton } from '@shared/components/TextButton';
import { ComboField } from '@shared/components/ComboField';
import {
  Avatar, Banner, Card, FieldLabel, OutlineButton, PasswordField, PrimaryButton, TextField,
} from '@shared/components/ui';
import {
  ChoiceCard, FormDivider, FormError, FormPage, FormSectionLabel, Hint, NumberedSteps, Rule, StatusMark,
  StatusTimeline, SummaryCard,
} from '@shared/ui/formParts';
import { accessRequestsApi } from '@shared/api/accessRequestsApi';
import { registerDeviceForAccessRequest } from '@shared/push/registration';
import { PASSWORD_MAX_LENGTH } from '@features/auth/signInModel';
import {
  ROLES, classNameLabel, classOptions, draftPayload, emptyForm, filterClasses, formFromStatus, formPayload,
  hasDraftContent, isRequestGone, missingFields, reviewTimeline, shortName, statusScreen, submitErrorMessage,
  summaryRows, validUntilNote, validateForm,
} from '../accessRequestModel';
import { forgetRequest, readStoredRequest, rememberStage, storeTicket } from '../requestStore';

// Класс ищут по цифре параллели (A2): на iOS сразу цифры, буква — на той же клавиатуре.
const CLASS_KEYBOARD = Platform.select({ ios: 'numbers-and-punctuation', default: 'default' });

const UNREACHABLE = 'Не удалось связаться со школой. Проверьте интернет и попробуйте ещё раз.';

// Заголовок экрана: `done` — итог A5 (28/36), `status` — экраны статуса S2–S6 (26/33); оба 800
// со сжатием, как в макете.
function Title({ children, center = false, done = false, status = false }) {
  const size = status
    ? { fontSize: REQUEST.statusTitleSize, lineHeight: REQUEST.statusTitleLine, letterSpacing: REQUEST.statusTitleTracking }
    : done
      ? { fontSize: REQUEST.doneTitleSize, lineHeight: REQUEST.doneTitleLine, letterSpacing: REQUEST.titleTracking }
      : { fontSize: AUTH.titleSize, lineHeight: AUTH.titleLine, letterSpacing: 0 };
  return (
    <Txt
      accessibilityRole="header"
      style={{
        ...size,
        fontWeight: done || status ? '800' : '700',
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </Txt>
  );
}

function Lead({ children, center = false, gap = 4 }) {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        marginTop: gap,
        fontSize: REQUEST.leadSize,
        lineHeight: REQUEST.leadLine,
        color: c.ink2,
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </Txt>
  );
}

/**
 * A1 «Заявка — кто вы». Учителю и сотрудникам заявка не нужна вовсе: роль заявки бывает только
 * «ученик» или «родитель», аккаунт остальных создаёт администратор.
 */
export function AccessRequestStart({ onBack, onRole, onStatus }) {
  const [stored, setStored] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      readStoredRequest()
        .then((value) => active && setStored(value))
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  const roleCard = (role, icon, tone, title, text) => (
    <ChoiceCard size="lg" icon={icon} tone={tone} title={title} onPress={() => onRole(role)}>
      {text}
    </ChoiceCard>
  );

  return (
    <FormPage
      layout="request"
      onBack={onBack}
      title="Заявка на доступ"
      subtitle={'Администратор школы проверит данные и\u00a0откроет доступ.'}
      footer={<TextButton onPress={onStatus}>Уже отправили? Проверить статус</TextButton>}
    >
      {stored ? (
        <Banner tone="info" icon="info" size="lg">
          {`На этом телефоне уже есть заявка${stored.requestId ? ` № ${stored.requestId}` : ''} — её статус по ссылке внизу.`}
        </Banner>
      ) : null}
      <View style={{ gap: 12 }}>
        {roleCard(ROLES.STUDENT, 'graduationCap', undefined, 'Я ученик', 'Телефон можно не указывать')}
        {roleCard(ROLES.PARENT, 'users', 'orange', 'Я родитель', 'Укажите одного ребёнка — остальных привяжет школа')}
      </View>
      <Banner tone="info" icon="info" size="lg">
        Учителям заявка не нужна — аккаунт создаёт администратор школы.
      </Banner>
    </FormPage>
  );
}

/**
 * A2–A4 и S5: форма заявки ученика или родителя, она же — черновик и исправленная заявка.
 *
 * Черновик сохраняется на сервере, когда человек уходит с формы, не отправив её (ТЗ §4
 * «незавершена»), и только если на телефоне нет заявки, которая уже у школы: иначе новый
 * черновик занял бы её место, и статус поданной стало бы не узнать. Пароль в черновик не уходит.
 *
 * Кнопка не выключается, пока форма неполная: у длинной формы выключенная кнопка не говорит,
 * чего не хватает. Нажатие подсвечивает поля, а отказ сервера `INCOMPLETE` — по его же списку.
 */
export function AccessRequestForm({ role, mode = 'new', prefill, onBack, onSent }) {
  const { c } = useTheme();
  const parent = role === ROLES.PARENT;
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const [form, setForm] = useState(() => emptyForm(role));
  const [showErrors, setShowErrors] = useState(false);
  const [serverMissing, setServerMissing] = useState([]);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;
  const submittedRef = useRef(false);
  const prefilledRef = useRef(false);
  // `undefined` — ещё не прочитано, `null` — заявки на телефоне нет.
  const storedRef = useRef(undefined);

  const loadClasses = useCallback(async () => {
    setCatalogError(null);
    try {
      const response = await accessRequestsApi.classes();
      const options = classOptions(response);
      setCatalog({ yearConfigured: Boolean(response?.yearConfigured), options });
      if (prefill && !prefilledRef.current) {
        prefilledRef.current = true;
        setForm(formFromStatus(prefill, options));
      }
    } catch (e) {
      setCatalogError(e.message || UNREACHABLE);
    }
  }, [prefill]);

  useEffect(() => {
    loadClasses();
    readStoredRequest()
      .then((value) => {
        storedRef.current = value;
      })
      .catch(() => {
        storedRef.current = null;
      });
    return () => {
      if (submittedRef.current || mode === 'resubmit') return;
      const current = formRef.current;
      const stored = storedRef.current;
      if (!hasDraftContent(current) || (stored && stored.stage !== 'DRAFT')) return;
      accessRequestsApi
        .saveDraft(draftPayload(current, stored?.token))
        .then((ticket) => storeTicket(ticket, current.role))
        .catch(() => {});
    };
    // Форма и токен читаются через ref: сохранить нужно последнее состояние, а не первое.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = validateForm(form);
  const fieldError = (key) =>
    (showErrors && check.errors[key]) || (serverMissing.includes(key) ? 'Заполните это поле' : null);

  const set = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setServerMissing((list) => list.filter((item) => item !== key));
  };

  const submit = async () => {
    setShowErrors(true);
    if (!check.ready || sending) return;
    setSending(true);
    setError(null);
    setServerMissing([]);
    try {
      const stored = storedRef.current === undefined ? await readStoredRequest() : storedRef.current;
      const ticket = mode === 'resubmit'
        ? await accessRequestsApi.resubmit(formPayload(form, stored?.token))
        : await accessRequestsApi.submit(formPayload(form, stored?.stage === 'DRAFT' ? stored.token : undefined));
      submittedRef.current = true;
      await storeTicket(ticket, form.role);
      registerDeviceForAccessRequest(ticket.token);
      onSent(ticket);
    } catch (e) {
      setServerMissing(missingFields(e));
      setError(submitErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const options = catalog?.options || [];
  const classField = (key, label) => {
    if (catalogError) {
      return (
        <View style={{ gap: 6 }}>
          <FieldLabel size="lg">{label}</FieldLabel>
          <FormError>{catalogError}</FormError>
          <TextButton onPress={loadClasses}>Загрузить классы ещё раз</TextButton>
        </View>
      );
    }
    if (!catalog) {
      return (
        <View style={{ gap: 6 }}>
          <FieldLabel size="lg">{label}</FieldLabel>
          <ActivityIndicator />
        </View>
      );
    }
    if (!catalog.yearConfigured) {
      return (
        <Banner tone="info" icon="info" size="lg">
          Школа ещё не открыла запись: учебный год не настроен. Попробуйте позже или обратитесь в школу.
        </Banner>
      );
    }
    return (
      <ComboField
        size="lg"
        label={label}
        placeholder="Например, 5"
        selected={options.find((option) => option.classId === form[key]) || null}
        options={options}
        filter={filterClasses}
        onSelect={(option) => set(key)(option.classId)}
        invalid={Boolean(fieldError(key))}
        keyboardType={CLASS_KEYBOARD}
        emptyText="Такого класса в школе нет"
      />
    );
  };

  const passwordFields = (
    <>
      <View>
        <PasswordField
          size="lg"
          sunken={!parent}
          label={parent ? 'Пароль' : undefined}
          value={form.password}
          onChangeText={set('password')}
          placeholder="Придумайте пароль"
          maxLength={PASSWORD_MAX_LENGTH}
          invalid={Boolean(fieldError('password'))}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Rule met={check.rules.longEnough}>Не короче 8 символов</Rule>
      </View>
      <View>
        <PasswordField
          size="lg"
          sunken={!parent}
          label={parent ? 'Повторите пароль' : undefined}
          value={form.repeat}
          onChangeText={set('repeat')}
          placeholder="Повторите пароль"
          maxLength={PASSWORD_MAX_LENGTH}
          invalid={Boolean(fieldError('repeat'))}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Rule met={check.rules.matches}>Пароли совпадают</Rule>
      </View>
    </>
  );

  const nameField = (key, label, hint) => (
    <View>
      <TextField
        size="lg"
        label={label}
        value={form[key]}
        onChangeText={set(key)}
        placeholder="Фамилия Имя Отчество"
        autoCapitalize="words"
        autoCorrect={false}
        invalid={Boolean(fieldError(key))}
      />
      {fieldError(key) ? <FormError>{fieldError(key)}</FormError> : hint ? <Hint>{hint}</Hint> : null}
    </View>
  );

  const phoneField = (label, hint, optional = false) => (
    <View>
      <TextField
        size="lg"
        optional={optional}
        label={label}
        value={form.phone}
        onChangeText={set('phone')}
        placeholder="+7 7__ ___ __ __"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        invalid={Boolean(fieldError('phone'))}
      />
      {fieldError('phone') ? <FormError>{fieldError('phone')}</FormError> : hint ? <Hint>{hint}</Hint> : null}
    </View>
  );

  return (
    <FormPage
      layout="request"
      onBack={onBack}
      large={false}
      title={mode === 'resubmit' ? 'Повторная заявка' : parent ? 'Заявка родителя' : 'Заявка ученика'}
      footer={
        <>
          {error ? <FormError>{error}</FormError> : null}
          {mode === 'resubmit' ? (
            <Hint center>Это будет новая заявка со своим номером — прежняя останется в истории школы.</Hint>
          ) : null}
          <PrimaryButton size="lg" style={{ marginTop: AUTH.captionGap }} disabled={sending} onPress={submit}>
            {sending ? (
              <ActivityIndicator color={c.heroInk} />
            ) : mode === 'resubmit' ? 'Отправить повторно' : 'Отправить заявку'}
          </PrimaryButton>
        </>
      }
    >
      {mode === 'resubmit' && prefill?.rejectionReason ? (
        <Banner tone="danger" icon="alertCircle" size="lg">{`Причина отказа: ${prefill.rejectionReason}`}</Banner>
      ) : null}

      {parent ? (
        <>
          <FormSectionLabel>О вас</FormSectionLabel>
          {nameField('fullName', 'ФИО')}
          {phoneField('Телефон', 'Это будет ваш логин')}
          {passwordFields}
          <FormDivider />
          <FormSectionLabel>Ребёнок</FormSectionLabel>
          {nameField('childFullName', 'ФИО ребёнка')}
          <View>
            {classField('childClassId', 'Класс ребёнка')}
            {fieldError('childClassId') ? <FormError>{fieldError('childClassId')}</FormError> : null}
          </View>
          <Banner tone="info" icon="info" size="lg">
            Несколько детей в школе? Укажите одного — остальных привяжет администратор.
          </Banner>
        </>
      ) : (
        <>
          {nameField('fullName', 'ФИО', 'Как в школьных документах')}
          <View>
            {classField('classId', 'Класс')}
            {fieldError('classId') ? (
              <FormError>{fieldError('classId')}</FormError>
            ) : form.classId ? null : (
              <Hint>Начните вводить цифру — покажем классы вашей школы</Hint>
            )}
          </View>
          {/* С телефоном подсказка «без телефона — по коду» уже неправда: дальше блок пароля (A3). */}
          {phoneField(
            'Телефон',
            check.needsPassword ? null : 'Без телефона вы будете входить по коду от классного руководителя и PIN.',
            true,
          )}
          {check.needsPassword ? (
            <Card style={{ gap: 12 }}>
              <Txt style={{ fontSize: REQUEST.blockTitleSize, lineHeight: REQUEST.blockTitleLine, fontWeight: '700' }}>
                Пароль для входа по телефону
              </Txt>
              {passwordFields}
            </Card>
          ) : null}
        </>
      )}
    </FormPage>
  );
}

/**
 * A5 «Заявка отправлена». Номер — для разговора со школой: статус по нему не узнать, его
 * отдают только по токену заявки, который приложение запомнило само (§2). Поэтому совет
 * «сохраните номер — по нему узнаете решение» из макета заменён на то, где смотреть решение.
 * «Скопировать» кладёт номер в буфер обмена (`expo-clipboard` — тот же, что у кода ученика).
 */
export function AccessRequestSent({ requestId, onDone }) {
  const { c } = useTheme();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);

  const copy = async () => {
    setCopyError(null);
    try {
      await Clipboard.setStringAsync(String(requestId));
      setCopied(true);
    } catch {
      setCopyError('Не получилось скопировать — перепишите номер вручную.');
    }
  };

  return (
    <FormPage
      layout="request"
      large={false}
      footer={<PrimaryButton size="lg" onPress={onDone}>Готово</PrimaryButton>}
    >
      <View style={{ alignItems: 'center', paddingTop: AUTH.sectionGap, gap: AUTH.gap }}>
        <StatusMark icon="check" tone="success" large />
        <View>
          <Title center done>Заявка отправлена</Title>
          <Lead center gap={12}>Администратор школы проверит данные и откроет доступ.</Lead>
        </View>
      </View>
      {requestId ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: REQUEST.choicePadV }}>
          <Txt style={{ fontSize: REQUEST.hintSize, lineHeight: REQUEST.hintLine, color: c.inkMuted }}>Номер заявки</Txt>
          <Txt
            selectable
            style={{
              fontSize: AUTH.numberSize,
              lineHeight: REQUEST.numberLine,
              letterSpacing: REQUEST.numberTracking,
              fontWeight: '800',
              color: c.blueInk,
            }}
          >
            {String(requestId)}
          </Txt>
          <OutlineButton size="pill" icon={copied ? 'check' : 'copy'} onPress={copy}>
            {copied ? 'Скопировано' : 'Скопировать'}
          </OutlineButton>
          {copyError ? <FormError>{copyError}</FormError> : null}
        </Card>
      ) : null}
      <Banner tone="warning" icon="alertCircle" size="lg">
        Решение будет видно в приложении: на экране входа — «Проверить статус заявки». Номер пригодится, если
        спросите о заявке в школе.
      </Banner>
    </FormPage>
  );
}

/**
 * S1–S6: статус заявки этого телефона.
 *
 * Статус отдают только по токену заявки (§2), поэтому S1 «номер + фамилия» не нарисован: такого
 * поиска у сервера нет — по номеру и фамилии чужую заявку нашёл бы любой, кто знает фамилию.
 * Экран читает токен, который приложение сохранило при подаче, и обновляется на каждом
 * открытии; ожидающей заявке заодно переотправляет телефон для push (§14).
 */
export function AccessRequestStatus({ onBack, onSignIn, onApply, onContinue, onRecovery }) {
  const { c } = useTheme();
  const [state, setState] = useState({ phase: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true);
    else setState({ phase: 'loading' });
    try {
      const stored = await readStoredRequest().catch(() => null);
      if (!stored) {
        setState({ phase: 'none' });
        return;
      }
      try {
        const status = await accessRequestsApi.status(stored.token);
        await rememberStage(stored, status.stage);
        if (status.stage === 'PENDING') registerDeviceForAccessRequest(stored.token);
        setState({ phase: 'ready', status, requestId: status.requestId ?? stored.requestId });
      } catch (e) {
        if (isRequestGone(e)) {
          await forgetRequest();
          setState({ phase: 'gone' });
          return;
        }
        setState({ phase: 'error', message: e.message || UNREACHABLE });
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Все экраны статуса — на макетной сетке заявки с шагом 24 (S1–S6).
  const page = { layout: 'request', gap: REQUEST.stepGap, onBack };

  if (state.phase === 'loading') {
    return (
      <FormPage {...page} large={false} title="Статус заявки">
        <ActivityIndicator style={{ marginTop: AUTH.sectionGap }} />
      </FormPage>
    );
  }

  if (state.phase === 'none' || state.phase === 'gone') {
    const gone = state.phase === 'gone';
    return (
      <FormPage
        {...page}
        title="Статус заявки"
        subtitle={gone ? 'Заявка больше не найдена.' : 'На этом телефоне заявок нет.'}
        footer={<PrimaryButton size="lg" onPress={onApply}>Отправить заявку</PrimaryButton>}
      >
        <Lead gap={0}>
          {gone
            ? 'После решения школы заявка видна 30 дней — этот срок прошёл. Если доступ одобрили, входите как обычно.'
            : 'Статус виден на телефоне, с которого заявку отправили: приложение запоминает её само. По номеру статус не узнать — так чужие данные никто не посмотрит.'}
        </Lead>
        <Banner tone="info" icon="info" size="lg">
          Указали в заявке телефон? Когда школа её одобрит, войдите по нему и паролю из заявки.
        </Banner>
      </FormPage>
    );
  }

  if (state.phase === 'error') {
    return (
      <FormPage
        {...page}
        title="Статус заявки"
        footer={<OutlineButton size="cta" onPress={() => load()}>Повторить</OutlineButton>}
      >
        <FormError>{state.message}</FormError>
      </FormPage>
    );
  }

  const { status, requestId } = state;
  const screen = statusScreen(status);
  const note = validUntilNote(status);
  const header = requestId ? `Заявка № ${requestId}` : 'Статус заявки';
  const refresh = () => load({ quiet: true });
  const heading = (
    <View>
      <Title status>{screen.title}</Title>
      <Lead gap={REQUEST.statusLeadGap}>{screen.text}</Lead>
    </View>
  );

  if (screen.kind === 'pending' && screen.parent) {
    // S6: в макете — родитель, который уже вошёл. До одобрения войти нельзя, поэтому это
    // ожидание заявки родителя: та же раскладка, без «Выйти из аккаунта».
    return (
      <FormPage
        {...page}
        large={false}
        title={header}
        footer={
          <PrimaryButton size="lg" disabled={refreshing} onPress={refresh}>
            {refreshing ? <ActivityIndicator color={c.heroInk} /> : 'Обновить статус'}
          </PrimaryButton>
        }
      >
        <View style={{ alignItems: 'center', gap: AUTH.gap }}>
          <StatusMark icon="clock" tone="orange" large />
          <View>
            <Title center status>{screen.title}</Title>
            <Lead center gap={REQUEST.statusLeadGap}>{screen.text}</Lead>
          </View>
        </View>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={status.childFullName || ''} size={REQUEST.avatarSize} variant="soft" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt style={{ fontSize: REQUEST.nameSize, lineHeight: REQUEST.nameLine, fontWeight: '700' }}>
              {shortName(status.childFullName)}
            </Txt>
            <Txt style={{ fontSize: REQUEST.summarySize, lineHeight: REQUEST.summaryLine, color: c.inkMuted }}>
              {[classNameLabel(status.childClassName), requestId ? `заявка № ${requestId}` : null].filter(Boolean).join(' · ')}
            </Txt>
          </View>
        </Card>
        <Txt style={{ textAlign: 'center', fontSize: REQUEST.rowTextSize, lineHeight: REQUEST.rowTextLine, color: c.inkMuted }}>
          Пришлём уведомление, когда школа примет решение, — если уведомления разрешены.
        </Txt>
      </FormPage>
    );
  }

  if (screen.kind === 'pending') {
    return (
      <FormPage
        {...page}
        large={false}
        title={header}
        footer={
          <OutlineButton size="cta" disabled={refreshing} onPress={refresh}>
            {refreshing ? 'Обновляем…' : 'Обновить статус'}
          </OutlineButton>
        }
      >
        {heading}
        <StatusTimeline steps={reviewTimeline(status)} />
        <SummaryCard rows={summaryRows(status)} />
      </FormPage>
    );
  }

  if (screen.kind === 'approved') {
    const byCode = status.nextStep === 'ACTIVATE_WITH_CODE';
    return (
      <FormPage
        {...page}
        large={false}
        title={header}
        footer={
          <PrimaryButton size="lg" onPress={byCode ? onRecovery : onSignIn}>
            {byCode ? 'Ввести код от школы' : 'Перейти ко входу'}
          </PrimaryButton>
        }
      >
        {heading}
        {screen.steps.length ? <NumberedSteps steps={screen.steps} /> : null}
        {note ? <Hint>{note}</Hint> : null}
      </FormPage>
    );
  }

  if (screen.kind === 'rejected') {
    // S4: причина отказа — главный текст экрана (16/24), а не подзаголовок: ради неё сюда и пришли.
    return (
      <FormPage
        {...page}
        large={false}
        title={header}
        footer={
          status.resubmitAllowed ? (
            <PrimaryButton size="lg" onPress={() => onContinue(status, 'resubmit')}>Исправить и отправить</PrimaryButton>
          ) : null
        }
      >
        <View style={{ gap: AUTH.gap }}>
          <StatusMark icon="fileX" tone="danger" square />
          <View style={{ gap: 8 }}>
            <Title status>{screen.title}</Title>
            <Txt style={{ fontSize: REQUEST.reasonSize, lineHeight: REQUEST.reasonLine }}>{screen.text}</Txt>
            {screen.meta ? (
              <Txt style={{ fontSize: REQUEST.hintSize, lineHeight: REQUEST.hintLine, color: c.ink3 }}>{screen.meta}</Txt>
            ) : null}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <FieldLabel size="lg">Что вы отправили</FieldLabel>
          <SummaryCard
            variant="table"
            rows={summaryRows(status).map((row) => ({ ...row, muted: row.value === 'Не указан' || row.value === '—' }))}
          />
        </View>
        {note ? <Hint>{note}</Hint> : null}
      </FormPage>
    );
  }

  if (screen.kind === 'draft') {
    return (
      <FormPage
        {...page}
        large={false}
        title={header}
        footer={<PrimaryButton size="lg" onPress={() => onContinue(status, 'draft')}>Продолжить заполнение</PrimaryButton>}
      >
        {heading}
        <SummaryCard rows={summaryRows(status)} />
      </FormPage>
    );
  }

  return (
    <FormPage {...page} title={screen.title}>
      <Lead gap={0}>{screen.text}</Lead>
    </FormPage>
  );
}
