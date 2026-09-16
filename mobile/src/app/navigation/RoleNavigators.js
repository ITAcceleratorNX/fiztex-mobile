import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from './CustomTabBar';
import { SelectedChildProvider } from '@shared/state/SelectedChild';
import { withNav } from './withNav';
import { NotificationsScreen } from '@features/notifications';
import { ScheduleScreen } from '@features/schedule';
import {
  LessonCardScreen,
  LessonMaterialsScreen,
  LessonTextbookViewerScreen,
  StudentLessonScreen,
} from '@features/lesson';
import { AttendanceScreen, QrScanScreen } from '@features/attendance';
import {
  JournalScreen, JournalStudentScreen, LessonGradesScreen,
  ParentGradesScreen, StudentGradesScreen, StudentSubjectGradesScreen,
} from '@features/grades';
import {
  StudentCheckoutQR,
  StudentClubs, StudentClub, StudentTest, StudentAITest, StudentEvents, StudentAchievements,
  StudentMap, StudentShop, StudentProfile,
} from '@features/student';
import { StudentHeroes } from '@features/journey';
import {
  ParentAttendance, ParentFeedback, ParentService, ParentProfile,
} from '@features/parent';
import {
  TeacherScanner, TeacherAIUpload,
  TeacherFeedbackWrite, TeacherProfile, TeacherHomework,
  TeacherHomeworkCardScreen, TeacherHomeworkFormScreen, TeacherHomeworkQuestionsScreen,
  TeacherSubmissionScreen,
  TeacherLessonHomeworkScreen,
} from '@features/teacher';
import {
  StudentHomeworkScreen, StudentHomeworkDetailScreen, StudentHomeworkTestScreen,
  ParentHomeworkScreen, ParentHomeworkDetailScreen,
} from '@features/homework';
// Опросы: список и прохождение — один и тот же экран для ученика и родителя (см.
// `SurveyListScreen`), backend сам решает, что вернуть по токену.
// Тест школьного психолога — тоже опрос (PSYCHOLOGIST-002) и проходится тем же экраном.
import { SurveyListScreen, SurveyTakeScreen } from '@features/survey';
// Главные экраны трёх ролей живут отдельным модулем: они делят шапку, карточку
// расписания и плитку оценок, и все три читают бэкенд, а не макетные данные.
import { StudentHomeScreen, ParentHomeScreen, TeacherHomeScreen } from '@features/home';
// Психолог: весь цикл опроса с телефона (PSYCHOLOGIST-002) — список, карточка, вопросы,
// классы, результаты и именные ответы.
import {
  PsychologistSurveysScreen, SurveyCardScreen, SurveyFormScreen, SurveyQuestionsScreen,
  SurveyAudienceScreen, SurveyResultsScreen, SurveyRespondentScreen,
} from '@features/psychologist';
// Сервисные заявки: один и тот же авторский модуль у учителя, администратора и охраны
// (ТЗ SERVICE-FE-002 §16). Роль решает, откуда в него входят, а не что внутри.
import {
  ServiceRequestsScreen, ServiceRequestCreateScreen, ServiceRequestCardScreen, StaffProfileScreen,
} from '@features/service';
import {
  SecurityOnPostScreen, SecurityIssuedScreen, KeyHistoryScreen,
  KeyDetailScreen, KeyRecipientScreen, KeyGroupFormScreen,
} from '@features/keys';
// Техника и инвентарь — раздел Super Admin (ТЗ «Техника и инвентарь» §2, §9).
import {
  EquipmentStockScreen, EquipmentIssuedScreen, EquipmentHistoryScreen,
  EquipmentDetailScreen, EquipmentRecipientScreen, EquipmentFormScreen,
} from '@features/equipment';

const tabScreenOptions = { headerShown: false };

/**
 * Экраны сервисных заявок, общие для всех авторских ролей.
 *
 * Набор один, потому что сценарий один (§16): различается только вход — у учителя это
 * профиль, у администратора и охраны сам раздел стоит вкладкой.
 */
const SERVICE_DETAILS = [
  { name: 'service-requests', comp: ServiceRequestsScreen },
  { name: 'service-request', comp: ServiceRequestCardScreen },
  { name: 'service-request-create', comp: ServiceRequestCreateScreen },
];
const stackScreenOptions = { headerShown: false };

function StudentSchedule(props) {
  return <ScheduleScreen {...props} role="student" />;
}

