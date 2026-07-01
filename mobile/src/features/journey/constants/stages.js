export const STAGES = [
  {
    id: 'start',
    order: 1,
    name: 'Первый шаг',
    buildingLabel: 'Старт',
    description: 'Стартовый этап, где ученик начинает свой путь.',
    tasks: [
      'Заполнить профиль ученика',
      'Выбрать цель на четверть',
      'Пройти стартовый мини-опрос',
    ],
    reward: { points: 20, stars: 1 },
    icon: 'flag',
    emoji: '🚀',
    accent: '#2C4A9E',
    isStart: true,
  },
  {
    id: 'discipline',
    order: 2,
    name: 'Дом дисциплины',
    buildingLabel: 'Дисциплина',
    description: 'Этап про школьные привычки, порядок и ответственность.',
    tasks: [
      'Прийти вовремя на уроки 5 дней подряд',
      'Не получить замечаний за неделю',
      'Соблюдать школьные правила',
    ],
    reward: { points: 30, stars: 1 },
    icon: 'school',
    emoji: '🏫',
    accent: '#4A463E',
  },
  {
    id: 'knowledge',
    order: 3,
    name: 'Башня знаний',
    buildingLabel: 'Знания',
    description: 'Этап про учебные успехи и активность на уроках.',
    tasks: [
      'Получить 5 пятёрок за четверть по любому предмету',
      'Выполнить 3 домашних задания вовремя',
      'Получить 5 звёздочек от учителя',
    ],
    reward: { points: 40, badge: 'Knowledge Starter' },
    icon: 'library',
    emoji: '🗼',
    accent: '#2C4A9E',
  },
  {
    id: 'library',
    order: 4,
    name: 'Библиотека',
    buildingLabel: 'Чтение',
    description: 'Этап про чтение, развитие мышления и работу с текстом.',
    tasks: [
      'Прочитать одну книгу или рассказ',
      'Написать короткий отзыв',
      'Ответить на вопросы по прочитанному материалу',
    ],
    reward: { points: 35, stars: 1 },
    icon: 'book',
    emoji: '📚',
    accent: '#F2B73D',
  },
  {
    id: 'lab',
    order: 5,
    name: 'Лаборатория навыков',
    buildingLabel: 'Навыки',
    description: 'Этап про развитие навыков, практику и личный прогресс.',
    tasks: [
      'Пройти мини-тест',
      'Сделать небольшой учебный проект',
      'Улучшить результат по одному предмету',
    ],
    reward: { points: 45, badge: 'Skill Builder' },
    icon: 'flask',
    emoji: '🔬',
    accent: '#2C4A9E',
  },
  {
    id: 'team',
    order: 6,
    name: 'Дом команды',
    buildingLabel: 'Команда',
    description: 'Этап про командную работу, помощь и участие в жизни класса.',
    tasks: [
      'Поучаствовать в групповой работе',
      'Помочь однокласснику',
      'Принять участие в классной активности',
    ],
    reward: { points: 40, badge: 'Team Player' },
    icon: 'people',
    emoji: '🤝',
    accent: '#F2B73D',
  },
  {
    id: 'academy',
    order: 7,
    name: 'Академия достижений',
    buildingLabel: 'Академия',
    description: 'Этап для более сильных учебных результатов.',
    tasks: [
      'Набрать 10 пятёрок за четверть',
      'Закрыть все домашние задания за неделю',
      'Получить похвалу от учителя',
    ],
    reward: { points: 60, stars: 2 },
    icon: 'ribbon',
    emoji: '🎓',
    accent: '#D63030',
  },
  {
    id: 'leadership',
    order: 8,
    name: 'Башня лидерства',
    buildingLabel: 'Лидерство',
    description: 'Этап про инициативу, самостоятельность и лидерские качества.',
    tasks: [
      'Проявить инициативу в классе',
      'Помочь организовать школьную активность',
      'Подготовить мини-презентацию или выступление',
    ],
    reward: { points: 70, badge: 'Young Leader' },
    icon: 'trophy',
    emoji: '👑',
    accent: '#D69A1E',
  },
  {
    id: 'mountain',
    order: 9,
    name: 'Гора цели',
    buildingLabel: 'Финал',
    description: 'Финальная цель ученика — вершина пути героя.',
    tasks: [
      'Пройти все предыдущие этапы',
      'Собрать нужное количество звёзд',
      'Завершить задания на карте',
    ],
    reward: { badge: 'Goal Achieved', special: 'Goal Achieved' },
    icon: 'mountain',
    emoji: '🏔️',
    accent: '#2A8847',
    isFinal: true,
  },
];

export const STAGE_ORDER = STAGES.map((s) => s.id);

export function getInitialProgress() {
  const stageStatuses = {};
  STAGES.forEach((stage, index) => {
    stageStatuses[stage.id] = index === 0 ? 'open' : 'locked';
  });
  return {
    stageStatuses,
    stats: { points: 0, stars: 0, badges: [] },
    goalAchieved: false,
  };
}

export const STORAGE_KEY = '@fiztex_journey_progress';
