import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from './CustomTabBar';
import { withNav } from './withNav';
import { NotificationsScreen } from '../screens/misc';
import {
  StudentHome, StudentSchedule, StudentLesson, StudentCheckoutQR, StudentDiary, StudentSubject,
  StudentClubs, StudentClub, StudentTest, StudentAITest, StudentEvents, StudentAchievements,
  StudentHeroes, StudentMap, StudentShop, StudentProfile,
} from '../screens/student';
import {
  ParentHome, ParentAttendance, ParentGrades, ParentFeedback, ParentService, ParentProfile,
} from '../screens/parent';
import {
  TeacherHome, TeacherClass, TeacherScanner, TeacherGradeEntry, TeacherAIUpload,
  TeacherFeedbackWrite, TeacherProfile,
} from '../screens/teacher';

const tabScreenOptions = { headerShown: false };
const stackScreenOptions = { headerShown: false };

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

// ─── Student ──────────────────────────────────────────────────────────────────
const SStack = createNativeStackNavigator();
const STab = createBottomTabNavigator();

function StudentTabs() {
  return (
    <STab.Navigator tabBar={(p) => <CustomTabBar {...p} />} screenOptions={tabScreenOptions}>
      {renderTabs(STab, [
        { name: 'home', comp: StudentHome, label: 'Главная', icon: 'home' },
        { name: 'heroes', comp: StudentHeroes, label: 'Heroes', icon: 'heroes' },
        { name: 'test', comp: StudentTest, label: 'Учёба', icon: 'sparkle' },
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
        { name: 'schedule', comp: StudentSchedule },
        { name: 'lesson', comp: StudentLesson },
        { name: 'checkout', comp: StudentCheckoutQR },
        { name: 'diary', comp: StudentDiary },
        { name: 'subject', comp: StudentSubject },
        { name: 'clubs', comp: StudentClubs },
        { name: 'club', comp: StudentClub },
        { name: 'aitest', comp: StudentAITest },
        { name: 'events', comp: StudentEvents },
        { name: 'achievements', comp: StudentAchievements },
        { name: 'map', comp: StudentMap },
        { name: 'shop', comp: StudentShop },
        { name: 'notifications', comp: NotificationsScreen },
      ])}
    </SStack.Navigator>
  );
}

// ─── Parent ───────────────────────────────────────────────────────────────────
const PStack = createNativeStackNavigator();
const PTab = createBottomTabNavigator();

function ParentTabs() {
  return (
    <PTab.Navigator tabBar={(p) => <CustomTabBar {...p} />} screenOptions={tabScreenOptions}>
      {renderTabs(PTab, [
        { name: 'home', comp: ParentHome, label: 'Главная', icon: 'home' },
        { name: 'attendance', comp: ParentAttendance, label: 'Журнал', icon: 'calendar' },
        { name: 'grades', comp: ParentGrades, label: 'Дневник', icon: 'book' },
        { name: 'service', comp: ParentService, label: 'Сервис', icon: 'clean' },
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
        { name: 'schedule', comp: StudentSchedule },
        { name: 'lesson', comp: StudentLesson },
        { name: 'subject', comp: StudentSubject },
        { name: 'clubs', comp: StudentClubs },
        { name: 'club', comp: StudentClub },
        { name: 'events', comp: StudentEvents },
        { name: 'feedback', comp: ParentFeedback },
        { name: 'notifications', comp: NotificationsScreen },
      ])}
    </PStack.Navigator>
  );
}

// ─── Teacher ──────────────────────────────────────────────────────────────────
const TStack = createNativeStackNavigator();
const TTab = createBottomTabNavigator();

function TeacherTabs() {
  return (
    <TTab.Navigator tabBar={(p) => <CustomTabBar {...p} />} screenOptions={tabScreenOptions}>
      {renderTabs(TTab, [
        { name: 'home', comp: TeacherHome, label: 'Сегодня', icon: 'home' },
        { name: 'class', comp: TeacherClass, label: 'Класс', icon: 'user' },
        { name: 'grade-entry', comp: TeacherGradeEntry, label: 'Оценки', icon: 'pencil' },
        { name: 'ai-upload', comp: TeacherAIUpload, label: 'AI-тест', icon: 'sparkle' },
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
        { name: 'scanner', comp: TeacherScanner },
        { name: 'feedback-write', comp: TeacherFeedbackWrite },
        { name: 'notifications', comp: NotificationsScreen },
      ])}
    </TStack.Navigator>
  );
}
