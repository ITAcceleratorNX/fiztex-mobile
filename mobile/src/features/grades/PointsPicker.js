import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { COMPONENT_SHORT, GRADE_TYPE_LABELS } from '@shared/api/gradesMap';

const TEN_POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Выбор оценки в баллах (GRADES-003) — тело шита для четверти, которая считается по
 * политике оценивания. Пара к сетке шкалы «2…5±» в `LessonGradeSheet`; то же правило, что
 * у `PointsPicker` веба.
 *
 * <b>Что как оценивается, решает политика</b>: виды работ и их способ приходят в листе
 * (`workTypes`). У 10-балльной работы — сетка 1…10 и одно нажатие; у СОР и СОЧ — «балл из
 * максимума» с кнопкой «Сохранить». Максимум общий для работы, поэтому подставляется
 * последний введённый на этом уроке (`suggestedMax`).
 *
 * Вид работы выбирается первым и сам не сохраняется: смена вида может сменить способ
 * оценивания (7 из 10 → 15 из 20), и «новый вид со старым баллом» был бы неверной оценкой.
 */
export function PointsPicker({ grade, workTypes, defaultType, suggestedMax, busy, onSubmit }) {
  const { c } = useTheme();
  const [type, setType] = useState(grade?.gradeType ?? defaultType);
  const rule = (workTypes || []).find((item) => item.type === type);
  const tenPoint = rule?.scoring !== 'RAW_POINTS';

  const initialMax = () => {
    if (grade?.maxScore != null && grade?.gradeType === type && !tenPoint) return String(Number(grade.maxScore));
    const suggested = suggestedMax?.(type);
    return suggested != null ? String(suggested) : '';
  };
  const [score, setScore] = useState(
    grade?.score != null && !tenPoint ? String(Number(grade.score)) : '',
  );
  const [maxScore, setMaxScore] = useState(initialMax);

  // Шит переоткрывают на другой клетке — выбор начинается заново.
  useEffect(() => {
    setType(grade?.gradeType ?? defaultType);
  }, [grade?.id, grade?.gradeType, defaultType]);

  function changeType(next) {
    setType(next);
    const nextRule = (workTypes || []).find((item) => item.type === next);
    if (nextRule?.scoring === 'RAW_POINTS') {
      const suggested = suggestedMax?.(next);
      setMaxScore(suggested != null ? String(suggested) : '');
      setScore('');
    }
  }

  const rawScore = Number(score);
  const rawMax = Number(maxScore);
  // Подсказка, а не проверка: пределы всё равно проверяет сервер.
  const rawValid =
    score !== '' && maxScore !== '' && rawMax > 0 && rawScore >= 0 && rawScore <= rawMax;

  const inputStyle = {
    width: 72,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: c.ink,
  };

  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {(workTypes || []).map((item) => {
          const selected = item.type === type;
          return (
            <Pressable
              key={item.type}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              disabled={busy}
              onPress={() => changeType(item.type)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: selected ? 0 : 1,
                borderColor: c.borderStrong,
                backgroundColor: selected ? c.blue : c.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Txt style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : c.ink2 }}>
                {GRADE_TYPE_LABELS[item.type] || item.type}
                {item.component ? ` · ${COMPONENT_SHORT[item.component]}` : ' · не учит.'}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {tenPoint ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
          {TEN_POINTS.map((point) => {
            const selected = grade?.gradeType === type && Number(grade?.score) === point;
            return (
              <Pressable
                key={point}
                accessibilityRole="button"
                accessibilityLabel={`Балл ${point}`}
                accessibilityState={{ selected }}
                disabled={busy}
                onPress={() => onSubmit({ score: point, maxScore: 10 }, type)}
                style={({ pressed }) => ({
                  width: 60,
                  height: 44,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? c.blue : c.surface,
                  borderWidth: selected ? 0 : 1,
                  borderColor: c.borderStrong,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Txt style={{ fontSize: 16, fontWeight: '600', color: selected ? '#fff' : c.ink2 }}>
                  {point}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
          <TextInput
            accessibilityLabel="Балл"
            keyboardType="number-pad"
            placeholder="Балл"
            placeholderTextColor={c.ink3}
            value={score}
            onChangeText={(text) => setScore(text.replace(/[^\d]/g, ''))}
            style={inputStyle}
          />
          <Txt style={{ fontSize: 15, color: c.ink3 }}>из</Txt>
          <TextInput
            accessibilityLabel="Максимальный балл"
            keyboardType="number-pad"
            placeholder="Макс."
            placeholderTextColor={c.ink3}
            value={maxScore}
            onChangeText={(text) => setMaxScore(text.replace(/[^\d]/g, ''))}
            style={inputStyle}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy || !rawValid}
            onPress={() => onSubmit({ score: rawScore, maxScore: rawMax }, type)}
            style={({ pressed }) => ({
              flex: 1,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: rawValid ? c.blue : c.bg2,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Txt style={{ fontSize: 15, fontWeight: '700', color: rawValid ? '#fff' : c.ink3 }}>
              Сохранить
            </Txt>
          </Pressable>
        </View>
      )}
    </View>
  );
}
