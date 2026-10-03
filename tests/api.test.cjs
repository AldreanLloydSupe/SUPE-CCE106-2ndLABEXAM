const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-typescript.cjs');
const student = { id: '1', name: 'Ana Santos', email: 'ana@example.com', course: 'BS IT' };
const user = { id: 1, name: 'Student', email: 'student@example.com', role: 'student' };
const json = value => new Response(JSON.stringify(value), { status: 200 });

function setup(t, implementation = async () => json([student]), base = 'https://exam.example/api') {
  const timers = new Map();
  let timerId = 0;
  const fetch = t.mock.fn(implementation);
  const api = load('services/api.ts', {}, {
    fetch, process: { env: { EXPO_PUBLIC_API_BASE_URL: base } },
    setTimeout(callback, delay) { assert.equal(delay, 15000); timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  return { api, fetch, timers, tick() { for (const callback of timers.values()) callback(); } };
}
const errorCode = code => error => error.code === code && typeof error.message === 'string' && error.message.length > 0;
const abortable = (_url, { signal }) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
});

for (const [label, wrap] of [
  ['direct', value => value], ['data', value => ({ data: value })],
  ['students', value => ({ students: value })], ['data/students', value => ({ data: { students: value } })],
]) {
  test(`accepts ${label} student list response`, async t => {
    const h = setup(t, async () => json(wrap([student])));
    const result = await h.api.getStudents('token');
    assert.equal(result[0].name, student.name);
    assert.equal(h.timers.size, 0);
  });
}
test('accepts a real empty list', async t => {
  const h = setup(t, async () => json({ data: [] }));
  assert.equal((await h.api.getStudents('token')).length, 0);
});
for (const [label, value] of [
  ['missing list', {}], ['null list', null], ['string list', 'students'],
  ['wrong wrapper', { students: {} }], ['missing ID', [{ name: 'Ana' }]],
  ['invalid field', [{ id: 1, name: {} }]], ['duplicate IDs', [{ id: 1 }, { id: '1' }]],
]) {
  test(`rejects ${label} rather than displaying an empty directory`, async t => {
    const h = setup(t, async () => json(value));
    await assert.rejects(h.api.getStudents('token'), errorCode('invalid-response'));
    assert.equal(h.timers.size, 0);
  });
}
test('allows nullable optional student fields and numeric ID zero', async t => {
  const h = setup(t, async () => json([{ id: 0, name: null, email: null, course: null }]));
  assert.equal((await h.api.getStudents('token'))[0].id, 0);
});

for (const field of ['token', 'accessToken', 'access_token']) {
  test(`accepts ${field} in a wrapped login response`, async t => {
    const h = setup(t, async () => json({ data: { [field]: 'valid-token', user } }));
    const result = await h.api.login('student@example.com', 'password');
    assert.equal(result.accessToken, 'valid-token');
    assert.equal(result.user.name, user.name);
  });
}
test('keeps a top-level login token when user data is nested', async t => {
  const h = setup(t, async () => json({ token: 'valid-token', data: { user } }));
  const result = await h.api.login(' student@example.com ', 'password');
  assert.equal(result.accessToken, 'valid-token');
  assert.equal(result.user.id, user.id);
  const [url, options] = h.fetch.mock.calls[0].arguments;
  assert.equal(url, 'https://exam.example/api/login');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(options.body), { email: 'student@example.com', password: 'password' });
});
test('login may omit the optional user object', async t => {
  const h = setup(t, async () => json({ token: 'valid-token' }));
  assert.equal((await h.api.login('student@example.com', 'password')).user, null);
});
for (const invalid of [null, {}, { token: 123 }, { token: ' ' }, { token: 'ok', user: { name: [] } }]) {
  test(`rejects invalid login payload ${JSON.stringify(invalid)}`, async t => {
    const h = setup(t, async () => json(invalid));
    await assert.rejects(h.api.login('student@example.com', 'password'), errorCode('invalid-response'));
  });
}

