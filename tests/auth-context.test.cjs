const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const React = require('react');
const { act, create } = require('react-test-renderer');
const ts = require('typescript');

global.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync(path.join(__dirname, '../context/AuthContext.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const user = { id: 1, name: 'Test Student', email: 'test@example.com' };
class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// Render the real provider with React; replace only native storage, API calls, and time.
async function mount(t, options = {}) {
  let saved = options.saved ?? null;
  let current;
  const timers = new Map();
  let timerId = 0;
  const writeSavedToken = async (_key, value) => { saved = value; };
  const storage = {
    isAvailableAsync: t.mock.fn(async () => options.available !== false),
    getItemAsync: t.mock.fn(async () => saved),
    setItemAsync: t.mock.fn(writeSavedToken),
    deleteItemAsync: t.mock.fn(async () => { saved = null; }),
  };
  options.configureStorage?.(storage);
  const getProfile = t.mock.fn(options.getProfile || (async () => user));
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      if (name === 'react-native') return { Platform: { OS: options.platform || 'android' } };
      if (name === 'expo-secure-store') return storage;
      if (name === '@/services/api') return { getProfile, ApiError };
      throw new Error(`Unexpected import: ${name}`);
    },
    AbortController,
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  }, { filename: 'AuthContext.test-build.js' });
  function Consumer() { current = React.useContext(exports.AuthContext); return null; }
  let renderer;
  await act(async () => {
    const tree = React.createElement(exports.AuthProvider, null, React.createElement(Consumer));
    renderer = create(options.strict ? React.createElement(React.StrictMode, null, tree) : tree);
  });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return {
    get state() { return current; },
    get saved() { return saved; },
    storage, getProfile, writeSavedToken,
    async run(callback) { await act(callback); },
    async timeout() { await act(async () => { for (const callback of timers.values()) callback(); }); },
  };
}

test('restores a saved native session after profile validation', async t => {
  const h = await mount(t, { saved: 'saved-token' });
  assert.equal(h.state.token, 'saved-token');
  assert.equal(h.state.user, user);
  assert.equal(h.state.authLoading, false);
  assert.equal(h.state.authError, null);
});

test('starts signed out when no token is saved', async t => {
  const h = await mount(t);
  assert.equal(h.state.token, null);
  assert.equal(h.state.authLoading, false);
  assert.equal(h.getProfile.mock.callCount(), 0);
});

test('web login/restore/logout never calls native storage', async t => {
  const h = await mount(t, { platform: 'web' });
  await h.run(() => h.state.login('web-token', user));
  await h.run(() => h.state.restoreSession());
  assert.equal(h.state.token, 'web-token');
  await h.run(() => h.state.logout());
  assert.equal(h.state.token, null);
  for (const method of Object.values(h.storage)) assert.equal(method.mock.callCount(), 0);
});

test('rejects blank tokens without saving or authenticating', async t => {
  const h = await mount(t);
  await h.run(() => assert.rejects(h.state.login('   ', user), /valid access token/));
  assert.equal(h.state.token, null);
  assert.equal(h.storage.setItemAsync.mock.callCount(), 0);
});

test('login remains signed out when secure persistence fails', async t => {
  const h = await mount(t);
  h.storage.setItemAsync.mock.mockImplementation(async () => { throw new Error('storage unavailable'); });
  await h.run(() => assert.rejects(h.state.login('new-token', user), /Unable to save/));
  assert.equal(h.state.token, null);
  assert.equal(h.state.authLoading, false);
});

test('unavailable native storage produces a retryable error', async t => {
  const h = await mount(t, { available: false });
  assert.equal(h.state.authError.action, 'restore');
  assert.equal(h.storage.getItemAsync.mock.callCount(), 0);
  assert.equal(h.state.authLoading, false);
});

test('a storage read failure does not erase saved credentials', async t => {
  const h = await mount(t, { saved: 'saved-token', configureStorage(storage) {
    storage.getItemAsync.mock.mockImplementation(async () => { throw new Error('device locked'); });
  } });
  assert.equal(h.saved, 'saved-token');
  assert.equal(h.storage.deleteItemAsync.mock.callCount(), 0);
  assert.equal(h.state.authError.action, 'restore');
});

for (const [name, failure] of [
  ['network outage', new TypeError('Failed to fetch')],
  ['server error', new ApiError('Unavailable', 503)],
  ['forbidden response', new ApiError('Forbidden', 403)],
]) {
  test(`${name} preserves the saved token and supports retry`, async t => {
    const h = await mount(t, { saved: 'saved-token', getProfile: async () => { throw failure; } });
    assert.equal(h.saved, 'saved-token');
    assert.equal(h.state.token, null);
    assert.equal(h.state.authError.action, 'restore');
    assert.equal(h.storage.deleteItemAsync.mock.callCount(), 0);
    h.getProfile.mock.mockImplementation(async () => user);
    await h.run(() => h.state.restoreSession());
    assert.equal(h.state.token, 'saved-token');
    assert.equal(h.state.authError, null);
  });
}

