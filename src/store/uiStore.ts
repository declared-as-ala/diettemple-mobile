/**
 * Global UI state: loading overlay, snackbar queue, theme preference.
 * Single source of truth — replaces ThemeContext + scattered loading states.
 *
 * Usage:
 *   const setGlobalLoading = useUIStore(s => s.setGlobalLoading);
 *   const showSnackbar = useUIStore(s => s.showSnackbar);
 */
import { create } from 'zustand';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarItem {
  id: string;
  message: string;
  type: SnackbarType;
  /** Auto-dismiss after ms. Default 3500. */
  duration?: number;
  /** Optional action label. */
  actionLabel?: string;
  onAction?: () => void;
}

interface UIStore {
  // ── Global loader ────────────────────────────────────────────────────
  globalLoading: boolean;
  globalLoadingLabel: string | null;
  setGlobalLoading: (visible: boolean, label?: string) => void;

  // ── Snackbar queue ───────────────────────────────────────────────────
  snackbars: SnackbarItem[];
  showSnackbar: (
    message: string,
    type?: SnackbarType,
    opts?: { duration?: number; actionLabel?: string; onAction?: () => void }
  ) => void;
  dismissSnackbar: (id: string) => void;
  clearSnackbars: () => void;

  // ── Convenience shortcuts ────────────────────────────────────────────
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useUIStore = create<UIStore>((set, get) => ({
  // ── Global loader ────────────────────────────────────────────────────
  globalLoading: false,
  globalLoadingLabel: null,

  setGlobalLoading: (visible, label = undefined) =>
    set({ globalLoading: visible, globalLoadingLabel: label ?? null }),

  // ── Snackbar queue ───────────────────────────────────────────────────
  snackbars: [],

  showSnackbar: (message, type = 'info', opts = {}) => {
    const item: SnackbarItem = {
      id: uid(),
      message,
      type,
      duration: opts.duration ?? 3500,
      actionLabel: opts.actionLabel,
      onAction: opts.onAction,
    };
    set((s) => ({ snackbars: [...s.snackbars.slice(-2), item] })); // max 3 at once
  },

  dismissSnackbar: (id) =>
    set((s) => ({ snackbars: s.snackbars.filter((sb) => sb.id !== id) })),

  clearSnackbars: () => set({ snackbars: [] }),

  // ── Shortcuts ────────────────────────────────────────────────────────
  showSuccess: (message) => get().showSnackbar(message, 'success'),
  showError: (message) => get().showSnackbar(message, 'error'),
  showInfo: (message) => get().showSnackbar(message, 'info'),
}));
