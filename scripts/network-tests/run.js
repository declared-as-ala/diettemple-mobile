// Logic tests for the connectivity manager and error classifier. No device involved: fake clock + fake server probe.
const fs = require('fs');
const path = require('path');
const ts = require(path.resolve(__dirname, '../../node_modules/typescript'));
const assert = require('assert');

function load(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out)(m, m.exports, require);
  return m.exports;
}
const { ConnectivityManager, SLOW_REQUEST_MS } = load(path.join(__dirname, '../../src/') + 'network/connectivity.ts');
const { classifyError, errorKindOf } = load(path.join(__dirname, '../../src/') + 'network/classifyError.ts');

// fake clock + timers
function makeEnv(initialServerUp = true) {
  let t = 1000;
  const timers = [];
  let seq = 0;
  const env = {
    serverUp: initialServerUp,
    probes: 0,
    now: () => t,
    setTimer: (fn, ms) => { const id = ++seq; timers.push({ id, at: t + ms, fn }); return id; },
    clearTimer: (id) => { const i = timers.findIndex((x) => x.id === id); if (i >= 0) timers.splice(i, 1); },
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        const next = timers[0];
        if (!next || next.at > end) break;
        timers.shift();
        t = next.at;
        next.fn();
        await new Promise((r) => setImmediate(r)); // let probe promises settle
        await new Promise((r) => setImmediate(r));
      }
      t = end;
    },
    pendingTimers: () => timers.length,
  };
  env.mgr = new ConnectivityManager({
    probe: async () => { env.probes++; return env.serverUp; },
    now: env.now, setTimer: env.setTimer, clearTimer: env.clearTimer,
  });
  return env;
}
const tick = () => new Promise((r) => setImmediate(r));
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok  -', name); }
  catch (e) { console.log('  FAIL-', name, '\n      ', e.message); process.exitCode = 1; }
}

