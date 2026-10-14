const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');

function picker(type = 'SUMMATIVE_TERM', busy = false) {
  const state = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const id = cursor++;
      if (!(id in state)) state[id] = typeof initial === 'function' ? initial() : initial;
      return [state[id], value => { state[id] = typeof value === 'function' ? value(state[id]) : value; }];
    },
    useEffect() {},
  };
  function load(relative) {
    const filename = path.join(root, relative);
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      filename, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
    });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', code)((id) => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (id === 'react-native') return { View: 'View', Pressable: 'Pressable', TextInput: 'TextInput', ScrollView: 'ScrollView' };
      if (id === '@shared/theme/ThemeContext') return { useTheme: () => ({ c: {} }) };
      if (id === '@shared/components/Txt') return { Txt: 'Txt' };
      if (id === '@shared/api/gradesMap') return { COMPONENT_SHORT: {}, GRADE_TYPE_LABELS: {} };
      if (id === '@shared/api/gradePoints') return load('src/shared/api/gradePoints.js');
      if (id.startsWith('@babel/runtime')) return require(id);
      throw new Error(id);
    }, mod, mod.exports);
    return mod.exports;
  }
  const { PointsPicker } = load('src/features/grades/PointsPicker.js');
  const submissions = [];
  function render() {
    cursor = 0;
    const tree = PointsPicker({ defaultType: type, busy, suggestedMax: () => 20, workTypes: [
      { type: 'FORMATIVE', scoring: 'TEN_POINT' },
      { type: 'SUMMATIVE_SECTION', scoring: 'RAW_POINTS' },
      { type: 'SUMMATIVE_TERM', scoring: 'RAW_POINTS' },
    ], onSubmit: (...args) => submissions.push(args) });
    const nodes = [];
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      nodes.push(node);
      [node.props?.children].flat(Infinity).forEach(walk);
    }
    walk(tree);
    return nodes;
  }
  return { render, submissions };
}
const input = (nodes, label) => nodes.find(node => node.type === 'TextInput' && node.props.accessibilityLabel === label);
const save = nodes => nodes.find(node => node.type === 'Pressable' && node.props.children?.props?.children === 'Сохранить');

test('invalid points remain visible, produce an error and never submit', () => {
  for (const value of ['-1', '−1', '21', '', '1.5', '1e1', '0x10', 'Infinity', ' ']) {
    const h = picker();
    input(h.render(), 'Балл').props.onChangeText(value);
    input(h.render(), 'Балл').props.onBlur();
    const nodes = h.render();
    assert.equal(input(nodes, 'Балл').props.value, value);
    assert.equal(save(nodes).props.disabled, true);
    assert.ok(nodes.some(node => node.props.children === 'Введите целый балл от 0 до 20'));
    save(nodes).props.onPress();
    assert.equal(h.submissions.length, 0);
  }
});
test('SOR and SOCH accept zero and maximum; invalid maxima never submit', () => {
  for (const type of ['SUMMATIVE_SECTION', 'SUMMATIVE_TERM']) {
    for (const value of ['0', '20']) {
      const h = picker(type);
      input(h.render(), 'Балл').props.onChangeText(value);
      assert.equal(save(h.render()).props.disabled, false);
      save(h.render()).props.onPress();
      assert.deepEqual(h.submissions, [[{ score: Number(value), maxScore: 20 }, type]]);
    }
  }
  for (const value of ['-1', '0', '', '1001', '1.5']) {
    const h = picker();
    input(h.render(), 'Балл').props.onChangeText('1');
    input(h.render(), 'Максимальный балл').props.onChangeText(value);
    save(h.render()).props.onPress();
    assert.equal(h.submissions.length, 0);
    assert.equal(input(h.render(), 'Максимальный балл').props.value, value);
  }
});
test('formative picker offers 1–10 and busy commands are guarded', () => {
  const h = picker('FORMATIVE');
  const points = h.render().filter(node => node.props.accessibilityLabel?.startsWith('Балл '));
  assert.deepEqual(points.map(node => node.props.accessibilityLabel), Array.from({ length: 10 }, (_, i) => `Балл ${i + 1}`));
  points[0].props.onPress();
  points[9].props.onPress();
  assert.deepEqual(h.submissions.map(args => args[0].score), [1, 10]);
  const blocked = picker('FORMATIVE', true);
  blocked.render().find(node => node.props.accessibilityLabel === 'Балл 1').props.onPress();
  assert.equal(blocked.submissions.length, 0);
});
