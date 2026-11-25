// "This part of the page is ready to be seen": the loader waits for these before it lifts.
// A part calls markReady(name) once (e.g. "hero" when its picture is on screen); the loader
// awaits whenReady(name). Order does not matter: marking before anyone waits is remembered.

const done = new Set<string>();
const EVENT = "site-ready";

export function markReady(name: string) {
  if (done.has(name)) return;
  done.add(name);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: name }));
}

export function whenReady(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (done.has(name)) return resolve();
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== name) return;
      window.removeEventListener(EVENT, on);
      resolve();
    };
    window.addEventListener(EVENT, on);
  });
}
