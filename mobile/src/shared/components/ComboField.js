import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from './Txt';
import Icon from './Icon';
import { TextButton } from './TextButton';
import { Card, FieldLabel, TextField } from './ui';
import { shadowCard } from './Screen';
import { REQUEST } from '../theme/tokens';

/** Сколько совпадений показывать: дальше список не помогает, а мешает — пусть уточнят ввод. */
const MAX_MATCHES = 12;

/**
 * Поле с подсказками (Figma `Admin_Admissions`, A2–A3): вводят начало — под полем список
 * совпадений, выбрали — поле показывает выбранное и «Изменить». Для коротких справочников,
 * где выбор быстрее набрать, чем пролистать: класс по цифре параллели.
 *
 * Список стоит в потоке, а не поверх формы: всплывающий слой в RN — это `Modal`, а он
 * отбирает клавиатуру и прячет поле, в которое печатают.
 *
 * `options` — `{ value, label }`; `filter(options, query)` решает, что совпало, — правило
 * знает экран (класс ищут по цифре, а не по подстроке). Выбор хранит экран: здесь только ввод.
 *
 * `size="lg"` — как в макете заявки: поле 52, список — белое меню с тенью и строками 44 на радиусе 10
 * без разделителей, выбранная строка подсвечена (A2); выбранное — строка поля с «Изменить» (A3).
 */
export function ComboField({
  label,
  placeholder,
  selected,
  options,
  filter,
  onSelect,
  invalid = false,
  editable = true,
  keyboardType = 'default',
  emptyText = 'Ничего не нашлось',
  size = 'md',
}) {
  const { c } = useTheme();
  const lg = size === 'lg';
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);

  if (selected && !editing) {
    return (
      <View style={{ gap: lg ? REQUEST.labelGap : 6 }}>
        {label ? <FieldLabel size={size}>{label}</FieldLabel> : null}
        <View
          style={{
            minHeight: lg ? REQUEST.fieldHeight : 46,
            borderWidth: 1,
            borderColor: invalid ? c.red : c.border,
            borderRadius: lg ? REQUEST.fieldRadius : 10,
            backgroundColor: editable ? c.surface : c.bg2,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: lg ? REQUEST.fieldInset : 14,
            // У `TextButton` свои 8 по бокам: вместе с ними «Изменить» стоит на отступе поля.
            paddingRight: lg ? REQUEST.fieldInset - 8 : 0,
          }}
        >
          <Txt style={lg ? { flex: 1, fontSize: REQUEST.fieldTextSize, fontWeight: '500' } : { flex: 1, fontSize: 15 }}>
            {selected.label}
          </Txt>
          {editable ? (
            <TextButton
              onPress={() => {
                setQuery('');
                setEditing(true);
              }}
            >
              Изменить
            </TextButton>
          ) : null}
        </View>
      </View>
    );
  }

  const typed = query.trim();
  const matches = typed ? filter(options, typed) : [];

  return (
    <View style={{ gap: lg ? REQUEST.labelGap : 6 }}>
      <TextField
        size={size}
        label={label}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        keyboardType={keyboardType}
        invalid={invalid}
        editable={editable}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
      />
      {matches.length && lg ? (
        <View
          style={{
            padding: REQUEST.menuInset,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: REQUEST.fieldRadius,
            backgroundColor: c.surface,
            ...shadowCard,
          }}
        >
          {matches.slice(0, MAX_MATCHES).map((option) => {
            const active = selected?.value === option.value;
            return (
              <Pressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onSelect(option);
                  setEditing(false);
                  setQuery('');
                }}
                style={({ pressed }) => ({
                  minHeight: REQUEST.menuRowHeight,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  borderRadius: REQUEST.menuRowRadius,
                  backgroundColor: pressed || active ? c.blueSoft : 'transparent',
                })}
              >
                <Txt style={{ flex: 1, fontSize: REQUEST.fieldTextSize, fontWeight: active ? '600' : '500' }}>
                  {option.label}
                </Txt>
                {active ? <Icon name="check" size={18} color={c.blueInk} strokeWidth={2.4} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : matches.length ? (
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {matches.slice(0, MAX_MATCHES).map((option, index) => {
            const active = selected?.value === option.value;
            return (
              <Pressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onSelect(option);
                  setEditing(false);
                  setQuery('');
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: c.border,
                  backgroundColor: pressed || active ? c.blueSoft : 'transparent',
                })}
              >
                <Txt style={{ flex: 1, fontSize: 15, fontWeight: active ? '600' : '400' }}>{option.label}</Txt>
                {active ? <Icon name="check" size={18} color={c.blueInk} strokeWidth={2.4} /> : null}
              </Pressable>
            );
          })}
        </Card>
      ) : typed ? (
        <Txt style={{ fontSize: 12, color: c.inkMuted }}>{emptyText}</Txt>
      ) : null}
    </View>
  );
}
