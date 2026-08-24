import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from './CustomTabBar';
import { withNav } from './withNav';
import { NotificationsScreen } from '@features/notifications';
import { ScheduleScreen } from '@features/schedule';
import { LessonCardScreen, StudentLessonScreen } from '@features/lesson';
import { AttendanceScreen } from '@features/attendance';
import {
  JournalScreen, JournalStudentScreen, LessonGradesScreen,
  ParentGradesScreen, StudentGradesScreen, StudentSubjectGradesScreen,
} from '@features/grades';
import {
  StudentHome, StudentCheckoutQR,
  StudentClubs, StudentClub, StudentTest, StudentAITest, StudentEvents, StudentAchievements,
  StudentMap, StudentShop, StudentProfile,
} from '@features/student';
import { StudentHeroes } from '@features/journey';
import {
  ParentHome, ParentAttendance, ParentFeedback, ParentService, ParentProfile,
} from '@features/parent';
import {
  TeacherHome, TeacherClass, TeacherScanner, TeacherAIUpload,
  TeacherFeedbackWrite, TeacherProfile, TeacherHomework,
  TeacherHomeworkCardScreen, TeacherHomeworkFormScreen, TeacherSubmissionScreen,
  TeacherLessonHomeworkScreen,
} from '@features/teacher';
import {
  StudentHomeworkScreen, StudentHomeworkDetailScreen,
  ParentHomeworkScreen, ParentHomeworkDetailScreen,
} from '@features/homework';

const tabScreenOptions = { headerShown: false };
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
    <STab.Navigator tabBar={(p) => <CustomTabBar {...p} />} screenOptions={tabScreenOptions}>
      {renderTabs(STab, [
        { name: 'home', comp: StudentHome, label: 'Главная', icon: 'home' },
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
        { name: 'homework-card', comp: StudentHomeworkDetailScreen },
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
    <PTab.Navigator tabBar={(p) => <CustomTabBar {...p} />} screenOptions={tabScreenOptions}>
      {renderTabs(PTab, [
        { name: 'home', comp: ParentHome, label: 'Главная', icon: 'home' },
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

export function ParentApp() {
  return (
    <PStack.Navigator screenOptions={stackScreenOptions}>
      <PStack.Screen name="Tabs" component={ParentTabs} />
      {renderDetails(PStack, [
        // Родителю тот же экран: карточка одна на всех, а что в ней доступно, решает бэк
        // через capabilities — отдельный «родительский» экран разошёлся бы с ученическим.
        { name: 'lesson', comp: StudentLessonScreen },
        // Карточка ДЗ у родителя своя, а не общая с учеником: ученическая показывает
        // ответ и форму отправки, а родителю не положено ни то, ни другое.
        { name: 'homework-card', comp: ParentHomeworkDetailScreen },
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
  );
}

// ─── Teacher — Home / Schedule / Class / Profile ──────────────────────────────
const TStack = createNativeStackNavigator();
const TTab = createBottomTabNavigator();

function TeacherTabs() {
  return (
    <TTab.Navigator tabBar={(p) => <CustomTabBar {...p} />} screenOptions={tabScreenOptions}>
      {renderTabs(TTab, [
        { name: 'home', comp: TeacherHome, label: 'Сегодня', icon: 'home' },
        { name: 'schedule', comp: TeacherSchedule, label: 'Расписание', icon: 'calendar' },
        // «Задания» встали третьей вкладкой, как в макете (Figma 868:247), но «Класс»
        // не вытеснили: в макете его просто не рисовали, а раздел рабочий.
        { name: 'homework', comp: TeacherHomework, label: 'Задания', icon: 'fileText' },
        // Журнал — вкладка, как в макете (Figma `mobile-journal-list`): это
        // самостоятельный раздел, а не часть урока, и открывают его чаще, чем класс.
        { name: 'journal', comp: JournalScreen, label: 'Журнал', icon: 'book' },
        { name: 'class', comp: TeacherClass, label: 'Класс', icon: 'user' },
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
        { name: 'homework-submission', comp: TeacherSubmissionScreen },
        // Задания конкретного урока — вход с его карточки.
        { name: 'lesson-homework', comp: TeacherLessonHomeworkScreen },
        { name: 'scanner', comp: TeacherScanner },
        { name: 'ai-upload', comp: TeacherAIUpload },
        { name: 'feedback-write', comp: TeacherFeedbackWrite },
        { name: 'notifications', comp: NotificationsScreen },
      ])}
    </TStack.Navigator>
  );
}
