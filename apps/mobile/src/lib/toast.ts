// Tiny pub/sub so non-React code (notifications on web, API errors) can show a
// toast. The <Toast> UI component subscribes once at the root.

export interface ToastMessage {
  id: number;
  title: string;
  body?: string;
}

type Listener = (t: ToastMessage) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function showToast(title: string, body?: string) {
  const msg = { id: nextId++, title, body };
  listeners.forEach((l) => l(msg));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
