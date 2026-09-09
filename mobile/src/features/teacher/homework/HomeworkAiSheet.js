import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Banner, Pill, PrimaryButton } from '@shared/components/ui';
import { useLessonMaterials } from '@shared/hooks/useLesson';
import { useHomeworkAiGeneration, useHomeworkAiQuota } from '@shared/hooks/useTeacherHomework';
import { jobOutcome, phaseLabel, quotaLabel } from '@shared/api/homeworkAiMap';

const PROMPT_MAX = 500;

/**
 * Генерация конспекта по материалам урока — с телефона (FE-M4).
 *
 * <p><b>Только конспект.</b> Тест с телефона не генерируется намеренно: его результат —
 * вопросы с ключом, а редактора вопросов в приложении нет. Сгенерировать то, чего нельзя
 * прочитать и поправить, значит отдать классу непроверенный машинный тест. Конспект
 * ложится в описание задания, которое правит обычная форма, — цикл замкнут.
 *
 * <p><b>Шит можно закрыть.</b> Задача живёт строкой в базе, а не в памяти экрана: учитель
 * ушёл на урок, вернулся — результат уже в задании. Поэтому во время ожидания это сказано
 * прямо, а карточка задания показывает «идёт генерация» и без открытого шита.
 *
 * Контракт — `.cursor/tasks/ai-homework/screens/HomeworkAiSheetMobile.md`.
 */
export function HomeworkAiSheet({
  visible,
  homeworkId,
  lessonId,
  existingJob,
  onClose,
  onApplied,
  onWriteManually,
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const quota = useHomeworkAiQuota({ enabled: visible });
  const { materials, loading: materialsLoading } = useLessonMaterials(visible ? lessonId : null);
  const generation = useHomeworkAiGeneration(homeworkId, { onApplied });

  const [selected, setSelected] = useState(null);
  const [prompt, setPrompt] = useState('');

  // Материалы предлагаются все: учитель приложил их к уроку ровно затем, чтобы по ним и
  // генерировали, а снятие галочки — исключение, а не норма. Скрытые от учеников тоже:
  // ключи к задачам — законный источник для составления, и видит их только учитель.
  useEffect(() => {
    if (!visible) return;
    setSelected(new Set(materials.map((m) => m.id)));
  }, [visible, materials]);

  // Зависим от самих функций, а не от объекта `generation`: он новый на каждом рендере,
  // и эффекты перезапускались бы вхолостую на каждое нажатие клавиши в поле промпта.
  const { adopt, reset } = generation;

  // Задача, начатая до открытия шита, продолжает ожидание здесь, а не начинается заново.
  useEffect(() => {
    if (visible && existingJob) adopt(existingJob);
  }, [visible, existingJob, adopt]);

  useEffect(() => {
    if (!visible) {
      setPrompt('');
      reset();
    }
  }, [visible, reset]);

  if (!visible) return null;

  const outcome = jobOutcome(generation.job);
  const exhausted = quota?.enabled === false || (quota?.remaining ?? 1) <= 0;
  const noLesson = lessonId == null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' }}
          onPress={onClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 8,
              paddingHorizontal: 16,
              paddingBottom: Math.max(24, insets.bottom + 12),
              gap: 14,
              maxHeight: '88%',
            }}
          >
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.stripeIdle }} />
            </View>

            <View style={{ gap: 4 }}>
              <Txt style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>
                Сгенерировать текст задания
              </Txt>
              <Txt style={{ fontSize: 13, fontWeight: '400', lineHeight: 19, color: c.inkMuted }}>
                По материалам урока. Результат — черновик: перечитайте его перед публикацией.
              </Txt>
            </View>

            {generation.running ? (
              <RunningBlock job={generation.job} />
            ) : outcome ? (
              <OutcomeBlock outcome={outcome} onClose={onClose} onWriteManually={onWriteManually} />
            ) : (
              <SetupBlock
                noLesson={noLesson}
                materials={materials}
                materialsLoading={materialsLoading}
                selected={selected}
                onToggle={(id) => setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })}
                prompt={prompt}
                onPrompt={setPrompt}
                quota={quota}
                exhausted={exhausted}
                starting={generation.starting}
                error={generation.error}
                onStart={() => generation.start({
                  materialIds: [...(selected || [])],
                  teacherPrompt: prompt,
                })}
              />
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Форма запуска: что взять и что попросить. */
function SetupBlock({
  noLesson, materials, materialsLoading, selected, onToggle,
  prompt, onPrompt, quota, exhausted, starting, error, onStart,
}) {
  const { c } = useTheme();

  if (noLesson) {
    return (
      <Banner icon="info" tone="soft">
        Генерация доступна у задания, привязанного к уроку: тема и материалы берутся оттуда.
      </Banner>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
      {error ? <Banner icon="alertTriangle" tone="soft">{error}</Banner> : null}

      <View style={{ gap: 8 }}>
        <SectionLabel>Материалы урока</SectionLabel>
        {materialsLoading ? (
          <ActivityIndicator color={c.blue} />
        ) : materials.length === 0 ? (
          // Не ошибка, а предупреждение о качестве: без материалов модель опирается на
          // одну тему урока, и задание выходит общее.
          <Txt style={{ fontSize: 13, lineHeight: 19, color: c.inkMuted }}>
            У урока нет материалов — модель составит задание по теме. Приложите конспект
            или презентацию к уроку, и результат станет точнее.
          </Txt>
        ) : (
          materials.map((material) => (
            <MaterialCheck
              key={material.id}
              material={material}
              checked={selected?.has(material.id)}
              onPress={() => onToggle(material.id)}
            />
          ))
        )}
      </View>

      <View style={{ gap: 6 }}>
        <SectionLabel>Что нужно получить</SectionLabel>
        <TextInput
          value={prompt}
          onChangeText={onPrompt}
          placeholder="например: коротко, с формулой плотности и одним примером"
          placeholderTextColor={c.ink3}
          multiline
          maxLength={PROMPT_MAX}
          textAlignVertical="top"
          style={{
            minHeight: 84,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.bg,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: c.ink,
          }}
        />
        <Txt style={{ fontSize: 11, color: c.ink3 }}>Необязательно</Txt>
      </View>

      <View style={{ gap: 10 }}>
        {quotaLabel(quota) ? (
          <Txt style={{ fontSize: 12, color: exhausted ? c.red : c.ink3 }}>{quotaLabel(quota)}</Txt>
        ) : null}
        <PrimaryButton disabled={exhausted || starting} onPress={onStart}>
          {starting ? 'Запускаю…' : 'Сгенерировать'}
        </PrimaryButton>
      </View>
    </ScrollView>
  );
}

/**
 * Ожидание. Фаза словами, а не спиннером: тридцать секунд неподвижного кружка читаются
 * как «зависло», и человек жмёт кнопку второй раз — то есть платит дважды.
 */
function RunningBlock({ job }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12, paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ActivityIndicator color={c.blue} />
        <Txt style={{ flex: 1, fontSize: 15, fontWeight: '600', color: c.ink }}>
          {phaseLabel(job)}
        </Txt>
      </View>
      <Txt style={{ fontSize: 13, lineHeight: 19, color: c.inkMuted }}>
        Окно можно закрыть — результат сохранится и дождётся вас.
      </Txt>
    </View>
  );
}

