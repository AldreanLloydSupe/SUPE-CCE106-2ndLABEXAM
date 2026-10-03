const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { act, create } = require('react-test-renderer');
const load = require('./helpers/load-typescript.cjs');
global.IS_REACT_ACT_ENVIRONMENT = true;
const directory = load('utils/student-directory.ts');
const records = [
  { id: 3, name: 'Carla Reyes', email: 'carla@example.com', course: 'BS IT' },
  { id: 1, name: 'Ana Santos', email: 'ana@example.com', course: 'BS IT' },
  { id: 2, name: 'Ben Cruz', email: 'ben@example.com', course: 'BS CS' },
];
const names = rows => Array.from(rows, row => row.name);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('course options are deduplicated, trimmed, sorted, and include missing courses', () => {
  assert.deepEqual(Array.from(directory.getCourses([...records, { course: ' bs it ' }, { course: null }])), ['BS CS', 'BS IT', 'Not provided']);
});
test('search and course filtering combine without mutating source order', () => {
  const result = directory.selectStudents(records, ' ANA@EXAMPLE ', 'bs it', 'asc');
  assert.deepEqual(names(result), ['Ana Santos']);
  assert.deepEqual(names(records), ['Carla Reyes', 'Ana Santos', 'Ben Cruz']);
});
test('both sort directions keep unnamed students last', () => {
  const input = [{ id: 4, name: null }, ...records];
  assert.deepEqual(names(directory.selectStudents(input, '', null, 'asc')), ['Ana Santos', 'Ben Cruz', 'Carla Reyes', null]);
  assert.deepEqual(names(directory.selectStudents(input, '', null, 'desc')), ['Carla Reyes', 'Ben Cruz', 'Ana Santos', null]);
});

async function mount(t, platform = 'ios') {
  const getStudents = t.mock.fn(async () => records);
  const auth = { token: 'token', logout: t.mock.fn(async () => {}) };
  class ApiError extends Error {}
  const native = Object.fromEntries(['ActivityIndicator', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name]));
  Object.assign(native, {
    Platform: { OS: platform }, StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 390 }),
    FlatList: props => React.createElement('FlatList', props, props.ListHeaderComponent),
  });
  const Screen = load('app/(app)/students.tsx', {
    'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/StudentCard': { default: () => null },
    '@/components/Portal': { Screen: 'Screen', PageTitle: 'PageTitle', StatePanel: 'StatePanel' },
    '@/constants/portal': { palette: {}, ui: {} },
    '@/services/api': { getStudents, ApiError }, '@/hooks/useAuth': { useAuth: () => auth },
    '@/utils/student-directory': directory,
  }).default;
  let renderer;
  await act(async () => { renderer = create(React.createElement(Screen)); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return {
    get list() { return renderer.root.findByType('FlatList').props; },
    getStudents,
    async click(label) { await act(async () => renderer.root.findAllByType('Pressable').find(item => item.props.accessibilityLabel === label).props.onPress()); },
    async search(value) { await act(async () => renderer.root.findByType('TextInput').props.onChangeText(value)); },
    async refresh() { await act(() => renderer.root.findByType('FlatList').props.onRefresh()); },
  };
}

test('directory combines course selection, sorting, and search', async t => {
  const h = await mount(t);
  await h.click('BS IT');
  await h.click('Z–A');
  assert.deepEqual(names(h.list.data), ['Carla Reyes', 'Ana Santos']);
  await h.search('ana');
  assert.deepEqual(names(h.list.data), ['Ana Santos']);
  await h.click('All courses');
  await h.search('');
  assert.deepEqual(names(h.list.data), ['Carla Reyes', 'Ben Cruz', 'Ana Santos']);
});
test('refresh retains records, active filters, and sort order while loading', async t => {
  const h = await mount(t);
  await h.click('BS IT');
  await h.click('Z–A');
  const pending = deferred();
  h.getStudents.mock.mockImplementation(() => pending.promise);
  await h.refresh();
  assert.equal(h.list.refreshing, true);
  assert.deepEqual(names(h.list.data), ['Carla Reyes', 'Ana Santos']);
  await act(async () => pending.resolve([...records, { id: 5, name: 'Zoe', course: 'BS IT' }]));
  assert.equal(h.list.refreshing, false);
  assert.deepEqual(names(h.list.data), ['Zoe', 'Carla Reyes', 'Ana Santos']);
});
test('failed refresh keeps old records and the next refresh recovers', async t => {
  const h = await mount(t);
  h.getStudents.mock.mockImplementation(async () => { throw new Error('Offline'); });
  await h.refresh();
  assert.equal(h.list.refreshing, false);
  assert.deepEqual(names(h.list.data), ['Ana Santos', 'Ben Cruz', 'Carla Reyes']);
  h.getStudents.mock.mockImplementation(async () => []);
  await h.refresh();
  assert.equal(h.list.data.length, 0);
});
test('older refresh responses cannot overwrite the latest records', async t => {
  const h = await mount(t);
  const first = deferred();
  const second = deferred();
  let call = 0;
  h.getStudents.mock.mockImplementation(() => (++call === 1 ? first : second).promise);
  await h.refresh();
  await h.refresh();
  await act(async () => second.resolve([]));
  await act(async () => first.resolve(records));
  assert.equal(h.list.data.length, 0);
});
test('web provides a refresh button without a native pull-to-refresh handler', async t => {
  const h = await mount(t, 'web');
  assert.equal(h.list.onRefresh, undefined);
  await h.click('Refresh students');
  assert.equal(h.getStudents.mock.callCount(), 2);
});
