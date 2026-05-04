import { storeToRefs } from "pinia";
import {
  createCategorySchema,
  type CreateCategoryInput,
} from "~/features/category/schemas/category.schema";
import { useCategoryStore } from "~/features/category/store/category.store";

export const useCategoryManagement = () => {
  const store = useCategoryStore();
  const { categories, isFetching, isLoaded, pagination } = storeToRefs(store);

  const parsePayload = (payload: {
    name: string;
    description?: string;
    parentId?: string | null;
  }): CreateCategoryInput => {
    const parsed = createCategorySchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message || "Invalid category data",
      );
    }

    return parsed.data;
  };

  return {
    categories,
    isCategoriesLoading: isFetching,
    categoriesLoaded: isLoaded,
    categoriesPagination: pagination,
    loadCategories: store.ensureCategories,
    refreshCategories: store.revalidateCategories,
    createCategory: async (payload: {
      name: string;
      description?: string;
      parentId?: string | null;
    }) => {
      const input = parsePayload(payload);
      return await store.createCategory(input);
    },
    updateCategory: async (
      categoryId: string,
      payload: {
        name: string;
        description?: string;
        parentId?: string | null;
      },
    ) => {
      const input = parsePayload(payload);
      return await store.updateCategory(categoryId, input);
    },
    deleteCategory: store.deleteCategory,
  };
};
