import React, { useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH } from '@shared/theme/tokens';
import { Txt } from '@shared/components/Txt';
import { Card, ConfirmDialog, FilledButton, OutlineButton } from '@shared/components/ui';
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
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);
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
      setCopied(false);
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
      setCopied(true);
    } catch {
      setError('Не получилось скопировать — перепишите код вручную.');
    }
  };

  const hide = () => {
    setCode(null);
    setCopied(false);
    setError(null);
  };

  return (
    <Card style={{ marginHorizontal: AUTH.gutter }}>
      <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.inkMuted }}>
        Персональный код
      </Txt>
      {code ? (
        <Txt
          selectable
          style={{
            marginTop: 8,
            fontSize: AUTH.codeSize,
            lineHeight: AUTH.codeLine,
            letterSpacing: AUTH.codeTracking,
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
            marginTop: 8,
            fontSize: AUTH.maskSize,
            lineHeight: AUTH.codeLine,
            letterSpacing: AUTH.maskTracking,
            color: c.ink3,
          }}
        >
          {CODE_MASK}
        </Txt>
      )}
      <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: code ? c.greenDeep : c.ink3 }}>
        {code ? 'Посмотреть код ещё раз не получится — только выдать новый.' : issuedCaption(access)}
      </Txt>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: AUTH.gap }}>
        {code ? (
          <>
            <OutlineButton size="lg" style={{ flex: 1 }} onPress={hide}>Скрыть</OutlineButton>
            <FilledButton size="lg" style={{ flex: 1 }} onPress={copy}>
              {copied ? 'Скопировано' : 'Скопировать'}
            </FilledButton>
          </>
        ) : issuedBefore ? (
          <OutlineButton
            size="lg"
            style={{ flex: 1 }}
            disabled={!canIssue || busy}
            onPress={() => setConfirm({ pinSet: access?.pinSet })}
          >
            Выдать новый код
          </OutlineButton>
        ) : (
          <FilledButton size="lg" style={{ flex: 1 }} disabled={!canIssue || busy} onPress={() => send(false)}>
            {busy ? 'Выдаём…' : 'Выдать код'}
          </FilledButton>
        )}
      </View>

      {error ? <FormError>{error}</FormError> : null}
      {!canIssue ? (
        <Txt style={{ marginTop: AUTH.captionGap, fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.greenDeep }}>
          {NOT_ISSUABLE_TEXT}
        </Txt>
      ) : null}
      <View style={{ marginTop: 6 }}>
        <Hint>{codeHint(audience, access)}</Hint>
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
