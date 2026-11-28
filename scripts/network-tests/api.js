// End-to-end test of the REAL src/services/api.ts interceptors with a fake network adapter.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.resolve(__dirname, '../..');
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const axios = require(path.join(ROOT, 'node_modules/axios'));

const compile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const modCache = {};
function load(rel, stubs = {}) {
  if (modCache[rel]) return modCache[rel];
  const m = { exports: {} };
  const fakeRequire = (name) => {
    if (stubs[name]) return stubs[name];
    if (name === 'axios') return axios;
    if (name.startsWith('.')) {
      const base = path.posix.join(path.posix.dirname(rel), name);
      return load(base.endsWith('.ts') ? base : base + '.ts', stubs);
    }
    return require(name);
  };
  modCache[rel] = m.exports; // allow cycles
  new Function('module', 'exports', 'require', compile(path.join(ROOT, rel)))(m, m.exports, fakeRequire);
  modCache[rel] = m.exports;
  return m.exports;
}

const store = new Map();
const stubs = {
  '@react-native-async-storage/async-storage': { __esModule: true, default: { setItem: async (k, v) => store.set(k, v), getItem: async (k) => (store.has(k) ? store.get(k) : null), getAllKeys: async () => [...store.keys()], multiRemove: async (ks) => ks.forEach((k) => store.delete(k)) } },
  '../utils/authStorage': { getAuthToken: async () => 'tok', deleteAuthToken: async () => {} },
  '../config/api.config': { getApiBaseUrl: () => 'https://api.test/api' },
};
global.__DEV__ = false;
const realLog = console.log;
console.log = () => {}; console.warn = () => {}; console.error = () => {};

// Real manager, controllable probe — replaces connectivityService (which needs React Native).
const { ConnectivityManager } = load('src/network/connectivity.ts');
let serverUp = true;
const manager = new ConnectivityManager({ probe: async () => serverUp });
stubs['../network/connectivityService'] = { connectivity: manager };
const api = load('src/services/api.ts', stubs).default;

// fake network
let mode = 'up'; // up | down | slow | 500
let calls = 0;
api.defaults.adapter = async (config) => {
  calls++;
  if (mode === 'down') { const e = new Error('Network Error'); e.code = 'ERR_NETWORK'; e.config = config; throw e; }
  if (mode === 'timeout') { const e = new Error('timeout of 30000ms exceeded'); e.code = 'ECONNABORTED'; e.config = config; throw e; }
  if (mode === '500') { const e = new Error('Request failed with status code 500'); e.config = config; e.response = { status: 500, data: {}, headers: {}, config }; throw e; }
  return { data: { ok: true, url: config.url, n: calls }, status: 200, statusText: 'OK', headers: {}, config };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; realLog('  ok  -', name); }
  catch (e) { realLog('  FAIL-', name, '\n      ', e.message); process.exitCode = 1; }
}

(async () => {
  realLog('real API client + offline cache + connectivity');

  await test('online GET works and silently stores the answer', async () => {
    mode = 'up';
    const r = await api.get('/me/nutrition/today', { params: { date: 'd1' } });
    assert.equal(r.data.ok, true);
    await sleep(20);
    assert.ok([...store.keys()].some((k) => k.includes('/me/nutrition/today')), 'answer cached');
  });

  await test('network drops: the same GET is served from the cache (no error, flagged as cached)', async () => {
    mode = 'down'; serverUp = false;
    const before = calls;
    const r = await api.get('/me/nutrition/today', { params: { date: 'd1' } });
    assert.equal(r.status, 200);
    assert.equal(r.headers['x-from-cache'], '1');
    assert.equal(r.data.ok, true);
    assert.ok(calls - before <= 2, 'at most one transient retry');
  });

  await test('an uncached GET while offline fails with a French message and isOffline = true (no raw technical text)', async () => {
    let err;
    try { await api.get('/never/seen'); } catch (e) { err = e; }
    assert.ok(err, 'must reject');
    assert.equal(err.isOffline, true);
    assert.match(err.response.data.message, /Connexion impossible|connexion/i);
    assert.ok(!/Network Error|status code/.test(err.response.data.message));
  });

  await test('manager learns about the outage from API traffic alone', async () => {
    await sleep(900); // debounce + probe
    assert.equal(manager.getState().status, 'offline');
  });

  await test('offline: requests get a short timeout (no 30 s spinner) and no 800 ms retry delay', async () => {
    let cfgTimeout;
    const prev = api.defaults.adapter;
    api.defaults.adapter = async (config) => { cfgTimeout = config.timeout; return prev(config); };
    const t0 = Date.now();
    try { await api.get('/never/seen2'); } catch {}
    api.defaults.adapter = prev;
    assert.ok(cfgTimeout <= 8000, `timeout ${cfgTimeout}`);
    assert.ok(Date.now() - t0 < 600, 'no retry wait while offline');
  });

  await test('writes are never served from cache: POST while offline fails cleanly', async () => {
    let err; try { await api.post('/complaints', { a: 1 }); } catch (e) { err = e; }
    assert.ok(err && err.isOffline === true);
  });

  await test('connection returns: a successful request flips the manager online and fires reconnect once', async () => {
    let reconnects = 0; manager.onReconnect(() => reconnects++);
    mode = 'up'; serverUp = true;
    const r = await api.get('/me/nutrition/today', { params: { date: 'd2' } });
    assert.equal(r.data.ok, true);
    assert.notEqual(r.headers['x-from-cache'], '1');
    assert.equal(manager.getState().status, 'online');
    assert.equal(reconnects, 1);
  });

  await test('timeout on a cached GET → cached data, not an error', async () => {
    mode = 'timeout';
    const r = await api.get('/me/nutrition/today', { params: { date: 'd1' } });
    assert.equal(r.headers['x-from-cache'], '1');
  });

  await test('timeout with nothing cached → French "expiré" message, classified as timeout', async () => {
    mode = 'timeout';
    let err; try { await api.get('/nothing/cached'); } catch (e) { err = e; }
    assert.match(err.response.data.message, /expiré/i);
    const { errorKindOf } = load('src/network/classifyError.ts');
    assert.equal(errorKindOf(err), 'timeout');
  });

  await test('server error (500) is NOT treated as offline and NOT masked by the cache', async () => {
    mode = '500';
    let err; try { await api.get('/me/nutrition/today', { params: { date: 'd1' } }); } catch (e) { err = e; }
    assert.ok(err, 'a 500 must surface as an error');
    assert.equal(err.response.status, 500);
    assert.match(err.response.data.message, /indisponible/i);
    assert.notEqual(err.isOffline, true);
    assert.notEqual(manager.getState().status, 'offline');
  });

  await test('auth endpoints are never cached', async () => {
    mode = 'up';
    await api.get('/auth/me').catch(() => {});
    await sleep(20);
    assert.ok(![...store.keys()].some((k) => k.includes('/auth/')));
  });

  realLog(`\n${passed} passed${process.exitCode ? ' — WITH FAILURES' : ''}`);
})();
