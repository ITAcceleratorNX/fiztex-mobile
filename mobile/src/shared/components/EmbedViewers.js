import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { PdfPageViewer } from '@shared/pdf/PdfPageViewer';
import { pageLabel, stepPage } from '@shared/api/textbookMap';
import { Txt } from './Txt';
import Icon from './Icon';
import { StateView } from './ui';

/**
 * Просмотр вставок внутри приложения (CONTENT-EMBED-001): рисунок на весь экран и PDF по
 * страницам. Внутри — потому что уход в другое приложение во время теста античит считает
 * нарушением, а «рассмотреть чертёж» им становиться не должно (как `QuestionFigure`).
 */

/** Рисунок на весь экран. Щипок увеличивает на iOS — так же, как у фото работы. */
export function EmbedImageViewer({ uri, title, onClose }) {
  const { c } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const imageHeight = Math.max(200, height - insets.top - insets.bottom - 140);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.viewerBackdrop }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Txt numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.viewerInk }}>
            {title}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть просмотр"
            onPress={onClose}
            hitSlop={12}
            style={{ padding: 6 }}
          >
            <Icon name="x" size={24} color={c.viewerInk} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ width, minHeight: imageHeight, alignItems: 'center', justifyContent: 'center' }}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <Image
            source={{ uri }}
            resizeMode="contain"
            accessibilityLabel={title}
            style={{ width: width - 16, height: imageHeight }}
          />
        </ScrollView>

        {Platform.OS === 'ios' ? (
          <Txt style={{ textAlign: 'center', paddingTop: 12, paddingBottom: insets.bottom + 16, fontSize: 12, color: c.viewerInkMuted }}>
            Щипком — увеличить
          </Txt>
        ) : (
          <View style={{ height: insets.bottom + 16 }} />
        )}
      </View>
    </Modal>
  );
}

/**
 * PDF по страницам — pdf.js в WebView, тот же `PdfPageViewer`, что у учебника: Android PDF в
 * WebView не рисует вовсе, а системный просмотрщик увёл бы из приложения. Ссылка подписанная,
 * заголовок авторизации не нужен; `baseUrl` — её происхождение, поэтому без CORS.
 *
 * `onDownload` — кнопка «Скачать» в шапке; в тесте с античитом её не передают: скачивание
 * уводит в браузер, а посмотреть документ можно и здесь.
 *
 * Ссылка живёт несколько часов. Не открылось — «Повторить» сначала просит экран обновить
 * материал (`onExpired`), потом открывает заново: со старой ссылкой повтор бессмыслен.
 */
export function EmbedPdfViewer({ uri, baseUrl, title, onClose, onDownload, onExpired }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  // Экран перечитал материал — пришла свежая ссылка, документ открывается заново.
  useEffect(() => {
    setPhase('loading');
  }, [uri]);

  const onReady = useCallback((count) => {
    setPageCount(count);
    setPage((current) => Math.min(current, count));
    setPhase('ready');
  }, []);
  const onPage = useCallback((rendered) => setPage(rendered), []);
  const onError = useCallback(() => setPhase('error'), []);

  const retry = () => {
    onExpired?.();
    setPhase('loading');
    setAttempt((value) => value + 1);
  };

  const ready = phase === 'ready';
  const paged = pageCount != null && pageCount > 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View
          style={{
            paddingTop: insets.top,
            backgroundColor: c.surface,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
          }}
        >
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть документ"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg2, opacity: pressed ? 0.6 : 1 })}
            >
              <Icon name="x" size={18} color={c.ink} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{title}</Txt>
              {pageCount != null ? (
                <Txt style={{ fontSize: 12, color: c.inkMuted }}>{pageLabel(page, pageCount)}</Txt>
              ) : null}
            </View>
            {onDownload ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Скачать «${title}»`}
                onPress={onDownload}
                hitSlop={8}
                style={({ pressed }) => ({ paddingHorizontal: 8, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
              >
                <Txt style={{ fontSize: 15, fontWeight: '600', color: c.blue }}>Скачать</Txt>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <PdfPageViewer
            key={`${attempt}:${uri}`}
            uri={uri}
            baseUrl={baseUrl}
            page={page}
            onReady={onReady}
            onPage={onPage}
            onError={onError}
          />
          {phase === 'loading' ? (
            <View style={[overlayStyle, { alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color={c.blue} />
            </View>
          ) : null}
          {phase === 'error' ? (
            <View style={[overlayStyle, { alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.bg }]}>
              <StateView
                icon="alertTriangle"
                tone="error"
                title="Не удалось открыть документ"
                actionLabel="Повторить"
                onAction={retry}
              />
            </View>
          ) : null}
        </View>

        {paged && phase !== 'error' ? (
          <View
            style={{
              backgroundColor: c.surface,
              borderTopWidth: 1,
              borderTopColor: c.border,
              paddingBottom: insets.bottom,
            }}
          >
            <View style={{ height: 52, flexDirection: 'row', alignItems: 'center' }}>
              <PageArrow
                icon="chevronLeft"
                accessibilityLabel="Предыдущая страница"
                disabled={!ready || page <= 1}
                onPress={() => setPage((current) => stepPage(current, -1, pageCount))}
              />
              <Txt style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: c.ink }}>
                {pageLabel(page, pageCount)}
              </Txt>
              <PageArrow
                icon="chevronRight"
                accessibilityLabel="Следующая страница"
                disabled={!ready || page >= pageCount}
                onPress={() => setPage((current) => stepPage(current, 1, pageCount))}
              />
            </View>
          </View>
        ) : (
          <View style={{ height: insets.bottom, backgroundColor: c.bg }} />
        )}
      </View>
    </Modal>
  );
}

const overlayStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

function PageArrow({ icon, accessibilityLabel, disabled, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 88,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={22} color={c.blue} strokeWidth={2.2} />
    </Pressable>
  );
}
