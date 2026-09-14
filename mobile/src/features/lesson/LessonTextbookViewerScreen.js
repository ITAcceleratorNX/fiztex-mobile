import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { StateView } from '@shared/components/ui';
import { TextEditSheet } from '@shared/components/TextEditSheet';
import { useAuth } from '@features/auth/AuthContext';
import { API_BASE_URL } from '@shared/api/config';
import { authHeaders } from '@shared/api/upload';
import { lessonFiles } from '@shared/api/lessonApi';
import {
  isInRange,
  lessonRange,
  opensByPages,
  pageLabel,
  parseJumpPage,
  rangeHint,
  startPage,
  stepPage,
} from '@shared/api/textbookMap';
import { PdfPageViewer } from '@shared/pdf/PdfPageViewer';

/**
 * Просмотр учебника урока (Figma 2149:5033) — ученик и родитель, один экран.
 *
 * <p>Файл отдаётся через урок (`/lessons/{id}/textbooks/{textbookId}/content`), а не из
 * библиотеки: у ученика нет другого основания доступа (контракт §1). Родитель передаёт
 * `childId`, как во всех ролевых запросах урока.
 *
 * <p><b>PDF</b> — по одной странице на pdf.js и сразу с начала диапазона, заданного учителем:
 * урок со «стр. 300–310» открывается на трёхсотой, а не на обложке. К самим страницам урока
 * всегда можно вернуться полосой под шапкой, а на любую другую — перейти, нажав номер
 * страницы. <b>DOCX</b> страниц не имеет: его рисует нативный WebView, как материалы урока, —
 * на iOS он откроется, Android такие файлы в WebView не показывает, и экран говорит об этом.
 */
