import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@shared/theme/ThemeContext';
import { DOCUMENT, FORMULA } from '@shared/theme/tokens';
import { useAuth } from '@features/auth/AuthContext';
import { contentAssetsApi } from '@shared/api/contentAssetsApi';
import { useContentEmbedPolicy } from '@shared/hooks/useContentEmbedPolicy';
import {
  canMoveEmbed,
  editorRows,
  embedBlocks,
  embedFileProblem,
  fillSlot,
  insertEmbed,
  insertEmbedAt,
  mergeEmbeds,
  moveEmbed,
  removeEmbed,
  replaceEmbed,
  updateTextBlock,
} from '@shared/content/embedMarkup';
import { insertFormulaAt, removeFormulaAt, replaceFormulaAt, splitMath } from '@shared/math/formulaEditing';
import { OutlineButton, TextField } from './ui';
import { Txt } from './Txt';
import { RichText, formatFileSize } from './RichText';
import { EmbedImageViewer } from './EmbedViewers';
import { FormulaEditor } from './FormulaField';

/**
 * Поле учебного текста, в которое учитель вставляет рисунки и файлы прямо между абзацами
 * (CONTENT-EMBED-001). То же, что `RichTextField` веба: значение — одна строка, вставка в ней —
 * строка-маркер `[[image:<id>]]`, а на экране вместо маркера — карточка, которую можно поднять,
 * опустить, заменить и удалить. Сырой маркер в поле ввода не попадает, поэтому сломать его
 * набором нельзя.
 *
 * Текст между вставками — обычные поля ввода. Вставка встаёт туда, где стоял курсор; курсор
 * посреди абзаца разрезает его. Пока файл грузится, поле только для чтения: курсор, который
 * запомнили до выбора файла, не должен уехать.
 *
 * `embeds` — описания вставок из ответа сервера (рисунки уже сохранённого текста); загруженное
 * сейчас поле помнит само и вдобавок отдаёт вторым аргументом: `onChangeText(text, {uploaded})`.
 * `formulas` — кнопка «Формула» и предпросмотр, как у `FormulaField`.
 * `onBusyChange(true|false)` — экран не даёт сохранить, пока файл загружается.
 * `invalidEmbedId` — вставка, на которую пожаловался сервер при сохранении.
 *
 * Загрузку решает сервер (`GET /api/content-assets/policy`): пока она выключена, кнопок
 * вставки нет, а уже стоящие вставки по-прежнему показываются, двигаются и удаляются.
 */
