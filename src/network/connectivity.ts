/**
 * Centralised connectivity manager (single source of truth for "can the app reach the server?").
 *
 * It combines three signals:
 *  1. the device's own network state (expo-network listener): airplane mode / no Wi-Fi / no cellular → offline at once;
 *  2. REAL API traffic (reported by the axios interceptors): a request that never reached the server triggers a check,
 *     and several slow / timed-out requests in a row mean "slow connection" (the app keeps working, a banner shows up);
 *  3. an active probe of the server's /health endpoint: confirms "offline" (captive portals and Wi-Fi without internet
 *     look connected to the device) and, while offline, polls with a back-off until the server answers again.
 *
 * The class has NO React / React Native imports and takes its side effects as dependencies, so the state machine is
 * unit-testable with fake timers and a fake probe.
 */

export type ConnectionStatus = 'online' | 'slow' | 'offline';

export interface ConnectivityState {
  status: ConnectionStatus;
  /** True while a manual or automatic check is running (the "Réessayer" button shows a spinner). */
  checking: boolean;
  /** Timestamp of the last status change. */
  since: number;
}

export interface RequestSample {
  /** Round-trip time in ms. */
  durationMs: number;
  /** The server answered (any HTTP status). */
  reachedServer: boolean;
  timedOut?: boolean;
}

export interface ConnectivityDeps {
  /** Resolves true when the server answered (any HTTP status), false when it could not be reached. */
  probe: () => Promise<boolean>;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
}

export const SLOW_REQUEST_MS = 6000;
const SLOW_WINDOW = 5;
const SLOW_ENTER = 3; // 3 slow samples out of the last 5 → "slow"
const FAST_EXIT = 3; // 3 fast samples in a row → back to "online"
const RECHECK_DELAYS_MS = [3000, 5000, 8000, 15000]; // offline polling back-off (last value repeats)
const VERIFY_DEBOUNCE_MS = 400;

type StateListener = (s: ConnectivityState) => void;
type ReconnectListener = () => void;

export class ConnectivityManager {
  private state: ConnectivityState;
  private readonly listeners = new Set<StateListener>();
  private readonly reconnectListeners = new Set<ReconnectListener>();
  private readonly samples: boolean[] = []; // true = slow
  private deviceReachable: boolean | null = null; // null = unknown (treated as reachable)
  private pollTimer: unknown = null;
  private verifyTimer: unknown = null;
  private pollAttempt = 0;
  private checkingCount = 0;

  private readonly probe: () => Promise<boolean>;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (id: unknown) => void;

  constructor(deps: ConnectivityDeps) {
    this.probe = deps.probe;
    this.now = deps.now ?? (() => Date.now());
    this.setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = deps.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
    this.state = { status: 'online', checking: false, since: this.now() };
  }

  getState(): ConnectivityState {
    return this.state;
  }

  subscribe(fn: StateListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Fired every time the app goes from offline back to online (reload your data here). */
  onReconnect(fn: ReconnectListener): () => void {
    this.reconnectListeners.add(fn);
    return () => this.reconnectListeners.delete(fn);
  }

  // ── signals ────────────────────────────────────────────────────────────────

  /** From the OS: `reachable` is false in airplane mode / without any network. null = unknown. */
  setDeviceReachable(reachable: boolean | null): void {
    const was = this.deviceReachable;
    this.deviceReachable = reachable;
    if (reachable === false) {
      this.setStatus('offline');
      this.startPolling();
    } else if (was === false || this.state.status === 'offline') {
      // The device says it is back, but that proves nothing (captive portal): confirm with a real request.
      void this.verify();
    }
  }

  /** From the axios interceptors, once per finished request. */
  reportRequest(sample: RequestSample): void {
    if (!sample.reachedServer && !sample.timedOut) {
      // No answer at all (DNS / connection refused / network lost): check right away instead of waiting for the next call.
      this.scheduleVerify();
      return;
    }
    if (sample.reachedServer && this.state.status === 'offline') {
      // Real traffic got through: that is the best possible proof we are back.
      this.markOnline();
    }
    this.samples.push(!!sample.timedOut || sample.durationMs > SLOW_REQUEST_MS);
    if (this.samples.length > SLOW_WINDOW) this.samples.shift();
    this.evaluateSlow();
  }

  /** Manual "Réessayer". Resolves true when the server is reachable. */
  async retryNow(): Promise<boolean> {
    return this.verify();
  }

  dispose(): void {
    this.stopPolling();
    if (this.verifyTimer) this.clearTimer(this.verifyTimer);
    this.verifyTimer = null;
    this.listeners.clear();
    this.reconnectListeners.clear();
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private evaluateSlow(): void {
    if (this.state.status === 'offline') return;
    const slowCount = this.samples.filter(Boolean).length;
    if (this.state.status === 'online' && this.samples.length >= SLOW_ENTER && slowCount >= SLOW_ENTER) {
      this.setStatus('slow');
    } else if (this.state.status === 'slow') {
      const last = this.samples.slice(-FAST_EXIT);
      if (last.length === FAST_EXIT && last.every((s) => !s)) {
        this.setStatus('online');
      }
    }
  }

  private scheduleVerify(): void {
    if (this.verifyTimer) return;
    this.verifyTimer = this.setTimer(() => {
      this.verifyTimer = null;
      void this.verify();
    }, VERIFY_DEBOUNCE_MS);
  }

  private async verify(): Promise<boolean> {
    this.beginChecking();
    let ok = false;
    try {
      // Always ask the server for real, even when the OS says "no network": a missed OS event must never leave the app stuck offline.
      ok = await this.probe();
    } catch {
      ok = false;
    } finally {
      this.endChecking();
    }
    if (ok) this.markOnline();
    else {
      this.setStatus('offline');
      this.startPolling();
    }
    return ok;
  }

  private markOnline(): void {
    const wasOffline = this.state.status === 'offline';
    this.stopPolling();
    this.samples.length = 0;
    this.setStatus('online');
    if (wasOffline) {
      this.reconnectListeners.forEach((fn) => {
        try {
          fn();
        } catch {
          /* a faulty subscriber must never break the others */
        }
      });
    }
  }

  private startPolling(): void {
    if (this.pollTimer) return;
    const tick = () => {
      this.pollTimer = null;
      if (this.state.status !== 'offline') return;
      void this.verify().then((ok) => {
        if (!ok && this.state.status === 'offline' && !this.pollTimer) {
          this.pollAttempt += 1;
          const delay = RECHECK_DELAYS_MS[Math.min(this.pollAttempt, RECHECK_DELAYS_MS.length - 1)];
          this.pollTimer = this.setTimer(tick, delay);
        }
      });
    };
    this.pollAttempt = 0;
    this.pollTimer = this.setTimer(tick, RECHECK_DELAYS_MS[0]);
  }

  private stopPolling(): void {
    if (this.pollTimer) this.clearTimer(this.pollTimer);
    this.pollTimer = null;
    this.pollAttempt = 0;
  }

  private beginChecking(): void {
    this.checkingCount += 1;
    this.emit({ ...this.state, checking: true });
  }

  private endChecking(): void {
    this.checkingCount = Math.max(0, this.checkingCount - 1);
    if (this.checkingCount === 0) this.emit({ ...this.state, checking: false });
  }

  private setStatus(status: ConnectionStatus): void {
    if (status === this.state.status) return;
    this.emit({ ...this.state, status, since: this.now() });
  }

  private emit(next: ConnectivityState): void {
    this.state = next;
    this.listeners.forEach((fn) => {
      try {
        fn(next);
      } catch {
        /* ignore subscriber errors */
      }
    });
  }
}
