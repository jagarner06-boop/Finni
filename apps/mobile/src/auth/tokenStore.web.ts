// Web fallback demo only: localStorage, wrapped so private mode / blocked storage doesn't crash.
export const tokenStore = {
  get: async (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  remove: async (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