export function RichTextField({
  label,
  value,
  onChangeText,
  embeds,
  placeholder,
  maxLength,
  formulas = false,
  profile = 'GENERAL',
  editable = true,
  minHeight = 120,
  inputStyle,
  onBusyChange,
  invalidEmbedId,
  error,
}) {
  const text = value ?? '';
  const { c } = useTheme();
  const { token } = useAuth();
  const policy = useContentEmbedPolicy(editable);
  const [uploads, setUploads] = useState([]);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [formula, setFormula] = useState(null);

  // Курсор — последнее место, где учитель печатал: `{block, offset}` или `{slot}`.
  const cursor = useRef(null);
  // Загрузка длится секунды; к её концу нужны свежие значение и обработчик, а не те, что
  // были в момент нажатия «Фото» (экран вопросов собирает вопрос целиком из своего состояния).
  const latest = useRef(text);
  latest.current = text;
  const change = useRef(onChangeText);
  change.current = onChangeText;
  const busyListener = useRef(onBusyChange);
  busyListener.current = onBusyChange;
  const uploading = useRef(false);

  const known = new Map(mergeEmbeds(embeds, uploads).map((embed) => [embed.id, embed]));
  const blocks = embedBlocks(text);
  const rows = editorRows(text);
  const embedCount = blocks.filter((block) => block.type === 'embed').length;
  const remaining = maxLength != null ? Math.max(0, maxLength - text.length) : null;
  const locked = !editable || busy != null;
  const canInsert = editable && policy?.enabled === true;
  const full = policy?.maxEmbedsPerField != null && embedCount >= policy.maxEmbedsPerField;
  const mathSegments = formulas ? splitMath(text).filter((segment) => segment.kind === 'math') : [];

  function apply(next) {
    if (maxLength != null && next.length > maxLength) {
      setNotice('Не хватает места: текст поля почти достиг предельной длины.');
      return false;
    }
    change.current?.(next);
    return true;
  }

  function changeRow(row, next) {
    if (row.type === 'text') change.current?.(updateTextBlock(latest.current, row.block, next));
    else if (next !== '') change.current?.(fillSlot(latest.current, row.slot, next));
  }

  async function insertFile(kind, source, replacing = null) {
    if (uploading.current || !canInsert) return;
    setNotice(null);
    const current = latest.current;
    if (replacing == null && full) {
      setNotice(`В одном поле — не больше ${policy.maxEmbedsPerField} рисунков и файлов.`);
      return;
    }
    const at = replacing == null ? cursor.current : null;
    if (replacing == null && maxLength != null && insertEmbed(current, at, kind, PLACEHOLDER_ID).length > maxLength) {
      setNotice('Не хватает места: текст поля почти достиг предельной длины.');
      return;
    }

    let picked;
    try {
      picked = kind === 'image' ? await pickImage(source) : await pickDocument(policy);
    } catch {
      setNotice('Не удалось открыть выбор файла. Текст не изменился.');
      return;
    }
    if (!picked) return;
    if (picked.denied) {
      setNotice(picked.denied);
      return;
    }
    const problem = embedFileProblem(picked, kind, policy);
    if (problem) {
      setNotice(problem);
      return;
    }

    uploading.current = true;
    setBusy(kind);
    busyListener.current?.(true);
    try {
      const view = await contentAssetsApi.upload(token, picked, kind);
      setUploads((previous) => mergeEmbeds(previous, [view]));
      const now = latest.current;
      const target = replacing != null ? embedBlocks(now)[replacing] : null;
      // Описание загруженного уходит вместе с текстом, одним вызовом: экран, который
      // сворачивает поле (вопросы теста), держит его у себя, иначе после разворота карточка
      // говорила бы «Рисунок недоступен» до сохранения.
      if (target?.type === 'embed') {
        change.current?.(replaceEmbed(now, replacing, kind, view.id), { uploaded: view });
      } else {
        const next = insertEmbedAt(now, at, kind, view.id);
        cursor.current = { slot: next.index + 1 };
        change.current?.(next.value, { uploaded: view });
      }
    } catch (e) {
      setNotice(e?.message || 'Не удалось загрузить файл. Текст не изменился — попробуйте ещё раз.');
    } finally {
      uploading.current = false;
      setBusy(null);
      busyListener.current?.(false);
    }
  }

  function saveFormula(latex, display) {
    if (!formula) return;
    const next = formula.index < 0
      ? insertFormulaAtCursor(latest.current, cursor, latex, display)
      : replaceFormulaAt(latest.current, formula.index, latex, display);
    if (apply(next)) setFormula(null);
  }

  return (
    <View style={{ gap: 8, minWidth: 0 }}>
      {label ? <Txt style={{ fontSize: 13, fontWeight: '500', color: c.ink }}>{label}</Txt> : null}

      {rows.map((row, index) => {
        if (row.type === 'embed') {
          return (
            <EditorEmbedCard
              key={`row-${index}`}
              kind={row.kind}
              embed={known.get(row.id)}
              invalid={invalidEmbedId != null && invalidEmbedId === row.id}
              editable={!locked}
              canUp={canMoveEmbed(text, row.block, -1)}
              canDown={canMoveEmbed(text, row.block, 1)}
              canReplace={canInsert && !locked}
              onUp={() => change.current?.(moveEmbed(latest.current, row.block, -1))}
              onDown={() => change.current?.(moveEmbed(latest.current, row.block, 1))}
              onReplace={() => insertFile(row.kind, 'library', row.block)}
              onRemove={() => change.current?.(removeEmbed(latest.current, row.block))}
              onOpen={(embed) => setViewer(embed)}
            />
          );
        }
        const only = rows.length === 1;
        const budget = remaining == null
          ? undefined
          : row.type === 'text'
            ? row.text.length + remaining
            : Math.max(0, remaining - 1);
        return (
          <TextField
            key={`row-${index}`}
            value={row.type === 'text' ? row.text : ''}
            onChangeText={(next) => changeRow(row, next)}
            // Порядок «фокус → выделение» платформы не обещают: фокус ставит курсор в конец
            // строки, только если выделение этой строки ещё не пришло.
            onFocus={() => {
              const at = cursor.current;
              const same = row.type === 'text' ? at?.block === row.block : at?.slot === row.slot;
              if (!same) {
                cursor.current = row.type === 'text' ? { block: row.block, offset: row.text.length } : { slot: row.slot };
              }
            }}
            onSelectionChange={(event) => {
              cursor.current = row.type === 'text'
                ? { block: row.block, offset: event.nativeEvent.selection.start }
                : { slot: row.slot };
            }}
            // Подсказка одна у текстовой строки и у пустого места: поле с тем же ключом меняет
            // тип (вставка сдвигает строки, опустевший абзац становится пустым местом), а iOS не
            // перерисовывает подсказку, если вместе со значением меняется и она сама.
            placeholder={only ? placeholder : 'Текст'}
            accessibilityLabel={only ? label || placeholder : 'Текст рядом со вставкой'}
            multiline
            editable={!locked}
            maxLength={budget}
            error={only ? error : undefined}
            inputStyle={[{ minHeight: only ? minHeight : 46 }, inputStyle]}
          />
        );
      })}

      {rows.length !== 1 && error ? (
        <Txt accessibilityRole="alert" style={{ fontSize: 12, color: c.red }}>{error}</Txt>
      ) : null}

      {editable && (canInsert || formulas) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {canInsert ? (
            <>
              <OutlineButton disabled={locked || full} onPress={() => insertFile('image', 'library')}>Фото</OutlineButton>
              {Platform.OS !== 'web' ? (
                <OutlineButton disabled={locked || full} onPress={() => insertFile('image', 'camera')}>Камера</OutlineButton>
              ) : null}
              <OutlineButton disabled={locked || full} onPress={() => insertFile('file')}>Документ</OutlineButton>
            </>
          ) : null}
          {formulas ? (
            <OutlineButton disabled={locked} onPress={() => setFormula({ index: -1, latex: '', display: false })}>
              Формула
            </OutlineButton>
          ) : null}
        </View>
      ) : null}

      {busy ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={c.blue} />
          <Txt style={{ fontSize: 13, color: c.inkMuted }}>
            {busy === 'image' ? 'Загружаем рисунок…' : 'Загружаем файл…'}
          </Txt>
        </View>
      ) : null}

      {notice ? (
        <Txt accessibilityRole="alert" style={{ fontSize: 13, lineHeight: 18, color: c.red }}>{notice}</Txt>
      ) : null}

      {mathSegments.length > 0 ? (
        <View style={{ gap: FORMULA.gap }}>
          <Txt style={{ fontSize: DOCUMENT.captionSize, color: c.inkMuted }}>Так увидит ученик</Txt>
          <RichText text={text} embeds={[...known.values()]} style={{ fontSize: DOCUMENT.bodySize, color: c.ink }} />
          {editable
            ? mathSegments.map((segment, index) => (
                <View key={index} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: FORMULA.gap }}>
                  <OutlineButton
                    disabled={locked}
                    onPress={() => setFormula({ index, latex: segment.value, display: segment.display })}
                  >
                    Изменить формулу {index + 1}
                  </OutlineButton>
                  <OutlineButton disabled={locked} onPress={() => change.current?.(removeFormulaAt(latest.current, index))}>
                    Удалить формулу {index + 1}
                  </OutlineButton>
                </View>
              ))
            : null}
        </View>
      ) : null}

      {viewer ? (
        <EmbedImageViewer
          uri={viewer.originalUrl ?? viewer.url}
          title={viewer.fileName}
          onClose={() => setViewer(null)}
        />
      ) : null}
      {formula ? (
        <FormulaEditor editing={formula} profile={profile} onClose={() => setFormula(null)} onSave={saveFormula} />
      ) : null}
    </View>
  );
}