function ParentSchedule(props) {
  return <ScheduleScreen {...props} role="parent" />;
}

function TeacherSchedule(props) {
  return <ScheduleScreen {...props} role="teacher" />;
}

function StudentSurveyList(props) {
  return <SurveyListScreen {...props} role="student" />;
}

function ParentSurveyList(props) {
  return <SurveyListScreen {...props} role="parent" />;
}

function renderTabs(Tab, tabs) {
  return tabs.map((t) => (
    <Tab.Screen
      key={t.name}
      name={t.name}
      component={withNav(t.comp)}
      options={{ tabLabel: t.label, iconName: t.icon }}
    />
  ));
}

function renderDetails(Stack, details) {
  return details.map((d) => <Stack.Screen key={d.name} name={d.name} component={withNav(d.comp)} />);
}

// ─── Student — Figma: Home / Schedule / Diary / Profile ───────────────────────
const SStack = createNativeStackNavigator();
const STab = createBottomTabNavigator();

function StudentTabs() {
  return (
    <STab.Navigator tabBar={(p) => <CustomTabBar {...p} currentLesson />} screenOptions={tabScreenOptions}>
      {renderTabs(STab, [
        { name: 'home', comp: StudentHomeScreen, label: 'Главная', icon: 'home' },
        { name: 'schedule', comp: StudentSchedule, label: 'Расписание', icon: 'calendar' },
        // «Задания» встали третьей вкладкой, как в макете (Figma 853:19518). «Дневник»
        // при этом остался: в макете его не рисовали, но раздел рабочий, и вытеснять
        // его ради экрана, который в макете просто занял ту же позицию, не за что.
        { name: 'homework', comp: StudentHomeworkScreen, label: 'Задания', icon: 'fileText' },
        // «Оценки» вместо прежнего мокового дневника: раздел показывает предметы,
        // оценки и средние с бэка (Figma `student-grades-subjects`).
        { name: 'diary', comp: StudentGradesScreen, label: 'Оценки', icon: 'book' },
        { name: 'profile', comp: StudentProfile, label: 'Я', icon: 'user' },
      ])}
    </STab.Navigator>
  );
}

export function StudentApp() {
  return (
    <SStack.Navigator screenOptions={stackScreenOptions}>
      <SStack.Screen name="Tabs" component={StudentTabs} />
      {renderDetails(SStack, [
        { name: 'lesson', comp: StudentLessonScreen },
        // Материалы урока — один экран на все три роли: что показывать, решает бэк,
        // отдавая ученику только то, что учитель открыл.
        { name: 'lesson-materials', comp: LessonMaterialsScreen },
        // Учебник урока — как материалы: файл отдаётся через урок, и экран один на ученика
        // и родителя.
        { name: 'lesson-textbook', comp: LessonTextbookViewerScreen },
        { name: 'attendance-scan', comp: QrScanScreen },
        { name: 'homework-card', comp: StudentHomeworkDetailScreen },
        { name: 'homework-test', comp: StudentHomeworkTestScreen },
        { name: 'survey-list', comp: StudentSurveyList },
        { name: 'survey-take', comp: SurveyTakeScreen },
        { name: 'checkout', comp: StudentCheckoutQR },
        { name: 'subject', comp: StudentSubjectGradesScreen },
        { name: 'clubs', comp: StudentClubs },
        { name: 'club', comp: StudentClub },
        { name: 'test', comp: StudentTest },
        { name: 'aitest', comp: StudentAITest },
        { name: 'events', comp: StudentEvents },
        { name: 'achievements', comp: StudentAchievements },
        { name: 'map', comp: StudentMap },
        { name: 'shop', comp: StudentShop },
        { name: 'heroes', comp: StudentHeroes },
        { name: 'notifications', comp: NotificationsScreen },
      ])}
    </SStack.Navigator>
  );
}

// ─── Parent — Home / Schedule / Grades / Profile ──────────────────────────────
const PStack = createNativeStackNavigator();
const PTab = createBottomTabNavigator();