export function LessonTextbookViewerScreen({ nav, payload }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const lessonId = payload?.lessonInstanceId ?? null;
  const childId = payload?.childId ?? null;
  const textbook = payload?.textbook ?? null;
  const headers = useMemo(() => authHeaders(token) ?? {}, [token]);
  const paged = opensByPages(textbook);
  const range = useMemo(() => lessonRange(textbook), [textbook]);

  const [page, setPage] = useState(() => startPage(textbook));
  const [pageCount, setPageCount] = useState(textbook?.pageCount ?? null);
  const [phase, setPhase] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpError, setJumpError] = useState(null);

  const onBack = useCallback(() => nav?.back?.(), [nav]);
  const onReady = useCallback((count) => {
    setPageCount(count);
    setPage((current) => Math.min(current, count));
    setPhase('ready');
  }, []);
  const onPage = useCallback((rendered) => setPage(rendered), []);
  const onError = useCallback(() => setPhase('error'), []);
  const retry = useCallback(() => {
    setPhase('loading');
    setAttempt((value) => value + 1);
  }, []);
  const closeJump = useCallback(() => {
    setJumpOpen(false);
    setJumpError(null);
  }, []);
  const jump = useCallback(
    (value) => {
      const parsed = parseJumpPage(value, pageCount);
      if (parsed.error) {
        setJumpError(parsed.error);
        return;
      }
      closeJump();
      setPage(parsed.page);
    },
    [pageCount, closeJump],
  );

  if (!textbook || lessonId == null || textbook.textbookId == null) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <TopBar onBack={onBack} title="" />
      </View>
    );
  }

  const uri = lessonFiles.textbook(lessonId, textbook.textbookId, childId);
  const docxOnAndroid = !paged && Platform.OS === 'android';
  const ready = phase === 'ready';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: c.surface }}>
        <TopBar onBack={onBack} title={paged ? pageLabel(page, pageCount) : textbook.title} />
        {paged && range ? (
          <LessonRangeBar
            range={range}
            outside={!isInRange(page, range)}
            disabled={!ready}
            onReturn={() => setPage(range.from)}
          />
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        {docxOnAndroid ? (
          <Centered>
            <StateView icon="fileText" title="Этот учебник в формате DOCX — откройте его на компьютере" />
          </Centered>
        ) : paged ? (
          <PdfPageViewer
            key={attempt}
            uri={uri}
            headers={headers}
            baseUrl={API_BASE_URL}
            page={page}
            range={range}
            onReady={onReady}
            onPage={onPage}
            onError={onError}
          />
        ) : (
          <WebView
            key={attempt}
            source={{ uri, headers }}
            style={{ flex: 1, backgroundColor: c.bg }}
            onLoadEnd={() => setPhase((current) => (current === 'error' ? current : 'ready'))}
            onError={onError}
            onHttpError={onError}
          />
        )}

        {!docxOnAndroid && phase === 'loading' ? (
          <Centered overlay>
            <ActivityIndicator color={c.blue} />
          </Centered>
        ) : null}

        {!docxOnAndroid && phase === 'error' ? (
          <Centered overlay background={c.bg}>
            <StateView
              icon="alertTriangle"
              tone="error"
              title="Не удалось открыть учебник"
              actionLabel="Повторить"
              onAction={retry}
            />
          </Centered>
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
          <View style={{ height: 52, flexDirection: 'row' }}>
            <PageArrow
              label="←"
              accessibilityLabel="Предыдущая страница"
              disabled={!ready || page <= 1}
              onPress={() => setPage((current) => stepPage(current, -1, pageCount))}
            />
            {/* Номер — это и кнопка перехода: в учебнике на 400 страниц стрелками до нужной
                не дойти, а номер чаще всего и написан в задании. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Страница ${page}. Перейти на другую страницу`}
              disabled={!ready}
              onPress={() => setJumpOpen(true)}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Txt style={{ fontSize: 18, fontWeight: '700', color: c.blue }}>{page}</Txt>
              <Icon name="chevronDown" size={14} color={c.blue} strokeWidth={2.4} />
            </Pressable>
            <PageArrow
              label="→"
              accessibilityLabel="Следующая страница"
              disabled={!ready || (pageCount != null && page >= pageCount)}
              onPress={() => setPage((current) => stepPage(current, 1, pageCount))}
            />
          </View>
        </View>
      ) : null}

      <TextEditSheet
        visible={jumpOpen}
        title="Перейти на страницу"
        label="Номер страницы"
        placeholder={pageCount != null ? `От 1 до ${pageCount}` : 'Например, 300'}
        keyboardType="number-pad"
        saveLabel="Перейти"
        autoFocus
        submitOnReturn
        error={jumpError}
        onSave={jump}
        onClose={closeJump}
      />
    </View>
  );
}

/** Шапка просмотра: «‹ Назад» слева и номер страницы по центру (Figma `top-bar`). */
function TopBar({ onBack, title }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Назад"
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => ({ width: 90, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}
      >
        <Icon name="chevronLeft" size={16} color={c.blue} strokeWidth={2.2} />
        <Txt style={{ fontSize: 18, fontWeight: '500', color: c.blue }}>Назад</Txt>
      </Pressable>
      <Txt
        numberOfLines={1}
        style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '500', color: c.inkMuted }}
      >
        {title}
      </Txt>
      <View style={{ width: 90 }} />
    </View>
  );
}

/**
 * Полоса «Задано к уроку: стр. 300–310». Пока ученик внутри диапазона, это напоминание;
 * ушёл листать дальше — полоса становится кнопкой возврата к первой странице урока.
 */
function LessonRangeBar({ range, outside, disabled, onReturn }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={outside ? 'button' : 'text'}
      accessibilityLabel={outside ? `${rangeHint(range)}. Вернуться к странице ${range.from}` : rangeHint(range)}
      disabled={!outside || disabled}
      onPress={onReturn}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: c.blueSoft,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt style={{ fontSize: 13, fontWeight: '600', color: c.blue }}>{rangeHint(range)}</Txt>
      {outside ? (
        <Txt style={{ fontSize: 13, fontWeight: '700', color: c.blue, textDecorationLine: 'underline' }}>
          Вернуться
        </Txt>
      ) : null}
    </Pressable>
  );
}

function PageArrow({ label, accessibilityLabel, disabled, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Txt style={{ fontSize: 24, fontWeight: '600', color: c.blue }}>{label}</Txt>
    </Pressable>
  );
}

function Centered({ children, overlay = false, background }) {
  return (
    <View
      style={[
        { alignItems: 'center', justifyContent: 'center', padding: 24 },
        overlay ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } : { flex: 1 },
        background ? { backgroundColor: background } : null,
      ]}
    >
      {children}
    </View>
  );
}