/** id для примерки длины до загрузки: маркер того же размера, что настоящий. */
const PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Формула в место курсора. Курсор в пустом месте между вставками — новая строка текста там же;
 * курсора нет — в конец последнего абзаца, а не приклеенной к маркеру в конце значения: строка
 * «маркер + формула» уже не маркер.
 */
function insertFormulaAtCursor(value, cursor, latex, display) {
  const blocks = embedBlocks(value);
  const at = cursor.current;
  const target = at?.block != null ? blocks[at.block] : null;
  if (target?.type === 'text') {
    const next = insertFormulaAt(target.text, at.offset, latex, display);
    cursor.current = { block: at.block, offset: next.cursor };
    return updateTextBlock(value, at.block, next.text);
  }
  if (at?.slot != null) {
    const next = insertFormulaAt('', 0, latex, display);
    cursor.current = { block: at.slot, offset: next.cursor };
    return fillSlot(value, at.slot, next.text);
  }
  const last = blocks.length - 1;
  if (last >= 0 && blocks[last].type === 'text') {
    const next = insertFormulaAt(blocks[last].text, blocks[last].text.length, latex, display);
    cursor.current = { block: last, offset: next.cursor };
    return updateTextBlock(value, last, next.text);
  }
  const next = insertFormulaAt('', 0, latex, display);
  cursor.current = { block: blocks.length, offset: next.cursor };
  return fillSlot(value, blocks.length, next.text);
}

