import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, View } from 'react-native';
import { MathText } from '@shared/math/MathText';
import { useTheme } from '@shared/theme/ThemeContext';
import { embedBlocks, embedExpired, embedOpenLabel, embedOpening } from '@shared/content/embedMarkup';
import { Txt } from './Txt';
import { ConfirmDialog } from './ui';
import { EmbedImageViewer, EmbedPdfViewer } from './EmbedViewers';

/**
 * Текст учебного материала с рисунками и файлами внутри (CONTENT-EMBED-001).
 *
 * Порядок блоков — ровно тот, что в тексте: «текст — рисунок — файл — текст». Описание вставок
 * (`embeds`) приходит вместе с текстом от сервера, который уже проверил права: ученик и родитель
 * получают только вставки опубликованного. Компонент ничего не фильтрует и своих запросов не
 * делает; сырой маркер `[[image:…]]` на экран не попадает ни в одном состоянии.
 *
 * Текст без вставок выводится ровно как раньше — одним `MathText`.
 *
 * `onExpired` — подписанные ссылки живут несколько часов; когда ссылка не сработала, компонент
 * просит экран перечитать материал (один раз на неудачу), а не чинит её сам.
 *
 * `antiCheat` — экран теста с включённым античитом: уход в другое приложение там нарушение,
 * поэтому перед открытием файла системным приложением — предупреждение, а «Скачать» в
 * просмотре PDF не показывается. Рисунки и PDF открываются внутри приложения и предупреждения
 * не требуют.
 */
export function RichText({ text, embeds, style, respectFontScale = false, antiCheat = false, onExpired }) {
  const blocks = useMemo(() => embedBlocks(text), [text]);
  const byId = useMemo(() => new Map((embeds ?? []).map((embed) => [embed.id, embed])), [embeds]);

  if (!text) return null;
  if (!blocks.some((block) => block.type === 'embed')) {
    return <MathText text={text} style={style} respectFontScale={respectFontScale} />;
  }

  return (
    <View style={{ gap: 12, minWidth: 0 }}>
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          const visible = visibleText(block.text);
          return visible ? (
            <MathText key={index} text={visible} style={style} respectFontScale={respectFontScale} />
          ) : null;
        }
        const embed = byId.get(block.id);
        if (!embed || embed.available === false || embed.kind !== (block.kind === 'image' ? 'IMAGE' : 'FILE')) {
          return <EmbedUnavailable key={index} kind={block.kind} />;
        }
        return block.kind === 'image' ? (
          <EmbedImage key={index} embed={embed} onExpired={onExpired} />
        ) : (
          <EmbedFileCard key={index} embed={embed} antiCheat={antiCheat} onExpired={onExpired} />
        );
      })}
    </View>
  );
}

/** Пустые строки на краях текстового блока — отступы вокруг вставки, а не текст. */
function visibleText(text) {
  const trimmed = text.replace(/^(?:[ \t]*\r?\n)+/, '').replace(/(?:\r?\n[ \t]*)+$/, '');
  return trimmed.trim() === '' ? '' : trimmed;
}

/**
 * Рисунок на ширину текста. Место отмерено заранее по `width/height` из описания: иначе блок
 * прыгал бы, пока картинка грузится. Нажатие — полноэкранный просмотр оригинала внутри
 * приложения.
 */
