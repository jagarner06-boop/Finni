/** FNV-1a 32-bit hash of a string. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** `n` stable digits for an id (Nessie ids are hex, the design shows "•••• 4821"). */
export const digitsFor = (id: string, n: number): string => String(fnv1a(id) % 10 ** n).padStart(n, "0");

export const maskFor = (id: string): string => digitsFor(id, 4);