function ParentTabs() {
  return (
    <PTab.Navigator tabBar={(p) => <CustomTabBar {...p} currentLesson />} screenOptions={tabScreenOptions}>
      {renderTabs(PTab, [
        { name: 'home', comp: ParentHomeScreen, label: 'Главная', icon: 'home' },
        { name: 'schedule', comp: ParentSchedule, label: 'Расписание', icon: 'calendar' },
        { name: 'homework', comp: ParentHomeworkScreen, label: 'Задания', icon: 'fileText' },
        // «Оценки» вместо мокового дневника: тот же ученический раздел в контексте
        // выбранного ребёнка (Figma `parent-multi-grades`).
        { name: 'grades', comp: ParentGradesScreen, label: 'Оценки', icon: 'book' },
        { name: 'profile', comp: ParentProfile, label: 'Я', icon: 'user' },
      ])}
    </PTab.Navigator>
  );
}

/**
 * Выбранный ребёнок — состояние всего родительского приложения, а не отдельного экрана
 * (`SelectedChildProvider`). Раньше выбор жил на каждом экране свой, и «Главная» с
 * «Расписанием» могли показывать разных детей; с кнопкой «Текущий урок» это перестало
 * быть терпимым — она в нижней панели, своего переключателя не имеет и обязана вести к
 * уроку выбранного ребёнка (ТЗ Быстрый доступ §2).
 */
export function ParentApp() {
  return (
    <SelectedChildProvider>
      <PStack.Navigator screenOptions={stackScreenOptions}>
        <PStack.Screen name="Tabs" component={ParentTabs} />
        {renderDetails(PStack, [
          // Родителю тот же экран: карточка одна на всех, а что в ней доступно, решает бэк
          // через capabilities — отдельный «родительский» экран разошёлся бы с ученическим.
          { name: 'lesson', comp: StudentLessonScreen },
          { name: 'lesson-materials', comp: LessonMaterialsScreen },
          { name: 'lesson-textbook', comp: LessonTextbookViewerScreen },
          // Карточка ДЗ у родителя своя, а не общая с учеником: ученическая показывает
          // ответ и форму отправки, а родителю не положено ни то, ни другое.
          { name: 'homework-card', comp: ParentHomeworkDetailScreen },
          { name: 'survey-list', comp: ParentSurveyList },
          { name: 'survey-take', comp: SurveyTakeScreen },
          { name: 'subject', comp: StudentSubjectGradesScreen },
          { name: 'attendance', comp: ParentAttendance },
          { name: 'service', comp: ParentService },
          { name: 'clubs', comp: StudentClubs },
          { name: 'club', comp: StudentClub },
          { name: 'events', comp: StudentEvents },
          { name: 'feedback', comp: ParentFeedback },
          { name: 'notifications', comp: NotificationsScreen },
        ])}
      </PStack.Navigator>
    </SelectedChildProvider>
  );
}

// ─── Teacher — Home / Schedule / Homework / Journal / Profile ──────────────────────────────
const TStack = createNativeStackNavigator();
const TTab = createBottomTabNavigator();

function TeacherTabs() {
  return (
    <TTab.Navigator tabBar={(p) => <CustomTabBar {...p} currentLesson />} screenOptions={tabScreenOptions}>
      {renderTabs(TTab, [
        { name: 'home', comp: TeacherHomeScreen, label: 'Сегодня', icon: 'home' },
        { name: 'schedule', comp: TeacherSchedule, label: 'Расписание', icon: 'calendar' },
        // «Задания» — третья вкладка, как в макете (Figma 868:247).
        { name: 'homework', comp: TeacherHomework, label: 'Задания', icon: 'fileText' },
        // Журнал — вкладка, как в макете (Figma `mobile-journal-list`): это
        // самостоятельный раздел, а не часть урока.
        { name: 'journal', comp: JournalScreen, label: 'Журнал', icon: 'book' },
        { name: 'profile', comp: TeacherProfile, label: 'Я', icon: 'user' },
      ])}
    </TTab.Navigator>
  );
}

