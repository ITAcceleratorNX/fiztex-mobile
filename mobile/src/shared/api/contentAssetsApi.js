import { request, requestMultipart } from './client';
import { appendUpload } from './upload';

/**
 * Файлы для вставки в текст учебного материала (CONTENT-EMBED-001,
 * `fiztex-back/docs/content-embeds-contract.md`).
 *
 * Описания вставок уже сохранённого текста отсюда не берутся: они приходят вместе с
 * материалом (`embeds`), чьи права сервер уже проверил. Загружает только учитель.
 */
export const contentAssetsApi = {
  /** Что можно вставлять: включена ли загрузка, форматы, размеры и сколько вставок в поле. */
  policy(token) {
    return request('/api/content-assets/policy', { token });
  },

  /**
   * Загрузить один файл. `picked` — `{uri, name, type, file?}` (см. `appendUpload`),
   * `kind` — `'image'` (рисунок в тексте) или `'file'` (документ карточкой). Ответ — описание
   * вставки (`ContentEmbedView`), его `id` и становится маркером в тексте.
   */
  upload(token, picked, kind) {
    const form = new FormData();
    appendUpload(form, 'file', picked);
    return requestMultipart(`/api/content-assets?kind=${kind === 'image' ? 'IMAGE' : 'FILE'}`, form, { token });
  },
};