for (const [label, payload] of [['direct', user], ['data/user', { data: { user } }]]) {
  test(`validates a ${label} profile response`, async t => {
    const h = setup(t, async () => json(payload));
    assert.equal((await h.api.getProfile('token')).email, user.email);
    assert.equal(h.fetch.mock.calls[0].arguments[1].headers.Authorization, 'Bearer token');
  });
}
for (const invalid of [null, {}, [], { id: {} }, { name: 123 }, { user: null }]) {
  test(`rejects invalid profile ${JSON.stringify(invalid)}`, async t => {
    const h = setup(t, async () => json(invalid));
    await assert.rejects(h.api.getProfile('token'), errorCode('invalid-response'));
  });
}
test('detail endpoint encodes IDs and accepts data/student wrappers', async t => {
  const h = setup(t, async () => json({ data: { student: { ...student, id: 'A/B 1' } } }));
  assert.equal((await h.api.getStudent('A/B 1', 'token')).id, 'A/B 1');
  assert.equal(h.fetch.mock.calls[0].arguments[0], 'https://exam.example/api/students/A%2FB%201');
});
test('rejects a detail response for another student', async t => {
  const h = setup(t, async () => json(student));
  await assert.rejects(h.api.getStudent('2', 'token'), errorCode('invalid-response'));
});

for (const body of ['', '<html>Not JSON</html>', '{broken']) {
  test(`rejects a non-JSON success body ${JSON.stringify(body)}`, async t => {
    const h = setup(t, async () => new Response(body));
    await assert.rejects(h.api.getStudents('token'), errorCode('invalid-response'));
    assert.equal(h.timers.size, 0);
  });
}
for (const status of [400, 401, 403, 404, 422, 429, 500, 503]) {
  test(`preserves HTTP ${status} with a friendly message even for an HTML error body`, async t => {
    const h = setup(t, async () => new Response('<html>internal details</html>', { status }));
    await assert.rejects(h.api.getStudents('token'), error => error instanceof h.api.ApiError && error.status === status && error.code === 'http' && !error.message.includes('internal details'));
    assert.equal(h.timers.size, 0);
  });
}
test('login 401 reports incorrect credentials rather than session expiry', async t => {
  const h = setup(t, async () => new Response('', { status: 401 }));
  await assert.rejects(h.api.login('student@example.com', 'wrong'), /email or password is incorrect/);
});
test('connection failures produce a network error without leaking raw exceptions', async t => {
  const h = setup(t, async () => { throw new TypeError('sensitive transport detail'); });
  await assert.rejects(h.api.getStudents('token'), error => error.code === 'network' && !error.message.includes('sensitive'));
  assert.equal(h.timers.size, 0);
});

for (const [name, invoke] of [
  ['login', api => api.login('student@example.com', 'password')],
  ['profile', api => api.getProfile('token')],
  ['directory', api => api.getStudents('token')],
  ['details', api => api.getStudent('1', 'token')],
]) {
  test(`${name} requests time out and clear their timer`, async t => {
    const h = setup(t, abortable);
    const result = assert.rejects(invoke(h.api), errorCode('timeout'));
    h.tick();
    await result;
    assert.equal(h.timers.size, 0);
  });
}
test('timeout covers the response body as well as the connection', async t => {
  let reading;
  const started = new Promise(resolve => { reading = resolve; });
  const h = setup(t, async (_url, { signal }) => ({ ok: true, status: 200, text() {
    reading();
    return abortable('', { signal });
  } }));
  const result = assert.rejects(h.api.getStudents('token'), errorCode('timeout'));
  await started;
  h.tick();
  await result;
});
test('already cancelled profile requests never call fetch', async t => {
  const h = setup(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(h.api.getProfile('token', controller.signal), errorCode('cancelled'));
  assert.equal(h.fetch.mock.callCount(), 0);
});
test('external cancellation aborts an in-flight profile and removes the listener', async t => {
  const h = setup(t, abortable);
  const controller = new AbortController();
  const remove = t.mock.method(controller.signal, 'removeEventListener');
  const result = assert.rejects(h.api.getProfile('token', controller.signal), errorCode('cancelled'));
  controller.abort();
  await result;
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(h.timers.size, 0);
});
test('bad configuration and invalid inputs fail before fetch', async t => {
  const h = setup(t, undefined, 'not-an-api-url');
  await assert.rejects(h.api.getStudents('token'), errorCode('configuration'));
  await assert.rejects(h.api.getStudent(' ', 'token'), errorCode('validation'));
  await assert.rejects(h.api.login(' ', 'password'), errorCode('validation'));
  await assert.rejects(h.api.getProfile(''), error => error.status === 401);
  assert.equal(h.fetch.mock.callCount(), 0);
});
test('existing demo mode remains usable without a network request', async t => {
  const h = setup(t, undefined, 'REPLACE_WITH_EXAM_API');
  const result = await h.api.login('student@example.com', 'password123');
  assert.equal((await h.api.getStudents(result.accessToken)).length, 3);
  assert.equal((await h.api.getProfile(result.accessToken)).name, 'Demo Student');
  assert.equal(h.fetch.mock.callCount(), 0);
});
