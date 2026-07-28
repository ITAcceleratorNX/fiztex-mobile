import { APP_NAME } from '@shared/branding';

// Demo data for the branded prototype — ported verbatim from the web screens.

export const STUDENT = {
  name: 'Айкоркем С.',
  short: 'Айкоркем',
  grade: '4 «Б»',
  stars: 248,
  coins: 64,
  streak: 12,
  level: 7,
  levelTitle: 'Юный исследователь',
  levelProgress: 0.62,
  attendance: 0.96,
  classTeacher: 'Айгерим Болатовна',
};

export const SUBJECT_COLORS = {
  'Математика': { color: 'blue', emoji: '✦' },
  'Английский': { color: 'red', emoji: '★' },
  'Казахский язык': { color: 'green', emoji: '◆' },
  'Русский язык': { color: 'gold', emoji: '◉' },
  'Естествознание': { color: 'green', emoji: '✺' },
  'Чтение': { color: 'blue', emoji: '◇' },
  'Физкультура': { color: 'red', emoji: '▲' },
  'Музыка': { color: 'gold', emoji: '♪' },
  'Изо': { color: 'blue', emoji: '✤' },
  'Робототехника': { color: 'red', emoji: '◈' },
};

export const TODAY_SCHEDULE = [
  { time: '08:30', end: '09:10', subject: 'Математика', room: 'каб. 204', teacher: 'Айгерим Б.', status: 'done' },
  { time: '09:20', end: '10:00', subject: 'Английский', room: 'каб. 312', teacher: 'Ms. Linda', status: 'done' },
  { time: '10:20', end: '11:00', subject: 'Чтение', room: 'каб. 207', teacher: 'Алия Н.', status: 'now', progress: 0.6 },
  { time: '11:10', end: '11:50', subject: 'Естествознание', room: 'каб. 304', teacher: 'Дина К.', status: 'next' },
  { time: '12:30', end: '13:10', subject: 'Музыка', room: 'каб. 110', teacher: 'Серик Т.', status: 'upcoming' },
  { time: '13:20', end: '14:00', subject: 'Физкультура', room: 'спортзал', teacher: 'Тимур А.', status: 'upcoming' },
];

export const SUBJECTS_DIARY = [
  { name: 'Математика', avg: 4.7, last: [5, 5, 4, 5, 5, 4], trend: 'up', hw: 1 },
  { name: 'Английский', avg: 4.5, last: [5, 4, 5, 4, 5], trend: 'flat', hw: 0 },
  { name: 'Казахский язык', avg: 4.3, last: [4, 4, 5, 4, 4], trend: 'flat', hw: 2 },
  { name: 'Русский язык', avg: 4.8, last: [5, 5, 5, 4, 5, 5], trend: 'up', hw: 0 },
  { name: 'Естествознание', avg: 4.6, last: [5, 4, 5, 5], trend: 'up', hw: 1 },
  { name: 'Чтение', avg: 5.0, last: [5, 5, 5, 5], trend: 'flat', hw: 0 },
];

export const CLUBS = [
  { name: 'Робототехника LEGO', teacher: 'Ержан А.', schedule: 'Пн, Ср · 15:00', spots: 4, total: 12, color: 'red', enrolled: true, tag: 'Tech' },
  { name: 'Шахматы', teacher: 'Бахыт К.', schedule: 'Вт, Чт · 14:30', spots: 8, total: 16, color: 'blue', enrolled: false, tag: 'Логика' },
  { name: 'Театральная студия', teacher: 'Алина М.', schedule: 'Сб · 11:00', spots: 2, total: 14, color: 'gold', enrolled: false, tag: 'Творчество' },
  { name: 'Юный программист', teacher: 'Дамир Т.', schedule: 'Пн · 16:00', spots: 6, total: 10, color: 'green', enrolled: false, tag: 'Tech' },
  { name: 'Футбол', teacher: 'Тимур А.', schedule: 'Ср, Пт · 17:00', spots: 0, total: 20, color: 'red', enrolled: false, tag: 'Спорт', waitlist: true },
  { name: 'Юный исследователь', teacher: 'Дина К.', schedule: 'Чт · 15:30', spots: 5, total: 12, color: 'green', enrolled: true, tag: 'Наука' },
];