/** Исход: получилось, не применилось или не вышло. У каждого свои слова и своё действие. */
function OutcomeBlock({ outcome, onClose, onWriteManually }) {
  const { c } = useTheme();
  const tone = outcome.kind === 'failed' ? 'alertTriangle' : outcome.kind === 'done' ? 'check' : 'info';

  return (
    <View style={{ gap: 14, paddingVertical: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Icon name={tone} size={18} color={outcome.kind === 'failed' ? c.red : c.blue} strokeWidth={2} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{outcome.title}</Txt>
          {outcome.message ? (
            <Txt style={{ fontSize: 13, lineHeight: 19, color: c.inkMuted }}>{outcome.message}</Txt>
          ) : null}
        </View>
      </View>

      {/* У отказа всегда есть живой выход: приложение не сломалось, просто модель не
          справилась, и написать задание руками можно прямо сейчас. */}
      {outcome.kind === 'failed' ? (
        <PrimaryButton onPress={() => { onClose(); onWriteManually?.(); }}>
          Написать самому
        </PrimaryButton>
      ) : (
        <PrimaryButton onPress={onClose}>Понятно</PrimaryButton>
      )}
    </View>
  );
}

/** Строка материала с галочкой. Скрытый помечен — учитель должен знать, что берёт. */
function MaterialCheck({ material, checked, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(checked) }}
      accessibilityLabel={material.title}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: checked ? 0 : 1.5,
          borderColor: c.border,
          backgroundColor: checked ? c.blue : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
      </View>
      <Txt style={{ flex: 1, fontSize: 14, color: c.ink }} numberOfLines={1}>
        {material.title}
      </Txt>
      {material.hidden ? (
        <Pill color="gold" style={{ paddingVertical: 2, paddingHorizontal: 8, fontSize: 10 }}>
          Скрыт
        </Pill>
      ) : null}
    </Pressable>
  );
}

function SectionLabel({ children }) {
  const { c } = useTheme();
  return (
    <Txt
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: c.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      }}
    >
      {children}
    </Txt>
  );
}