/** Карточка вставки в редакторе: что это и четыре действия, как в вебе. */
function EditorEmbedCard({
  kind,
  embed,
  invalid,
  editable,
  canUp,
  canDown,
  canReplace,
  onUp,
  onDown,
  onReplace,
  onRemove,
  onOpen,
}) {
  const { c } = useTheme();
  const noun = kind === 'image' ? 'рисунок' : 'файл';
  const available = embed && embed.available !== false;
  const title = available ? embed.fileName : kind === 'image' ? 'Рисунок недоступен' : 'Файл недоступен';
  const caption = invalid
    ? 'Сервер не нашёл этот файл — замените или удалите его'
    : available && embed.sizeBytes != null
      ? `${kind === 'image' ? 'Рисунок' : (embed.extension || 'файл').toUpperCase()} · ${formatFileSize(embed.sizeBytes)}`
      : kind === 'image' ? 'Рисунок' : 'Файл';

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: invalid ? 2 : 1,
        borderColor: invalid ? c.red : c.border,
        backgroundColor: c.surface,
        padding: 10,
        gap: 10,
      }}
    >
      <Pressable
        accessibilityRole={kind === 'image' && available ? 'imagebutton' : undefined}
        accessibilityLabel={kind === 'image' && available ? `Рисунок «${embed.fileName}». Открыть крупно` : title}
        disabled={!(kind === 'image' && available)}
        onPress={() => onOpen(embed)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        {kind === 'image' && available ? (
          <Image
            source={{ uri: embed.url }}
            resizeMode="cover"
            style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: c.bg2 }}
          />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: c.bg2, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontSize: 10, fontWeight: '800', color: c.inkMuted }}>
              {available ? (embed.extension || noun).toUpperCase() : '—'}
            </Txt>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', color: available ? c.ink : c.inkMuted }}>
            {title}
          </Txt>
          <Txt style={{ fontSize: 12, color: invalid ? c.red : c.inkMuted }}>{caption}</Txt>
        </View>
      </Pressable>

      {editable ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <CardAction label="Выше" hint={`Переместить ${noun} выше`} disabled={!canUp} onPress={onUp} />
          <CardAction label="Ниже" hint={`Переместить ${noun} ниже`} disabled={!canDown} onPress={onDown} />
          {canReplace ? <CardAction label="Заменить" hint={`Заменить ${noun}`} onPress={onReplace} /> : null}
          <CardAction label="Удалить" hint={`Удалить ${noun}`} tone="danger" onPress={onRemove} />
        </View>
      ) : null}
    </View>
  );
}

