import React, { useRef, useState } from 'react';
import { Modal, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '@shared/theme/ThemeContext';
import { DOCUMENT, FORMULA } from '@shared/theme/tokens';
import { TextField, OutlineButton, ScreenHeader } from './ui';
import { Txt } from './Txt';
import { MathText } from '@shared/math/MathText';
import { FORMULA_EDITOR_HTML } from '@shared/math/formulaEditorAsset';
import { insertFormulaAt, removeFormulaAt, replaceFormulaAt, splitMath } from '@shared/math/formulaEditing';

/** Shared authoring field: editing a formula never replaces other formulas or surrounding text. */
export function FormulaField({ value = '', onChangeText, profile = 'GENERAL', editable = true, style, ...props }) {
  const { c } = useTheme();
  const cursor = useRef(null);
  const [editing, setEditing] = useState(null);
  const formulas = splitMath(value).filter(segment => segment.kind === 'math');
  function save(latex, display) {
    if (!editable || !editing) return;
    if (editing.index < 0) {
      const next = insertFormulaAt(value, cursor.current ?? value.length, latex, display);
      cursor.current = next.cursor; onChangeText(next.text);
    } else onChangeText(replaceFormulaAt(value, editing.index, latex, display));
    setEditing(null);
  }
  return <View style={[{ gap: FORMULA.gap, minWidth: 0 }, style]}>
    <TextField {...props} value={value} onChangeText={onChangeText} editable={editable}
      onSelectionChange={event => { cursor.current = event.nativeEvent.selection.start; }} />
    {editable && <OutlineButton onPress={() => setEditing({ index: -1, latex: '', display: false })}>Добавить формулу</OutlineButton>}
    {formulas.length > 0 && <>
      <Txt style={{ fontSize: DOCUMENT.captionSize, color: c.inkMuted }}>Так увидит ученик</Txt>
      <MathText text={value} style={{ fontSize: DOCUMENT.bodySize, color: c.ink }} />
      {editable && formulas.map((formula, index) => <View key={index} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: FORMULA.gap }}>
        <OutlineButton onPress={() => setEditing({ index, latex: formula.value, display: formula.display })}>Изменить формулу {index + 1}</OutlineButton>
        <OutlineButton onPress={() => onChangeText(removeFormulaAt(value, index))}>Удалить формулу {index + 1}</OutlineButton>
      </View>)}
    </>}
    {editing && <FormulaEditor editing={editing} profile={profile} onClose={() => setEditing(null)} onSave={save} />}
  </View>;
}

function FormulaEditor({ editing, profile, onClose, onSave }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const web = useRef(null);
  const initialized = useRef(false);
  const [error, setError] = useState(false);
  function init() {
    if (initialized.current || !web.current) return;
    initialized.current = true;
    const payload = { latex: editing.latex, display: editing.display, profile, theme: {
      ink: c.ink, surface: c.surface, border: c.border, accent: c.blue, error: c.red,
      'on-accent': c.heroInk, 'gutter': `${DOCUMENT.gutter}px`, 'body-size': `${DOCUMENT.bodySize}px`,
      'caption-size': `${DOCUMENT.captionSize}px`, 'formula-size': `${FORMULA.size}px`,
    } };
    web.current.injectJavaScript(`window.fxEditorInit && window.fxEditorInit(${JSON.stringify(payload)}); true;`);
  }
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: c.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Формула" back={onClose} />
      {error ? <ScrollView contentContainerStyle={{ padding: DOCUMENT.gutter }}>
        <Txt>Не удалось открыть редактор. Закройте окно и попробуйте снова; текст поля сохранён.</Txt>
        <OutlineButton onPress={onClose}>Закрыть</OutlineButton>
      </ScrollView> : <WebView ref={web} source={{ html: FORMULA_EDITOR_HTML }} originWhitelist={['about:*']}
        onLoadEnd={init} onError={() => setError(true)}
        onMessage={event => {
          let message; try { message = JSON.parse(event.nativeEvent.data); } catch { return; }
          if (message.editorReady) init();
          if (message.save && typeof message.save.latex === 'string' && typeof message.save.display === 'boolean') onSave(message.save.latex, message.save.display);
        }}
        onShouldStartLoadWithRequest={request => !request.url || request.url.startsWith('about:') || request.url.startsWith('data:')}
        automaticallyAdjustContentInsets={false} style={{ flex: 1, backgroundColor: c.surface }} />}
    </KeyboardAvoidingView>
  </Modal>;
}