export function TeacherApp() {
  return (
    <TStack.Navigator screenOptions={stackScreenOptions}>
      <TStack.Screen name="Tabs" component={TeacherTabs} />
      {renderDetails(TStack, [
        { name: 'lesson', comp: LessonCardScreen },
        { name: 'lesson-materials', comp: LessonMaterialsScreen },
        // Лист посещаемости открывается из карточки урока и в неё же возвращается —
        // отдельной вкладки у него нет: это часть урока, а не самостоятельный раздел.
        { name: 'attendance', comp: AttendanceScreen },
        // Оценки урока открываются с его карточки и в неё же возвращаются: это часть
        // урока. Журнал живёт отдельной вкладкой — у него другой вход и другой контекст.
        { name: 'lesson-grades', comp: LessonGradesScreen },
        { name: 'journal-student', comp: JournalStudentScreen },
        // Карточка задания и форма создания — этапы HOMEWORK-001/002/004; список уже ведёт на них.
        { name: 'homework-card', comp: TeacherHomeworkCardScreen },
        // Один экран на создание и правку: разница только в том, чем его заполняют.
        { name: 'homework-create', comp: TeacherHomeworkFormScreen },
        // Вопросы теста: вход с карточки задания, и только у теста — у работы текстом
        // вопросов не бывает вовсе.
        { name: 'homework-questions', comp: TeacherHomeworkQuestionsScreen },
        { name: 'homework-submission', comp: TeacherSubmissionScreen },
        // Задания конкретного урока — вход с его карточки.
        { name: 'lesson-homework', comp: TeacherLessonHomeworkScreen },
        { name: 'scanner', comp: TeacherScanner },
        { name: 'ai-upload', comp: TeacherAIUpload },
        { name: 'feedback-write', comp: TeacherFeedbackWrite },
        { name: 'notifications', comp: NotificationsScreen },
        ...SERVICE_DETAILS,
      ])}
    </TStack.Navigator>
  );
}

// ─── Охрана — физические ключи ──────────────────────────────────────────────
// Три вкладки повторяют рабочие очереди поста. Состояние ключа не хранится локально:
// каждая вкладка читает вычисленное сервером ON_POST / ISSUED, а команды лежат в стеке.
const SecurityStack = createNativeStackNavigator();
const SecurityTab = createBottomTabNavigator();

function SecurityTabs() {
  return (
    <SecurityTab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={tabScreenOptions}>
      {renderTabs(SecurityTab, [
        { name: 'keys-on-post', comp: SecurityOnPostScreen, label: 'На посту', icon: 'inbox' },
        { name: 'keys-issued', comp: SecurityIssuedScreen, label: 'Выданы', icon: 'key' },
        { name: 'keys-history', comp: KeyHistoryScreen, label: 'История', icon: 'history' },
        // Профиль охране был нужен и раньше: заявки она заводит (SERVICE-FE-002 §16), но
        // экраны висели зарегистрированными без единого входа, а выход прятался в меню
        // аватара. Экран тот же, что у служебных ролей, — он и так знает про охрану.
        { name: 'profile', comp: StaffProfileScreen, label: 'Я', icon: 'user' },
      ])}
    </SecurityTab.Navigator>
  );
}

export function SecurityApp() {
  return (
    <SecurityStack.Navigator screenOptions={stackScreenOptions}>
      <SecurityStack.Screen name="Tabs" component={SecurityTabs} />
      {renderDetails(SecurityStack, [
        { name: 'key-detail', comp: KeyDetailScreen },
        { name: 'key-recipient', comp: KeyRecipientScreen },
        { name: 'key-group-form', comp: KeyGroupFormScreen },
        // Сервисные заявки охраны остаются зарегистрированы как deep-link экраны: модуль
        // ключей не меняет серверное право охраны заводить и читать свои заявки.
        ...SERVICE_DETAILS,
      ])}
    </SecurityStack.Navigator>
  );
}

// ─── Super Admin — техника и инвентарь ────────────────────────────────────────
// Роль впервые получает мобильное приложение, и состоит оно ровно из одного раздела:
// ТЗ §9 просит мобильный flow учёта техники, а всё остальное Super Admin делает в панели.
// Три вкладки повторяют рабочие очереди: что на месте, что на руках и что происходило.
const SuperAdminStack = createNativeStackNavigator();
const SuperAdminTab = createBottomTabNavigator();

function SuperAdminTabs() {
  return (
    <SuperAdminTab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={tabScreenOptions}>
      {renderTabs(SuperAdminTab, [
        { name: 'equipment-stock', comp: EquipmentStockScreen, label: 'В наличии', icon: 'inbox' },
        { name: 'equipment-issued', comp: EquipmentIssuedScreen, label: 'Выдано', icon: 'laptop' },
        { name: 'equipment-history', comp: EquipmentHistoryScreen, label: 'История', icon: 'history' },
        // Профиль тот же, что у остальных ролей без школьной карточки: заявки, своё
        // имущество, настройки и выход. До него выход прятался в меню аватара на рабочем
        // экране — вторая кнопка того же действия посреди выдачи.
        { name: 'profile', comp: StaffProfileScreen, label: 'Я', icon: 'user' },
      ])}
    </SuperAdminTab.Navigator>
  );
}

