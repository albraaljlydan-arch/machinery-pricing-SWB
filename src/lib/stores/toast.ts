import { writable } from 'svelte/store';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
  // Undo-mode fields — present only when this toast represents a delayed
  // action (Delete, Submit to Admin, etc.) rather than a plain notice.
  isUndo: boolean;
  seconds: number;
  totalSeconds: number;
}

function createToastStore() {
  const { subscribe, set } = writable<ToastState | null>(null);
  let counter = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let pendingAction: (() => void) | null = null;

  function clearTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  /** A plain notice — no countdown, no action, just auto-dismisses. */
  function notify(message: string, kind: ToastKind = 'info', durationMs = 4000) {
    clearTimer();
    pendingAction = null;
    const id = ++counter;
    set({ id, kind, message, isUndo: false, seconds: 0, totalSeconds: 0 });
    timer = setInterval(() => {
      clearTimer();
      set(null);
    }, durationMs) as unknown as ReturnType<typeof setInterval>;
  }

  /** A delayed action — counts down from `seconds`, big and dismissible.
   *  `onConfirm` only actually runs once the countdown reaches 0; clicking
   *  Undo cancels it outright. A second call while one is already counting
   *  down restarts the timer with the new message/action. */
  function confirmWithUndo(message: string, seconds: number, onConfirm: () => void) {
    clearTimer();
    const id = ++counter;
    let remaining = seconds;
    pendingAction = onConfirm;
    set({ id, kind: 'info', message, isUndo: true, seconds: remaining, totalSeconds: seconds });
    timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearTimer();
        set(null);
        const action = pendingAction;
        pendingAction = null;
        action?.();
        return;
      }
      set({ id, kind: 'info', message, isUndo: true, seconds: remaining, totalSeconds: seconds });
    }, 1000) as unknown as ReturnType<typeof setInterval>;
  }

  function cancelUndo() {
    clearTimer();
    pendingAction = null;
    set(null);
  }

  function dismiss() {
    clearTimer();
    pendingAction = null;
    set(null);
  }

  return { subscribe, notify, confirmWithUndo, cancelUndo, dismiss };
}

export const toast = createToastStore();
