import React, { useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH, CODES } from '@shared/theme/tokens';
import { useAppState } from '@shared/state/AppState';
import { Txt } from '@shared/components/Txt';
import { Card, ConfirmDialog, OutlineButton, PrimaryButton } from '@shared/components/ui';
import { FormError, Hint } from '@shared/ui/formParts';
import {
  CODE_MASK, NOT_ISSUABLE_TEXT, codeHint, grantCaption, issueErrorText, issuedCaption,
  needsReissueConfirm, reissueMessage,
} from './studentCodeModel';

/**
 * Карточка «Персональный код» (Figma 2460:4292, 4371, 4460, 4612) — у классного руководителя
 * и у родителя одна, различаются только тексты (`audience`).
 *
 * **«Показать» из макета невозможен**: код лежит хэшем, и сервер умеет только выпустить новый
 * (AUTH-BE-001 §10). Поэтому кнопка называет то, что случится: «Выдать код», а когда код уже
 * выпускали, — «Выдать новый код» с вопросом, потому что прежний сразу перестанет работать.
 *
 * Выданное значение живёт только в состоянии этой карточки: не уходит ни в навигацию, ни в
 * хранилище, ни в тост и пропадает по «Скрыть» или с уходом с экрана — второй раз его не
 * покажет никто.
 *
 * @param {{
 *   access: { codeIssuedAt?: string, pinSet?: boolean, canIssueCode?: boolean, grantExpiresAt?: string },
 *   audience: 'teacher'|'parent',
 *   onIssue: (confirmReissue: boolean) => Promise<{ issuedCode?: string }>,
 *   onChanged?: () => void,
 * }} props
 */
export function StudentCodeCard({ access, audience, onIssue, onChanged }) {
  const { c } = useTheme();
  const appState = useAppState();
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Открытый вопрос о перевыпуске; `pinSet` — для текста: в 409 сервер присылает свежий.
  const [confirm, setConfirm] = useState(null);

  const issuedBefore = Boolean(access?.codeIssuedAt);
  const canIssue = access?.canIssueCode !== false;
  const grant = grantCaption(access);

  const send = async (confirmReissue) => {
    setBusy(true);
    setError(null);
    try {
      const result = await onIssue(confirmReissue);
      setConfirm(null);
      setCode(result?.issuedCode || null);
      onChanged?.();
    } catch (e) {
      if (needsReissueConfirm(e)) {
        // Код успели выпустить в другом месте, пока экран был открыт.
        setConfirm({ pinSet: e.details?.pinSet ?? access?.pinSet });
      } else {
        setConfirm(null);
        setError(issueErrorText(e, audience));
        // Отказ мог прийти потому, что разрешение отозвали или аккаунт выключили, — экран
        // должен это увидеть, а не предлагать ту же кнопку снова.
        onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  // Буфер обмена, а не системное «Поделиться»: код диктуют ученику или вставляют в чат, а
  // меню отправки предлагало заодно послать его почтой — лишний способ унести секрет.
  const copy = async () => {
    setError(null);
    try {
      await Clipboard.setStringAsync(code);
      // Подпись кнопки не меняется (2460:4371): что код в буфере, говорит карточка сверху.
      appState.notice({ title: 'Код скопирован', text: 'Можно вставить в сообщение.' });
    } catch {
      setError('Не получилось скопировать — перепишите код вручную.');
    }
  };

  const hide = () => {
    setCode(null);
    setError(null);
  };

  // Карточка по макету 2460:4292 / 4371 / 4460: поля 21, шаг 14 — подпись, код (или маска той же
  // высоты, чтобы карточка не прыгала на «Выдать» и «Скрыть»), таблетки 48 и подсказка.
  return (
    <Card style={{ padding: CODES.cardPad, gap: CODES.cardGap }}>
      <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.inkMuted }}>
        Персональный код
      </Txt>
      <View style={{ gap: 4 }}>
        {code ? (
          <Txt
            selectable
            style={{
              fontSize: CODES.codeSize,
              lineHeight: CODES.codeLine,
              letterSpacing: CODES.codeTracking,
              fontWeight: '800',
              color: c.blueInk,
            }}
          >
            {code}
          </Txt>
        ) : (
          <Txt
            accessibilityLabel="Код скрыт"
            style={{
              fontSize: CODES.codeSize,
              lineHeight: CODES.codeLine,
              letterSpacing: CODES.codeTracking,
              fontWeight: '800',
              color: c.borderStrong,
            }}
          >
            {CODE_MASK}
          </Txt>
        )}
        <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: code ? c.amberInk : c.ink3 }}>
          {code ? 'Посмотреть код ещё раз не получится — только выдать новый.' : issuedCaption(access)}
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {code ? (
          <>
            <OutlineButton size="pill-lg" style={{ flex: 1 }} onPress={hide}>Скрыть</OutlineButton>
            <PrimaryButton size="compact" full={false} style={{ flex: 1 }} onPress={copy}>Скопировать</PrimaryButton>
          </>
        ) : issuedBefore ? (
          <OutlineButton
            size="pill-lg"
            style={{ flex: 1 }}
            disabled={!canIssue || busy}
            onPress={() => setConfirm({ pinSet: access?.pinSet })}
          >
            Выдать новый код
          </OutlineButton>
        ) : (
          <PrimaryButton size="compact" full={false} style={{ flex: 1 }} disabled={!canIssue || busy} onPress={() => send(false)}>
            {busy ? 'Выдаём…' : 'Выдать код'}
          </PrimaryButton>
        )}
      </View>

      {error ? <FormError>{error}</FormError> : null}
      {!canIssue ? (
        <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.amberInk }}>
          {NOT_ISSUABLE_TEXT}
        </Txt>
      ) : null}
      <View>
        <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.inkMuted }}>{codeHint(audience, access)}</Txt>
        {grant ? <Hint>{grant}</Hint> : null}
      </View>

      <ConfirmDialog
        visible={Boolean(confirm)}
        title="Выдать новый код?"
        message={reissueMessage(audience, confirm?.pinSet)}
        confirmLabel="Выдать новый код"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => send(true)}
      />
    </Card>
  );
}