export function SuperAdminApp() {
  return (
    <SuperAdminStack.Navigator screenOptions={stackScreenOptions}>
      <SuperAdminStack.Screen name="Tabs" component={SuperAdminTabs} />
      {renderDetails(SuperAdminStack, [
        { name: 'equipment-detail', comp: EquipmentDetailScreen },
        { name: 'equipment-recipient', comp: EquipmentRecipientScreen },
        { name: 'equipment-form', comp: EquipmentFormScreen },
        // Заявки Super Admin заводит наравне с остальными — экраны те же.
        ...SERVICE_DETAILS,
      ])}
    </SuperAdminStack.Navigator>
  );
}

// ─── Служебные роли — Заявки / Я ──────────────────────────────────────────────
// Учебных разделов у этих ролей нет: ни расписания, ни журнала, ни класса. Их
// приложение — сервисные заявки и профиль, поэтому список стоит вкладкой, а не
// открывается из профиля, как у учителя.
//
// Навигатор один для администратора, уборки и техслужбы. Экраны у них те же;
// различает их сам раздел: службе он показывает ещё и общую очередь своей службы
// (SERVICE-FE-003 §2), а администратору — только собственные заявки.
const StackStaff = createNativeStackNavigator();
const TabStaff = createBottomTabNavigator();

function StaffServiceRequests(props) {
  // `root` — экран открыт вкладкой: «Назад» с него вести некуда, и место под ним
  // занимает панель вкладок.
  return <ServiceRequestsScreen {...props} root />;
}

function StaffTabs() {
  return (
    <TabStaff.Navigator tabBar={(p) => <CustomTabBar {...p} />} screenOptions={tabScreenOptions}>
      {renderTabs(TabStaff, [
        { name: 'service-requests', comp: StaffServiceRequests, label: 'Заявки', icon: 'clipboardCheck' },
        { name: 'profile', comp: StaffProfileScreen, label: 'Я', icon: 'user' },
      ])}
    </TabStaff.Navigator>
  );
}

export function StaffApp() {
  return (
    <StackStaff.Navigator screenOptions={stackScreenOptions}>
      <StackStaff.Screen name="Tabs" component={StaffTabs} />
      {renderDetails(StackStaff, [
        { name: 'service-request', comp: ServiceRequestCardScreen },
        { name: 'service-request-create', comp: ServiceRequestCreateScreen },
        { name: 'notifications', comp: NotificationsScreen },
      ])}
    </StackStaff.Navigator>
  );
}

// ─── Психолог — опросы и профиль ──────────────────────────────────────────────
// Раньше здесь была заглушка «раздел в веб-панели»: приложение нужно было роли только для
// входа. Теперь весь цикл опроса живёт и в телефоне — завести, набрать вопросы, выбрать
// классы, опубликовать и читать ответы, — поэтому вкладок стало две. Профиль общий со
// служебными ролями: у психолога те же заявки, та же техника и те же настройки.
const StackPsychologist = createNativeStackNavigator();
const TabPsychologist = createBottomTabNavigator();

function PsychologistTabs() {
  return (
    <TabPsychologist.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={tabScreenOptions}>
      {renderTabs(TabPsychologist, [
        { name: 'surveys', comp: PsychologistSurveysScreen, label: 'Опросы', icon: 'clipboardCheck' },
        { name: 'profile', comp: StaffProfileScreen, label: 'Я', icon: 'user' },
      ])}
    </TabPsychologist.Navigator>
  );
}

export function PsychologistApp() {
  return (
    <StackPsychologist.Navigator screenOptions={stackScreenOptions}>
      <StackPsychologist.Screen name="Tabs" component={PsychologistTabs} />
      {renderDetails(StackPsychologist, [
        { name: 'survey-card', comp: SurveyCardScreen },
        { name: 'survey-form', comp: SurveyFormScreen },
        { name: 'survey-questions', comp: SurveyQuestionsScreen },
        { name: 'survey-audience', comp: SurveyAudienceScreen },
        { name: 'survey-results', comp: SurveyResultsScreen },
        { name: 'survey-respondent', comp: SurveyRespondentScreen },
        // Заявки психолог заводит с этого же приложения: своё разрешение у роли
        // появилось вместе с этими экранами, а исполнителем она не становится.
        ...SERVICE_DETAILS,
      ])}
    </StackPsychologist.Navigator>
  );
}