export function EmbedImage({ embed, onExpired, maxHeight = 420 }) {
  const { c } = useTheme();
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  const askedFresh = useRef(false);
  const ratio = embed.width && embed.height ? embed.width / embed.height : 4 / 3;

  // Новая ссылка (экран перечитал материал) — новая попытка.
  useEffect(() => {
    setFailed(false);
  }, [embed.url]);

  // Первая неудача — скорее всего, истекла подписанная ссылка: просим экран перечитать
  // материал. Свежая ссылка сбросит `failed`; не помогло — остаётся «Повторить», без цикла.
  function handleError() {
    setFailed(true);
    if (onExpired && !askedFresh.current) {
      askedFresh.current = true;
      onExpired();
    }
  }

  if (failed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Не удалось показать рисунок «${embed.fileName}». Повторить`}
        onPress={() => {
          askedFresh.current = true;
          if (onExpired) onExpired();
          else setFailed(false);
        }}
        style={{ borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 14, gap: 4 }}
      >
        <Txt style={{ fontSize: 14, color: c.inkMuted }}>Не удалось показать рисунок</Txt>
        <Txt style={{ fontSize: 14, fontWeight: '600', color: c.blue }}>Повторить</Txt>
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Рисунок «${embed.fileName}». Открыть крупно`}
        onPress={() => setZoomed(true)}
        style={{ borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden', backgroundColor: c.surface }}
      >
        <Image
          source={{ uri: embed.url }}
          onError={handleError}
          onLoad={() => {
            askedFresh.current = false;
          }}
          resizeMode="contain"
          style={{ width: '100%', aspectRatio: ratio, maxHeight }}
        />
      </Pressable>
      {zoomed ? (
        <EmbedImageViewer
          uri={embed.originalUrl ?? embed.url}
          title={embed.fileName}
          onClose={() => setZoomed(false)}
        />
      ) : null}
    </>
  );
}

/**
 * Документ на своём месте в тексте: тип, имя, размер и «Открыть» (ТЗ §3.3). Как открывать,
 * решает `embedOpening`: картинка и PDF — внутри приложения, Word/Excel/PowerPoint — системным
 * приложением по ссылке на скачивание.
 *
 * Истёкшая ссылка не открывается вслепую: карточка просит экран перечитать материал и
 * открывает файл, когда придёт свежая ссылка.
 */
export function EmbedFileCard({ embed, antiCheat = false, onExpired, children }) {
  const { c } = useTheme();
  const [viewer, setViewer] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const waiting = useRef(false);
  const opening = embedOpening(embed, Platform.OS);
  const label = embedOpenLabel(embed, Platform.OS);

  function external(url) {
    if (!url) return;
    if (antiCheat) setConfirm(url);
    else Linking.openURL(url).catch(() => {});
  }

  function start() {
    if (opening.mode === 'external') external(opening.url);
    else setViewer(opening.mode);
  }

  function press() {
    if (onExpired && embedExpired(embed)) {
      waiting.current = true;
      onExpired();
      return;
    }
    start();
  }

  useEffect(() => {
    if (!waiting.current || embedExpired(embed)) return;
    waiting.current = false;
    // Открыть ровно один раз — когда пришла свежая ссылка.
    start();
  }, [embed.url, embed.expiresAt]);

  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.bg2, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontSize: 10, fontWeight: '800', color: c.inkMuted }}>
            {(embed.extension || 'файл').toUpperCase()}
          </Txt>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{embed.fileName}</Txt>
          {embed.sizeBytes != null ? (
            <Txt style={{ fontSize: 12, color: c.inkMuted }}>{formatFileSize(embed.sizeBytes)}</Txt>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} «${embed.fileName}»`}
          onPress={press}
          hitSlop={6}
          style={({ pressed }) => ({
            minHeight: 40,
            justifyContent: 'center',
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: pressed ? c.bg2 : c.surface,
          })}
        >
          <Txt style={{ fontSize: 14, fontWeight: '600', color: c.blue }}>{label}</Txt>
        </Pressable>
      </View>
      {children}

      {viewer === 'image' ? (
        <EmbedImageViewer uri={opening.url} title={embed.fileName} onClose={() => setViewer(null)} />
      ) : null}
      {viewer === 'pdf' ? (
        <EmbedPdfViewer
          uri={opening.url}
          baseUrl={opening.baseUrl}
          title={embed.fileName}
          onClose={() => setViewer(null)}
          onExpired={onExpired}
          onDownload={
            antiCheat || !embed.downloadUrl
              ? undefined
              : () => Linking.openURL(embed.downloadUrl).catch(() => {})
          }
        />
      ) : null}
      <ConfirmDialog
        visible={confirm != null}
        title="Открыть файл?"
        message="Файл откроется в другом приложении — учитель увидит выход из теста."
        confirmLabel="Открыть"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const url = confirm;
          setConfirm(null);
          Linking.openURL(url).catch(() => {});
        }}
      />
    </View>
  );
}

/** Вставки нет в ответе или файл недоступен — ни имени, ни маркера (ТЗ §6). */
export function EmbedUnavailable({ kind }) {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, backgroundColor: c.bg2, padding: 14 }}>
      <Txt style={{ fontSize: 14, color: c.inkMuted }}>{kind === 'image' ? 'Рисунок недоступен' : 'Файл недоступен'}</Txt>
    </View>
  );
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;
}
