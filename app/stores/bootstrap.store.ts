import { defineStore } from "pinia";

export const useBootstrapStore = defineStore("bootstrap", {
  state: () => ({
    isBootstrapped: false,
    isPending: false,
    lastError: null as string | null,
  }),

  actions: {
    start() {
      this.isPending = true;
      this.lastError = null;
    },

    markSuccess() {
      this.isBootstrapped = true;
      this.isPending = false;
      this.lastError = null;
    },

    markFailure(message: string) {
      this.isPending = false;
      this.lastError = message;
    },
  },
});
