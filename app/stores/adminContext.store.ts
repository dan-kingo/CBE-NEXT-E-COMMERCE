import { defineStore } from "pinia";

export const useAdminContextStore = defineStore("adminContext", {
  state: () => ({
    selectedTenantId: "" as string,
    categorySearchQuery: "",
    selectedCategoryId: null as number | null,
  }),

  actions: {
    setSelectedTenantId(tenantId: string) {
      this.selectedTenantId = tenantId;
    },

    setCategorySearchQuery(query: string) {
      this.categorySearchQuery = query;
    },

    setSelectedCategoryId(categoryId: number | null) {
      this.selectedCategoryId = categoryId;
    },
  },
});
