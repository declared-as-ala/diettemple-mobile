// Logic tests for the offline cache (AsyncStorage replaced by an in-memory fake).
const fs = require('fs');
const path = require('path');
const ts = require(path.resolve(__dirname, '../../node_modules/typescript'));
const assert = require('assert');

const store = new Map();
const fakeAsyncStorage = {
  __esModule: true,
  default: {
    setItem: async (k, v) => { store.set(k, v); },
    getItem: async (k) => (store.has(k) ? store.get(k) : null),
    getAllKeys: async () => [...store.keys()],
    multiRemove: async (ks) => ks.forEach((k) => store.delete(k)),
  },
};
const fakeRequire = (name) => (name === '@react-native-async-storage/async-storage' ? fakeAsyncStorage : require(name));
const src = fs.readFileSync(path.resolve(__dirname, '../../src/network/apiCache.ts'), 'utf8');
const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', 'require', out)(m, m.exports, fakeRequire);
const { isCacheable, cacheKey, writeCache, readCache, clearApiCache } = m.exports;

let passed = 0;
async function test(name, fn) {
  try { store.clear(); await fn(); passed++; console.log('  ok  -', name); }
  catch (e) { console.log('  FAIL-', name, '\n      ', e.message); process.exitCode = 1; }
}
(async () => {
  console.log('offline cache');
  await test('only plain JSON GETs are cacheable; auth / payments / check-in / audio / binary are excluded', () => {
    assert.equal(isCacheable('get', '/me/nutrition/today'), true);
    assert.equal(isCacheable('GET', '/products', 'json'), true);
    assert.equal(isCacheable('post', '/orders'), false);
    assert.equal(isCacheable('get', '/auth/me'), false);
    assert.equal(isCacheable('get', '/payments/status'), false);
    assert.equal(isCacheable('get', '/checkin/gym/status'), false);
    assert.equal(isCacheable('get', '/voice-messages/abc/audio'), false);
    assert.equal(isCacheable('get', '/x', 'arraybuffer'), false);
    assert.equal(isCacheable('get', undefined), false);
  });
  await test('cache key is stable regardless of param order and ignores empty params', () => {
    assert.equal(cacheKey('/p', { b: 2, a: 1 }), cacheKey('/p', { a: 1, b: 2, c: undefined, d: null }));
    assert.notEqual(cacheKey('/p', { a: 1 }), cacheKey('/p', { a: 2 }));
  });
  await test('write then read returns the last good answer', async () => {
    const k = cacheKey('/me/today', { date: '2026-11-28' });
    await writeCache(k, { kcal: 1920 });
    const hit = await readCache(k);
    assert.deepEqual(hit.data, { kcal: 1920 });
  });
  await test('missing / corrupted entries give null, never throw', async () => {
    assert.equal(await readCache('apicache:v1:/nope'), null);
    store.set('apicache:v1:/bad', '{not json');
    assert.equal(await readCache('apicache:v1:/bad'), null);
  });
  await test('entries older than two weeks are ignored', async () => {
    const k = cacheKey('/old');
    await writeCache(k, { a: 1 }, () => 1000);
    assert.equal(await readCache(k, () => 1000 + 15 * 24 * 3600 * 1000), null);
    assert.ok(await readCache(k, () => 1000 + 13 * 24 * 3600 * 1000));
  });
  await test('huge bodies are not stored (storage stays small)', async () => {
    const k = cacheKey('/big');
    await writeCache(k, 'x'.repeat(500000));
    assert.equal(await readCache(k), null);
  });
  await test('logout wipes ONLY the API cache (other app data survives)', async () => {
    await writeCache(cacheKey('/a'), 1);
    await writeCache(cacheKey('/b'), 2);
    store.set('theme', 'dark');
    await clearApiCache();
    assert.equal(await readCache(cacheKey('/a')), null);
    assert.equal(store.get('theme'), 'dark');
  });
  await test('a failing storage never breaks a request', async () => {
    const real = fakeAsyncStorage.default.setItem;
    fakeAsyncStorage.default.setItem = async () => { throw new Error('disk full'); };
    await writeCache(cacheKey('/z'), 1); // must not throw
    fakeAsyncStorage.default.setItem = real;
  });
  console.log(`\n${passed} passed${process.exitCode ? ' — WITH FAILURES' : ''}`);
})();
