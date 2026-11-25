#!/usr/bin/env node
/**
 * Профиль преподавателя для родителя (ТЗ «Достижения и сертификаты учителя» §5): модель экрана
 * и вход из карточки урока. Тот же приём, что у остальных `verify-*.cjs`: модуль собирается
 * проектным babel-пресетом и проверяется как есть.
 *
 * Запуск: node scripts/verify-teacher-profile.cjs
 */
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function load(relPath, stubs = {}) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
  });
  const fakeRequire = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id];
    return {};
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', '__DEV__', code)(fakeRequire, mod, mod.exports, false);
  return mod.exports;
}

const map = load('src/shared/api/teacherProfileMap.js');

const profile = map.mapTeacherProfile({
  teacherProfileId: 7,
  fullName: 'Наградова Анна Петровна',
  subjects: ['Физика', 'Астрономия'],
  achievements: [
    { id: 1, title: 'Диплом', categoryLabel: 'Диплом', receivedOn: '2026-05-20', organization: 'Минпросвещения', description: 'За победу', fileName: 'd.pdf' },
    { id: 2, title: 'Сертификат', fileName: 's.pdf' },
  ],
});
assert.strictEqual(profile.subjects, 'Физика, Астрономия');
assert.strictEqual(profile.achievements[0].meta, 'Диплом · 20 мая 2026 · Минпросвещения');
// Пустые необязательные поля не превращаются в «· ·».
assert.strictEqual(profile.achievements[1].meta, '');
assert.strictEqual(profile.achievements[1].description, null);
assert.strictEqual(map.formatReceivedOn('bad'), null);

assert.match(map.profileErrorText({ status: 404 }), /не ведёт уроки/);
assert.match(map.profileErrorText({ status: 0 }), /интернет/);

// Вход из урока: карта урока несёт id учителя, а экран урока передаёт его только родителю.
const lessonScreen = fs.readFileSync(path.join(ROOT, 'src/features/lesson/StudentLessonScreen.js'), 'utf8');
assert.match(lessonScreen, /onTeacherPress=\{isParent && childId && lesson\.teacherId/);
const lessonMap = fs.readFileSync(path.join(ROOT, 'src/shared/api/lessonMap.js'), 'utf8');
assert.match(lessonMap, /teacherId: lesson\.teacher\?\.id/);
const navigators = fs.readFileSync(path.join(ROOT, 'src/app/navigation/RoleNavigators.js'), 'utf8');
assert.match(navigators, /name: 'teacher-profile', comp: TeacherProfileScreen/);
assert.match(navigators, /name: 'teacher-achievement', comp: TeacherAchievementViewerScreen/);

console.log('verify-teacher-profile: ok');