function CardAction({ label, hint, onPress, disabled = false, tone }) {
  const { c } = useTheme();
  const color = disabled ? c.ink3 : tone === 'danger' ? c.red : c.blue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight: 34,
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: pressed ? c.bg2 : c.surface,
      })}
    >
      <Txt style={{ fontSize: 13, fontWeight: '600', color }}>{label}</Txt>
    </Pressable>
  );
}

/** Типы, которые предложит системный выбор документа: по списку расширений из политики. */
const FILE_MIME = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const IMAGE_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * Рисунок из галереи или с камеры. На iOS галерея по умолчанию отдаёт HEIC, который сервер
 * как рисунок не примет (A§3.2) — поэтому `Compatible`: система сама перекодирует его в JPEG.
 *
 * Разрешение спрашивается только у камеры. Галерея — системный выбор фото (PHPicker на iOS 14+,
 * Photo Picker на Android): приложение получает лишь выбранный снимок, и доступ ко всей медиатеке
 * ему не нужен. Спрашивать его значило бы показать учителю «полный доступ к медиатеке», а после
 * отказа не дать вставить фото вовсе, хотя выбор работал бы и так (проверено на симуляторе).
 * Отказ камере — понятная фраза, а не исключение: текст поля при этом не меняется.
 */
async function pickImage(source) {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { denied: 'Разрешите доступ к камере в настройках телефона. Текст не изменился.' };
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    return result.canceled ? null : fromImageAsset(result.assets?.[0]);
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.85,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  return result.canceled ? null : fromImageAsset(result.assets?.[0]);
}

/**
 * Имя файла — по фактическому типу: пикер может отдать JPEG под именем `IMG_0001.HEIC`
 * (перекодированный снимок) или вовсе без имени (Android), а форма и сервер судят по нему.
 */
function fromImageAsset(asset) {
  if (!asset) return null;
  const type = asset.mimeType || 'image/jpeg';
  const expected = IMAGE_EXTENSION[type];
  let name = asset.fileName || '';
  const current = /\.([^.]+)$/.exec(name)?.[1]?.toLowerCase();
  if (!name) name = `photo-${Date.now()}.${expected || 'jpg'}`;
  else if (expected && current !== expected && !(expected === 'jpg' && current === 'jpeg')) {
    name = `${name.replace(/\.[^.]+$/, '')}.${expected}`;
  }
  return { uri: asset.uri, name, type, size: asset.fileSize ?? null, file: asset.file };
}

async function pickDocument(policy) {
  const types = [...new Set((policy?.file?.extensions ?? []).map((extension) => FILE_MIME[extension]).filter(Boolean))];
  const result = await DocumentPicker.getDocumentAsync({
    multiple: false,
    copyToCacheDirectory: true,
    type: types.length > 0 ? types : '*/*',
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset) return null;
  const extension = /\.([^.]+)$/.exec(asset.name || '')?.[1]?.toLowerCase();
  return {
    uri: asset.uri,
    name: asset.name || 'file',
    type: asset.mimeType || FILE_MIME[extension] || 'application/octet-stream',
    size: asset.size ?? null,
    file: asset.file,
  };
}
