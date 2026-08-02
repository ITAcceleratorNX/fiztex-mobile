import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from './CustomTabBar';
import { withNav } from './withNav';
import { NotificationsScreen } from '@features/notifications';
import { ScheduleScreen } from '@features/schedule';
import { LessonCardScreen, StudentLessonScreen } from '@features/lesson';
import {
  StudentHome, StudentCheckoutQR, StudentDiary, StudentSubject,
  StudentClubs, StudentClub, StudentTest, StudentAITest, StudentEvents, StudentAchievements,
  StudentMap, StudentShop, StudentProfile,
} from '@features/student';
import { StudentHeroes } from '@features/journey';
import {
  ParentHome, ParentAttendance, ParentGrades, ParentFeedback, ParentService, ParentProfile,
} from '@features/parent';
import {
  TeacherHome, TeacherClass, TeacherScanner, TeacherGradeEntry, TeacherAIUpload,
  TeacherFeedbackWrite, TeacherProfile,
} from '@features/teacher';

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
        { name: 'diary', comp: StudentDiary, label: 'Дневник', icon: 'book' },
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
        { name: 'checkout', comp: StudentCheckoutQR },
        { name: 'subject', comp: StudentSubject },
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
        { name: 'grades', comp: ParentGrades, label: 'Дневник', icon: 'book' },
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
        { name: 'subject', comp: StudentSubject },
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
        { name: 'scanner', comp: TeacherScanner },
        { name: 'grade-entry', comp: TeacherGradeEntry },
        { name: 'ai-upload', comp: TeacherAIUpload },
        { name: 'feedback-write', comp: TeacherFeedbackWrite },
        { name: 'notifications', comp: NotificationsScreen },
      ])}
    </TStack.Navigator>
  );
}
