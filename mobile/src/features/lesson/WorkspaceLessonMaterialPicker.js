import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useAuth } from '@features/auth/AuthContext';
import { teacherWorkspaceApi } from '@shared/api/teacherWorkspaceApi';
import { Checkbox, FilterChip, OutlineButton, SelectionDialog, TextField } from '@shared/components/ui';
import Icon from '@shared/components/Icon';
import { Txt } from '@shared/components/Txt';
import { useWorkspaceLessonPicker } from '@shared/hooks/useWorkspaceLessonPicker';
import { useTheme } from '@shared/theme/ThemeContext';

const FORMATS = [
  { label: 'Все типы', value: '' }, { label: 'PDF', value: 'PDF' },
  { label: 'Word', value: 'WORD' }, { label: 'Таблица', value: 'SPREADSHEET' },
  { label: 'Презентация', value: 'PRESENTATION' }, { label: 'Изображение', value: 'IMAGE' },
];

/** Figma 2185:5019 — reusable documents for the current lesson. */
export function WorkspaceLessonMaterialPicker({ lessonId, onClose, onAttached }) {
  const { c } = useTheme();
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [fileType, setFileType] = useState('');
  const [formatOpen, setFormatOpen] = useState(false);
  const [folderId, setFolderId] = useState(null);
  const [page, setPage] = useState(0);
  const [folderPage, setFolderPage] = useState(0);
  const [selected, setSelected] = useState(new Map());
  const [busy, setBusy] = useState(false);
  const [attachError, setAttachError] = useState(false);
  const picker = useWorkspaceLessonPicker({ query, fileType, folderId, page, folderPage });
  const pages = picker.results?.totalPages ?? 0;
  const folderPages = picker.folders?.totalPages ?? 0;

  const toggle = (item) => setSelected((current) => {
    const next = new Map(current);
    if (next.has(item.id)) next.delete(item.id);
    else next.set(item.id, item);
    return next;
  });

  const attach = async () => {
    if (busy || !selected.size) return;
    setBusy(true);
    setAttachError(false);
    let added = false;
    try {
      for (const item of selected.values()) {
        await teacherWorkspaceApi.attachDocumentToLesson(token, lessonId, item.id);
        added = true;
        // A failed later item must not be retried alongside already attached ones.
        setSelected((current) => {
          const next = new Map(current);
          next.delete(item.id);
          return next;
        });
      }
      await onAttached();
      onClose();
    } catch {
      if (added) await onAttached();
      setAttachError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SelectionDialog visible title="Выбор материалов" onClose={onClose} onConfirm={attach}
      confirmLabel={selected.size ? `Добавить (${selected.size})` : 'Добавить'}
      disabled={!selected.size} busy={busy}>
      <View style={{ padding: 16, gap: 12 }}>
        <TextField value={query} onChangeText={(value) => { setQuery(value); setPage(0); }}
          placeholder="Поиск по названию" accessibilityLabel="Поиск по названию" />
        <View style={{ height: 36 }}>
          <FilterChip label={fileType ? FORMATS.find((item) => item.value === fileType)?.label : 'Тип материала'}
            onPress={() => setFormatOpen((open) => !open)} />
        </View>
        {formatOpen ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FORMATS.map((option) => (
            <Pressable key={option.value || 'all'} accessibilityRole="button"
              accessibilityState={{ selected: fileType === option.value }}
              onPress={() => { setFileType(option.value); setPage(0); setFormatOpen(false); }}
              style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                backgroundColor: fileType === option.value ? c.blueSoft : c.bg2 }}>
              <Txt style={{ fontSize: 12, fontWeight: '600', color: fileType === option.value ? c.blueInk : c.ink2 }}>
                {option.label}
              </Txt>
            </Pressable>
          ))}
        </View> : null}

        {picker.foldersError ? (
          <RetryLine onPress={picker.retryFolders} />
        ) : picker.foldersLoading ? <ActivityIndicator color={c.blue} /> : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', gap: 8 }}>
              <FolderChip label="Все материалы" selected={folderId == null}
                onPress={() => { setFolderId(null); setPage(0); }} />
              {picker.folders?.content?.map((folder) => folder.id != null && (
                <FolderChip key={folder.id} label={folder.name || `Папка №${folder.id}`}
                  selected={folderId === folder.id}
                  onPress={() => { setFolderId(folder.id); setPage(0); }} />
              ))}
            </ScrollView>
            {folderPages > 1 ? <PageControls page={folderPage} pages={folderPages}
              onPrevious={() => { setFolderId(null); setFolderPage(folderPage - 1); setPage(0); }}
              onNext={() => { setFolderId(null); setFolderPage(folderPage + 1); setPage(0); }} /> : null}
          </>
        )}
      </View>

      <ScrollView style={{ maxHeight: 270 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled">
        {picker.searchLoading ? <ActivityIndicator color={c.blue} style={{ marginVertical: 28 }} />
          : picker.searchError ? <RetryLine onPress={picker.retrySearch} />
            : picker.results?.content?.length ? picker.results.content.map((item) => (
              <View key={item.id} style={{ minHeight: 59, borderBottomWidth: 1, borderBottomColor: c.border,
                flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                <Icon name={item.fileExtension ? 'fileText' : 'link'} size={18} color={c.blueInk} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Checkbox checked={selected.has(item.id)} label={item.title || 'Материал'}
                    disabled={!item.selectable} onPress={() => toggle(item)} />
                  <Txt style={{ paddingLeft: 22, fontSize: 11, color: c.ink3 }} numberOfLines={1}>
                    {[item.fileExtension?.toUpperCase(), item.author].filter(Boolean).join(' · ') || 'Ссылка'}
                  </Txt>
                </View>
              </View>
            )) : <Txt style={{ textAlign: 'center', color: c.ink3, paddingVertical: 28 }}>
              Здесь пока нет материалов
            </Txt>}
        {!picker.searchLoading && !picker.searchError && pages > 1 ? <PageControls page={page}
          pages={pages} onPrevious={() => setPage(page - 1)} onNext={() => setPage(page + 1)} /> : null}
      </ScrollView>
      {attachError ? <Txt accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingBottom: 8, color: c.red }}>
        Не удалось добавить материалы. Повторите попытку.
      </Txt> : null}
    </SelectionDialog>
  );
}

function FolderChip({ label, selected, onPress }) {
  const { c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10,
      backgroundColor: selected ? c.blueSoft : c.bg2 }}>
    <Txt style={{ fontSize: 12, fontWeight: selected ? '700' : '500', color: selected ? c.blueInk : c.ink2 }}>
      {label}
    </Txt>
  </Pressable>;
}

function PageControls({ page, pages, onPrevious, onNext }) {
  const { c } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
    <OutlineButton onPress={onPrevious} disabled={page === 0}>Назад</OutlineButton>
    <Txt style={{ color: c.ink3, fontSize: 12 }}>{page + 1} / {pages}</Txt>
    <OutlineButton onPress={onNext} disabled={page + 1 >= pages}>Далее</OutlineButton>
  </View>;
}

function RetryLine({ onPress }) {
  const { c } = useTheme();
  return <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
    <Txt style={{ color: c.red, textAlign: 'center' }}>Не удалось загрузить данные</Txt>
    <OutlineButton onPress={onPress}>Повторить</OutlineButton>
  </View>;
}