(async () => {
  console.log('connectivity manager');

  await test('starts online', () => { assert.equal(makeEnv().mgr.getState().status, 'online'); });

  await test('airplane mode (device unreachable) → offline immediately, no probe needed', async () => {
    const e = makeEnv(false);
    e.mgr.setDeviceReachable(false);
    assert.equal(e.mgr.getState().status, 'offline');
  });

  await test('airplane mode off + server reachable → back online and reconnect listeners fire once', async () => {
    const e = makeEnv(false);
    let reconnects = 0; e.mgr.onReconnect(() => reconnects++);
    e.mgr.setDeviceReachable(false);
    e.serverUp = true;
    e.mgr.setDeviceReachable(true);
    await tick(); await tick();
    assert.equal(e.mgr.getState().status, 'online');
    assert.equal(reconnects, 1);
    assert.equal(e.pendingTimers(), 0, 'polling must stop once online');
  });

  await test('Wi-Fi without internet (device says connected, server unreachable) → offline after verification', async () => {
    const e = makeEnv(false);
    e.mgr.setDeviceReachable(true);
    e.mgr.reportRequest({ durationMs: 50, reachedServer: false });
    await e.advance(500);
    assert.equal(e.mgr.getState().status, 'offline');
  });

  await test('connection lost during navigation: failing request triggers a check; several failures → ONE verification (debounced)', async () => {
    const e = makeEnv(false);
    for (let i = 0; i < 6; i++) e.mgr.reportRequest({ durationMs: 30, reachedServer: false });
    await e.advance(500);
    assert.equal(e.probes, 1);
    assert.equal(e.mgr.getState().status, 'offline');
  });

  await test('a single failed request on a healthy server does NOT flip the app offline', async () => {
    const e = makeEnv(true);
    e.mgr.reportRequest({ durationMs: 30, reachedServer: false });
    await e.advance(500);
    assert.equal(e.mgr.getState().status, 'online');
  });

  await test('offline → automatic reconnection by polling (no user action), with back-off', async () => {
    const e = makeEnv(false);
    let reconnects = 0; e.mgr.onReconnect(() => reconnects++);
    e.mgr.setDeviceReachable(false);
    await e.advance(20000);
    assert.equal(e.mgr.getState().status, 'offline');
    const probesWhileDown = e.probes;
    assert.ok(probesWhileDown >= 3 && probesWhileDown <= 6, `expected a handful of probes with back-off, got ${probesWhileDown}`);
    e.serverUp = true; e.mgr.setDeviceReachable(true);
    await e.advance(20000);
    assert.equal(e.mgr.getState().status, 'online');
    assert.equal(reconnects, 1);
  });

  await test('real traffic succeeding while offline proves we are back (no need to wait for the poll)', async () => {
    const e = makeEnv(false);
    let reconnects = 0; e.mgr.onReconnect(() => reconnects++);
    e.mgr.setDeviceReachable(false);
    e.mgr.reportRequest({ durationMs: 200, reachedServer: true });
    assert.equal(e.mgr.getState().status, 'online');
    assert.equal(reconnects, 1);
  });

  await test('manual Réessayer: shows checking, returns false while down, true when up', async () => {
    const e = makeEnv(false);
    e.mgr.setDeviceReachable(false);
    const seen = [];
    e.mgr.subscribe((s) => seen.push(s.checking));
    assert.equal(await e.mgr.retryNow(), false);
    assert.ok(seen.includes(true) && seen[seen.length - 1] === false, 'checking flag must go true then false');
    assert.equal(e.mgr.getState().status, 'offline');
    e.serverUp = true; e.mgr.setDeviceReachable(null);
    assert.equal(await e.mgr.retryNow(), true);
    assert.equal(e.mgr.getState().status, 'online');
  });

  await test('slow connection: 3 slow/timeouts out of 5 → "slow"; app stays usable (not offline)', async () => {
    const e = makeEnv(true);
    e.mgr.reportRequest({ durationMs: 100, reachedServer: true });
    e.mgr.reportRequest({ durationMs: SLOW_REQUEST_MS + 1, reachedServer: true });
    e.mgr.reportRequest({ durationMs: 0, reachedServer: false, timedOut: true });
    assert.equal(e.mgr.getState().status, 'online', 'not yet: only 2 slow samples');
    e.mgr.reportRequest({ durationMs: SLOW_REQUEST_MS + 500, reachedServer: true });
    assert.equal(e.mgr.getState().status, 'slow');
  });

  await test('slow → online after 3 fast requests in a row (hysteresis, no flicker)', async () => {
    const e = makeEnv(true);
    for (let i = 0; i < 4; i++) e.mgr.reportRequest({ durationMs: SLOW_REQUEST_MS + 1, reachedServer: true });
    assert.equal(e.mgr.getState().status, 'slow');
    e.mgr.reportRequest({ durationMs: 100, reachedServer: true });
    e.mgr.reportRequest({ durationMs: 100, reachedServer: true });
    assert.equal(e.mgr.getState().status, 'slow');
    e.mgr.reportRequest({ durationMs: 100, reachedServer: true });
    assert.equal(e.mgr.getState().status, 'online');
  });

  await test('server error responses (5xx, reachedServer=true) are not a connectivity problem', async () => {
    const e = makeEnv(true);
    for (let i = 0; i < 5; i++) e.mgr.reportRequest({ durationMs: 120, reachedServer: true });
    assert.equal(e.mgr.getState().status, 'online');
  });

  await test('a throwing subscriber cannot break the others', async () => {
    const e = makeEnv(false);
    e.mgr.subscribe(() => { throw new Error('boom'); });
    let got = 0; e.mgr.subscribe(() => got++);
    e.mgr.setDeviceReachable(false);
    assert.ok(got >= 1);
  });

  await test('dispose stops polling', async () => {
    const e = makeEnv(false);
    e.mgr.setDeviceReachable(false);
    e.mgr.dispose();
    assert.equal(e.pendingTimers(), 0);
  });

  console.log('error classification (API failures handled separately)');
  const ax = (o) => Object.assign(new Error(o.message || 'x'), o);
  await test('network failure → offline', () => {
    assert.equal(errorKindOf(ax({ code: 'ERR_NETWORK', message: 'Network Error' })), 'offline');
    assert.equal(errorKindOf(ax({ code: 'ENOTFOUND' })), 'offline');
    assert.equal(errorKindOf(ax({ isOffline: true, response: { status: 0 } })), 'offline');
  });
  await test('timeout → timeout (even with the fabricated status-0 response)', () => {
    assert.equal(errorKindOf(ax({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded', response: { status: 0 } })), 'timeout');
  });
  await test('HTTP statuses → server / auth / forbidden / notFound / rateLimited', () => {
    assert.equal(errorKindOf(ax({ response: { status: 500 } })), 'server');
    assert.equal(errorKindOf(ax({ response: { status: 503 } })), 'server');
    assert.equal(errorKindOf(ax({ response: { status: 401 } })), 'auth');
    assert.equal(errorKindOf(ax({ response: { status: 403 } })), 'forbidden');
    assert.equal(errorKindOf(ax({ response: { status: 404 } })), 'notFound');
    assert.equal(errorKindOf(ax({ response: { status: 429 } })), 'rateLimited');
  });
  await test('user-facing copy is French and never leaks technical text', () => {
    const samples = [ax({ code: 'ERR_NETWORK', message: 'Network Error' }), ax({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }),
      ax({ response: { status: 500 }, message: 'Request failed with status code 500' }), null, undefined, 'weird', {}];
    for (const s of samples) {
      const c = classifyError(s);
      assert.ok(c.title && c.message);
      assert.ok(!/Network Error|status code|timeout of|undefined|\[object|Error:/i.test(c.title + c.message), c.message);
    }
    assert.equal(classifyError(null).kind, 'unknown');
    assert.equal(classifyError(ax({ response: { status: 500 } })).retryable, true);
    assert.equal(classifyError(ax({ response: { status: 403 } })).retryable, false);
  });

  console.log(`\n${passed} passed${process.exitCode ? ' — WITH FAILURES' : ''}`);
})();
