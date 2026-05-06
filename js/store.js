/**
 * SkillSync — store.js
 * Shared state via sessionStorage across the current browser tab.
 */

const Store = {
  KEY: "skillsync_analysis",

  save(data) {
    try {
      sessionStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Store.save failed:", e);
    }
  },

  load() {
    try {
      const raw = sessionStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  clear() {
    sessionStorage.removeItem(this.KEY);
  },

  has() {
    return !!sessionStorage.getItem(this.KEY);
  },
};