export const ACHIEVEMENTS = [
  { name: 'Без пропусков', desc: '30 дней подряд', icon: '★', color: 'gold', earned: true, stars: 50 },
  { name: 'Отличник недели', desc: 'Все пятёрки за неделю', icon: '◆', color: 'green', earned: true, stars: 40 },
  { name: 'Книголюб', desc: '10 книг прочитано', icon: '◉', color: 'blue', earned: true, stars: 30 },
  { name: 'Юный учёный', desc: '5 тестов на отлично', icon: '✺', color: 'red', earned: false, progress: 0.6, stars: 60 },
  { name: 'Командный игрок', desc: 'Участие в 3 кружках', icon: '▲', color: 'blue', earned: false, progress: 0.66, stars: 80 },
  { name: 'Полиглот', desc: '4 языка на 5', icon: '✦', color: 'gold', earned: false, progress: 0.5, stars: 100 },
];

export const EVENTS = [
  { name: 'Открытый урок: робототехника', date: '2 июня', time: '15:00', tag: 'Учебный', color: 'blue', going: true, vip: false },
  { name: `Зимний концерт ${APP_NAME}`, date: '14 июня', time: '18:00', tag: 'Концерт', color: 'red', going: false, vip: false },
  { name: 'Гала-ужин для родителей', date: '20 июня', time: '19:00', tag: 'VIP', color: 'gold', going: false, vip: true },
  { name: 'Спортивный день', date: '25 июня', time: '10:00', tag: 'Спорт', color: 'green', going: true, vip: false },
];

export const HOMEWORK = [
  { subject: 'Математика', task: '№ 215, 217 на стр. 88', due: 'до завтра', urgent: true, color: 'blue' },
  { subject: 'Чтение', task: 'Стр. 42–45 + рисунок героя', due: 'до завтра', urgent: true, color: 'blue' },
  { subject: 'Английский', task: 'Учить слова: animals', due: 'до пятницы', urgent: false, color: 'red' },
  { subject: 'Казахский', task: 'Упр. 12 устно', due: 'до пн.', urgent: false, color: 'green' },
  { subject: 'Естествозн.', task: 'Принести листик дерева', due: 'до чт.', urgent: false, color: 'green' },
];

export const AI_TESTS_AVAILABLE = [
  { subject: 'Чтение', title: 'Сказка «Алдар-Косе и бай»', qs: 5, reward: 20, color: 'blue', status: 'new' },
  { subject: 'Математика', title: 'Умножение на 7', qs: 6, reward: 24, color: 'blue', status: 'new' },
  { subject: 'Английский', title: 'Past Simple — глаголы', qs: 5, reward: 20, color: 'red', status: 'new' },
];

export const AI_TESTS_DONE = [
  { subject: 'Чтение', title: 'Стихи Абая', qs: 5, score: '5/5', color: 'blue', status: 'done', date: '23 мая' },
  { subject: 'Математика', title: 'Деление в столбик', qs: 6, score: '5/6', color: 'blue', status: 'done', date: '20 мая' },
];