test('401 clears invalid credentials and finishes signed out', async t => {
  const h = await mount(t, { saved: 'expired', getProfile: async () => { throw new ApiError('Expired', 401); } });
  assert.equal(h.saved, null);
  assert.equal(h.state.token, null);
  assert.equal(h.state.authError, null);
  assert.equal(h.state.authLoading, false);
});

test('logout overwrites a saved token if deletion fails', async t => {
  const h = await mount(t, { saved: 'saved-token' });
  h.storage.deleteItemAsync.mock.mockImplementation(async () => { throw new Error('delete failed'); });
  await h.run(() => h.state.logout());
  assert.equal(h.saved, '');
  assert.equal(h.state.token, null);
  assert.equal(h.state.user, null);
  assert.equal(h.state.authError, null);
  await h.run(() => h.state.restoreSession());
  assert.equal(h.state.token, null);
});

test('logout failure closes the in-memory session and offers cleanup retry', async t => {
  const h = await mount(t, { saved: 'saved-token' });
  h.storage.deleteItemAsync.mock.mockImplementation(async () => { throw new Error('delete failed'); });
  const originalWrite = h.writeSavedToken;
  h.storage.setItemAsync.mock.mockImplementation(async () => { throw new Error('write failed'); });
  await h.run(() => h.state.logout());
  assert.equal(h.state.token, null);
  assert.equal(h.state.user, null);
  assert.equal(h.state.authError.action, 'logout');
  assert.equal(h.state.authLoading, false);
  assert.equal(h.saved, 'saved-token');
  h.storage.setItemAsync.mock.mockImplementation(originalWrite);
  await h.run(() => h.state.logout());
  assert.equal(h.saved, '');
  assert.equal(h.state.authError, null);
});

test('failed cleanup after a 401 also offers logout retry', async t => {
  const h = await mount(t, {
    saved: 'expired', getProfile: async () => { throw new ApiError('Expired', 401); },
    configureStorage(storage) {
      storage.deleteItemAsync.mock.mockImplementation(async () => { throw new Error('delete failed'); });
      storage.setItemAsync.mock.mockImplementation(async () => { throw new Error('write failed'); });
    },
  });
  assert.equal(h.state.token, null);
  assert.equal(h.state.authError.action, 'logout');
});

test('session verification timeout preserves credentials and stops loading', async t => {
  const h = await mount(t, { saved: 'saved-token', getProfile: (_token, signal) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
  assert.equal(h.state.authLoading, true);
  await h.timeout();
  assert.equal(h.state.authLoading, false);
  assert.equal(h.state.authError.action, 'restore');
  assert.equal(h.saved, 'saved-token');
});

test('a late successful restore cannot sign the user back in after logout', async t => {
  const profile = deferred();
  const h = await mount(t, { saved: 'old-token', getProfile: () => profile.promise });
  await h.run(() => h.state.logout());
  await h.run(async () => profile.resolve(user));
  assert.equal(h.state.token, null);
  assert.equal(h.saved, null);
  assert.equal(h.state.authLoading, false);
});

test('a late 401 from an old restore cannot delete a newer login', async t => {
  const profile = deferred();
  const h = await mount(t, { saved: 'old-token', getProfile: () => profile.promise });
  await h.run(() => h.state.login('new-token', user));
  await h.run(async () => profile.reject(new ApiError('Expired', 401)));
  assert.equal(h.state.token, 'new-token');
  assert.equal(h.saved, 'new-token');
  assert.equal(h.storage.deleteItemAsync.mock.callCount(), 0);
});

test('logout waits for an in-flight token save and then removes it', async t => {
  const h = await mount(t);
  const saving = deferred();
  const entered = deferred();
  const originalWrite = h.writeSavedToken;
  h.storage.setItemAsync.mock.mockImplementation(async (...args) => {
    entered.resolve();
    await saving.promise;
    return originalWrite(...args);
  });
  await h.run(async () => {
    const login = assert.rejects(h.state.login('new-token', user), /cancelled/);
    await entered.promise;
    const logout = h.state.logout();
    saving.resolve();
    await Promise.all([login, logout]);
  });
  assert.equal(h.saved, null);
  assert.equal(h.state.token, null);
});

test('auth callbacks stay stable after state changes', async t => {
  const h = await mount(t, { platform: 'web' });
  const { login, logout, restoreSession } = h.state;
  await h.run(() => login('token', user));
  assert.equal(h.state.login, login);
  assert.equal(h.state.logout, logout);
  assert.equal(h.state.restoreSession, restoreSession);
});

test('Strict Mode effect cleanup does not break session restoration', async t => {
  const h = await mount(t, { saved: 'saved-token', strict: true });
  assert.equal(h.state.token, 'saved-token');
  assert.equal(h.state.authLoading, false);
});