export const AI_QUESTIONS = [
  {
    q: 'Кто главный герой сказки?',
    options: [
      { id: 'a', t: 'Алдар-Косе' },
      { id: 'b', t: 'Бай' },
      { id: 'c', t: 'Купец' },
      { id: 'd', t: 'Пастух' },
    ],
    correct: 'a',
  },
  {
    q: 'Что Алдар-Косе обещал баю взамен на шубу?',
    options: [
      { id: 'a', t: 'Деньги' },
      { id: 'b', t: 'Волшебное кольцо' },
      { id: 'c', t: 'Барана' },
      { id: 'd', t: 'Лошадь' },
    ],
    correct: 'b',
  },
  {
    q: 'Почему бай согласился отдать Алдар-Косе свою шубу?',
    options: [
      { id: 'a', t: 'Потому что он был щедрым' },
      { id: 'b', t: 'Потому что Алдар-Косе его обманул' },
      { id: 'c', t: 'Потому что наступил мороз' },
      { id: 'd', t: 'Потому что это был подарок' },
    ],
    correct: 'b',
  },
  {
    q: 'Какая главная черта характера Алдар-Косе?',
    options: [
      { id: 'a', t: 'Хитрость и смекалка' },
      { id: 'b', t: 'Жадность' },
      { id: 'c', t: 'Лень' },
      { id: 'd', t: 'Трусость' },
    ],
    correct: 'a',
  },
  {
    q: 'Чему учит эта сказка?',
    options: [
      { id: 'a', t: 'Богатые всегда правы' },
      { id: 'b', t: 'Жадность наказуема' },
      { id: 'c', t: 'Лучше молчать' },
      { id: 'd', t: 'Не доверять никому' },
    ],
    correct: 'b',
  },
];

export const PARENT = {
  name: 'Болат С.',
  short: 'Болат',
  children: [
    { name: 'Айкоркем', grade: '4 «Б»', avatar: 'green', status: 'В школе', lastSeen: '08:30' },
    { name: 'Тимур', grade: '2 «А»', avatar: 'blue', status: 'В школе', lastSeen: '08:28' },
  ],
};

export const ATTENDANCE_LOG = [
  { d: 'Сегодня', time: '08:30', kind: 'in', room: 'Главный вход', icon: 'arrowRight', color: 'green' },
  { d: 'Сегодня', time: '08:33', kind: 'class', room: 'Каб. 204 · Математика', icon: 'check', color: 'green' },
  { d: 'Сегодня', time: '10:00', kind: 'class', room: 'Каб. 312 · Английский', icon: 'check', color: 'green' },
  { d: 'Вчера', time: '14:15', kind: 'out', room: 'Главный выход', icon: 'arrowRight', color: 'blue' },
  { d: 'Вчера', time: '14:00', kind: 'class', room: 'Каб. 207 · Чтение', icon: 'check', color: 'green' },
  { d: 'Вчера', time: '12:30', kind: 'late', room: 'Каб. 110 · Музыка', icon: 'clock', color: 'gold' },
];

export const FEEDBACK = {
  month: 'Май 2026',
  teacher: 'Айгерим Болатовна',
  rating: 4.8,
  strengths: ['Активно работает на уроке', 'Помогает одноклассникам', 'Прогресс в чтении'],
  improvements: ['Иногда забывает домашнее задание по математике'],
  body: 'Айкоркем показала отличные результаты в этом месяце. Особенно радует прогресс в чтении — стала читать с выражением и пересказывает прочитанное. На переменах остаётся доброжелательной, помогает другим. Прошу обратить внимание на регулярность выполнения домашних заданий по математике.',
};

export const TEACHER = {
  name: 'Айгерим Болатовна',
  short: 'Айгерим',
  subject: 'Математика · Кл. рук. 4Б',
};

export const CLASS_ROSTER = [
  { name: 'Айкоркем С.', avatar: 'green', present: true, late: false, grade: 5 },
  { name: 'Бахыт А.', avatar: 'blue', present: true, late: true, grade: 4 },
  { name: 'Виктория М.', avatar: 'red', present: true, late: false, grade: 5 },
  { name: 'Данияр К.', avatar: 'gold', present: false, late: false },
  { name: 'Ерболат Н.', avatar: 'green', present: true, late: false, grade: 4 },
  { name: 'Жания Т.', avatar: 'blue', present: true, late: false, grade: 5 },
  { name: 'Камила О.', avatar: 'red', present: true, late: false, grade: 5 },
  { name: 'Лиза Р.', avatar: 'green', present: false, late: false },
  { name: 'Мадияр Ж.', avatar: 'blue', present: true, late: false, grade: 4 },
  { name: 'Нурлан И.', avatar: 'gold', present: true, late: false, grade: 5 },
];
