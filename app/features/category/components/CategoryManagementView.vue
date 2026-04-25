<script setup lang="ts">
import type { Category, CreateCategoryRequest } from "~/features/category/types/category.types";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { useCategoryManagement } from "~/features/category/composables/useCategoryManagement";

interface CategoryManagementViewProps {
    mode?: "list" | "create" | "edit";
    categoryId?: string;
}

const props = withDefaults(defineProps<CategoryManagementViewProps>(), {
    mode: "list",
    categoryId: "",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const router = useRouter();
const route = useRoute();

const {
    categories,
    isCategoriesLoading,
    categoriesLoaded,
    categoriesPagination,
    loadCategories,
    refreshCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} = useCategoryManagement();

const isSubmitting = ref(false);
const isDeleting = ref(false);
const isDeleteDialogOpen = ref(false);
const categoryPendingDelete = ref<Category | null>(null);
const expandedCategoryIds = ref(new Set<string>());
const searchQuery = ref("");
const openActionMenuForId = ref<string | null>(null);

const form = reactive({
    name: "",
    slug: "",
    description: "",
    parentId: "",
});

interface CategoryTreeRow {
    category: Category;
    depth: number;
}

interface CategoryListRow {
    category: Category;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
}

const isListMode = computed(() => props.mode === "list");
const isEditMode = computed(() => props.mode === "edit");

const editingCategoryId = computed(() => {
    if (props.categoryId) {
        return props.categoryId;
    }

    const id = route.params.id;
    return typeof id === "string" ? id : "";
});

const normalizeChildren = (category: Category) => {
    return Array.isArray(category.children) ? category.children : [];
};

const flattenTreeRows = (items: Category[], depth = 0): CategoryTreeRow[] => {
    return items.flatMap((item) => [
        { category: item, depth },
        ...flattenTreeRows(normalizeChildren(item), depth + 1),
    ]);
};

const categoryTreeRows = computed(() => flattenTreeRows(categories.value));

const findCategoryById = (nodes: Category[], id: string): Category | null => {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }

        const found = findCategoryById(normalizeChildren(node), id);
        if (found) {
            return found;
        }
    }

    return null;
};

const selectedCategory = computed(() => {
    if (!editingCategoryId.value) {
        return null;
    }

    return findCategoryById(categories.value, editingCategoryId.value);
});

const getChildrenCount = (category: Category) => {
    return normalizeChildren(category).length;
};

const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0);

const filteredRootCategories = computed(() => {
    const roots = categories.value.filter((item) => item.parentId === null);
    const q = searchQuery.value.trim().toLowerCase();

    if (!q) {
        return roots;
    }

    const filterTree = (nodes: Category[]): Category[] => {
        return nodes.flatMap((node) => {
            const children = filterTree(normalizeChildren(node));
            const matches =
                node.name.toLowerCase().includes(q) ||
                node.slug.toLowerCase().includes(q);

            if (!matches && !children.length) {
                return [];
            }

            return [
                {
                    ...node,
                    children: matches ? normalizeChildren(node) : children,
                },
            ];
        });
    };

    return filterTree(roots);
});

const isExpanded = (categoryId: string) => {
    return expandedCategoryIds.value.has(categoryId);
};

const toggleCategory = (categoryId: string) => {
    if (hasSearchQuery.value) {
        return;
    }

    const next = new Set(expandedCategoryIds.value);
    if (next.has(categoryId)) {
        next.delete(categoryId);
    } else {
        next.add(categoryId);
    }

    expandedCategoryIds.value = next;
};

const visibleCategoryRows = computed<CategoryListRow[]>(() => {
    const rows: CategoryListRow[] = [];

    const visit = (nodes: Category[], depth: number) => {
        for (const category of nodes) {
            const children = normalizeChildren(category);
            const hasChildren = children.length > 0;
            const expanded = hasSearchQuery.value ? true : isExpanded(category.id);

            rows.push({
                category,
                depth,
                hasChildren,
                isExpanded: expanded,
            });

            if (hasChildren && expanded) {
                visit(children, depth + 1);
            }
        }
    };

    visit(filteredRootCategories.value, 0);
    return rows;
});

const allCategoryOptions = computed(() => {
    const options = categoryTreeRows.value;
    if (isEditMode.value && editingCategoryId.value) {
        return options.filter((item) => item.category.id !== editingCategoryId.value);
    }

    return options;
});

const getTreeLabel = (name: string, depth: number) => {
    return `${"  ".repeat(depth)}${depth ? "- " : ""}${name}`;
};

const parseFormToPayload = (): CreateCategoryRequest => ({
    name: form.name,
    slug: form.slug,
    description: form.description || undefined,
    parentId: form.parentId || null,
});

const isInitialLoading = computed(
    () => isCategoriesLoading.value && !categoriesLoaded.value,
);

const pageSummary = computed(() => {
    if (!categoriesPagination.value.totalElements) {
        return "No categories";
    }

    const start = categoriesPagination.value.page * categoriesPagination.value.size + 1;
    const end = start + categoriesPagination.value.numberOfElements - 1;
    return `Showing ${start}-${end} of ${categoriesPagination.value.totalElements}`;
});

const fetchCategories = async (page = categoriesPagination.value.page, force = false) => {
    const size = categoriesPagination.value.size > 1
        ? categoriesPagination.value.size
        : DEFAULT_PAGE_SIZE;

    try {
        await loadCategories({
            force,
            page,
            size,
        });
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    }
};

const fillFormFromCategory = (category: Category) => {
    form.name = category.name;
    form.slug = category.slug;
    form.description = category.description || "";
    form.parentId = category.parentId ? String(category.parentId) : "";
};

const openDeleteDialog = (category: Category) => {
    openActionMenuForId.value = null;
    categoryPendingDelete.value = category;
    isDeleteDialogOpen.value = true;
};

const closeDeleteDialog = () => {
    isDeleteDialogOpen.value = false;
    categoryPendingDelete.value = null;
};

const confirmDeleteCategory = async () => {
    if (!categoryPendingDelete.value) {
        return;
    }

    isDeleting.value = true;

    try {
        await deleteCategory(categoryPendingDelete.value.id);

        // Keep UI responsive by updating instantly, then silently reconcile server-side cascade results.
        void refreshCategories({
            page: categoriesPagination.value.page,
            size: categoriesPagination.value.size > 1
                ? categoriesPagination.value.size
                : DEFAULT_PAGE_SIZE,
        });
        toast.success({ message: "Category deleted" });

        closeDeleteDialog();
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isDeleting.value = false;
    }
};

const goToPreviousPage = async () => {
    if (!categoriesPagination.value.hasPrevious || isCategoriesLoading.value) {
        return;
    }

    await fetchCategories(categoriesPagination.value.page - 1);
};

const goToNextPage = async () => {
    if (!categoriesPagination.value.hasNext || isCategoriesLoading.value) {
        return;
    }

    await fetchCategories(categoriesPagination.value.page + 1);
};

const goToCreateCategory = async () => {
    await navigateTo("/dashboard/categories/create");
};

const goToEditCategory = async (category: Category) => {
    openActionMenuForId.value = null;
    await fetchCategories(categoriesPagination.value.page, false);
    await navigateTo(`/dashboard/categories/${category.id}/edit`);
};

const submitCategory = async () => {
    const payload = parseFormToPayload();

    isSubmitting.value = true;
    try {
        if (isEditMode.value && editingCategoryId.value) {
            await updateCategory(editingCategoryId.value, payload);
            toast.success({ message: "Category updated successfully" });
        } else {
            await createCategory(payload);
            toast.success({ message: "Category created successfully" });
        }

        await navigateTo("/dashboard/categories");
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isSubmitting.value = false;
    }
};

const toggleActionMenu = (categoryId: string) => {
    openActionMenuForId.value = openActionMenuForId.value === categoryId
        ? null
        : categoryId;
};

const closeActionMenu = () => {
    openActionMenuForId.value = null;
};

const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
        return;
    }

    if (target.closest("[data-action-menu]")) {
        return;
    }

    closeActionMenu();
};

onMounted(async () => {
    document.addEventListener("click", handleDocumentClick, true);

    const initialPage = categoriesLoaded.value ? categoriesPagination.value.page : 0;
    await fetchCategories(initialPage);

    if (isEditMode.value) {
        if (!selectedCategory.value) {
            await fetchCategories(0, true);
        }

        if (!selectedCategory.value) {
            toast.error({ message: "Category not found." });
            await navigateTo("/dashboard/categories");
            return;
        }

        fillFormFromCategory(selectedCategory.value);
    }
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleDocumentClick, true);
});
</script>

<template>
    <section class="space-y-6">
        <Card v-if="isListMode" class="w-full px-6">
            <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <h2 class="text-lg font-medium">Category List</h2>
                    <div class="flex items-center gap-3">
                        <Input v-model="searchQuery" placeholder="Search by name or slug" class="max-w-sm" />
                        <Button class="cursor-pointer" @click="goToCreateCategory">
                            <Icon name="lucide:plus" class="size-4" />
                            Create Category
                        </Button>
                    </div>
                </div>

                <div v-if="isInitialLoading" class="text-sm text-muted-foreground">Loading categories...</div>

                <div v-else>
                    <div class="space-y-3 md:hidden">
                        <div v-for="row in visibleCategoryRows" :key="`mobile-${row.category.id}`"
                            class="space-y-3 rounded-lg border p-3">
                            <div>
                                <p class="text-xs text-muted-foreground">Category</p>
                                <p class="font-medium" :style="{ paddingLeft: `${row.depth * 12}px` }">
                                    <button v-if="row.hasChildren" type="button"
                                        class="inline-flex items-center gap-1 text-left"
                                        @click="toggleCategory(row.category.id)">
                                        <Icon :name="row.isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                                            class="size-4 text-muted-foreground" />
                                        <Icon :name="row.isExpanded ? 'lucide:folder-open' : 'lucide:folder'"
                                            class="size-4 text-muted-foreground" />
                                        {{ row.category.name }}
                                    </button>
                                    <span v-else class="inline-flex items-center gap-1">
                                        <Icon name="lucide:file" class="size-4 text-muted-foreground" />
                                        {{ row.category.name }}
                                    </span>
                                </p>
                            </div>

                            <div class="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p class="text-xs text-muted-foreground">Slug</p>
                                    <p>{{ row.category.slug }}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-muted-foreground">Children</p>
                                    <p>{{ getChildrenCount(row.category) }}</p>
                                </div>
                            </div>

                            <div class="flex justify-end">
                                <div class="relative" data-action-menu>
                                    <Button class="cursor-pointer" size="icon-sm" variant="ghost"
                                        @click="toggleActionMenu(row.category.id)">
                                        <Icon name="lucide:ellipsis" class="size-4" />
                                    </Button>

                                    <div v-if="openActionMenuForId === row.category.id"
                                        class="absolute left-0 bottom-full z-50 mb-2 min-w-40 rounded-md border bg-background p-1 shadow-lg">
                                        <button
                                            class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                                            @click="goToEditCategory(row.category)">
                                            View &amp; Edit
                                        </button>
                                        <button
                                            class="w-full rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-muted cursor-pointer"
                                            @click="openDeleteDialog(row.category)">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p v-if="!visibleCategoryRows.length" class="py-4 text-center text-muted-foreground">
                            No categories found.
                        </p>
                    </div>

                    <div class="hidden overflow-x-auto md:block">
                        <table class="w-full border-collapse text-sm">
                            <thead>
                                <tr class="border-b text-left">
                                    <th class="py-2">Name</th>
                                    <th class="py-2">Slug</th>
                                    <th class="py-2">Children</th>
                                    <th class="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in visibleCategoryRows" :key="row.category.id"
                                    class="border-b align-top">
                                    <td class="py-2 font-medium">
                                        <div :style="{ paddingLeft: `${row.depth * 16}px` }"
                                            class="inline-flex items-center gap-1">
                                            <button v-if="row.hasChildren" type="button"
                                                class="inline-flex items-center gap-1 text-left"
                                                @click="toggleCategory(row.category.id)">
                                                <Icon
                                                    :name="row.isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                                                    class="size-4 text-muted-foreground" />
                                                <Icon :name="row.isExpanded ? 'lucide:folder-open' : 'lucide:folder'"
                                                    class="size-4 text-muted-foreground" />
                                            </button>
                                            <Icon v-else name="lucide:file" class="size-4 text-muted-foreground" />
                                            {{ row.category.name }}
                                        </div>
                                    </td>
                                    <td class="py-2 text-muted-foreground">{{ row.category.slug }}</td>
                                    <td class="py-2">{{ getChildrenCount(row.category) }}</td>
                                    <td class="py-2">
                                        <div class="relative" data-action-menu>
                                            <Button class="cursor-pointer" size="icon-sm" variant="ghost"
                                                @click="toggleActionMenu(row.category.id)">
                                                <Icon name="lucide:ellipsis" class="size-4" />
                                            </Button>

                                            <div v-if="openActionMenuForId === row.category.id"
                                                class="absolute right-full top-6 z-50 mb-2 min-w-40 rounded-md border bg-background p-1 shadow-lg">
                                                <button
                                                    class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                                                    @click="goToEditCategory(row.category)">
                                                    View &amp; Edit
                                                </button>
                                                <button
                                                    class="w-full rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-muted cursor-pointer"
                                                    @click="openDeleteDialog(row.category)">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="!visibleCategoryRows.length">
                                    <td colspan="4" class="py-4 text-center text-muted-foreground">No categories
                                        found.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
                        <div class="flex items-center gap-2">
                            <Button class="cursor-pointer" size="sm" variant="outline"
                                :disabled="!categoriesPagination.hasPrevious || isCategoriesLoading"
                                @click="goToPreviousPage">
                                Previous
                            </Button>
                            <p class="text-xs text-muted-foreground">
                                Page {{ categoriesPagination.page + 1 }} of
                                {{ Math.max(categoriesPagination.totalPages, 1) }}
                            </p>
                            <Button class="cursor-pointer" size="sm" variant="outline"
                                :disabled="!categoriesPagination.hasNext || isCategoriesLoading" @click="goToNextPage">
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Card>

        <Card v-else class="mx-auto w-full max-w-2xl px-6">
            <div class="space-y-4">
                <h2 class="text-lg font-medium">
                    {{ isEditMode ? "Edit Category" : "Create Category" }}
                </h2>

                <div class="space-y-2">
                    <Label for="category-name">Name</Label>
                    <Input id="category-name" v-model="form.name" placeholder="Electronics" />
                </div>

                <div class="space-y-2">
                    <Label for="category-slug">Slug</Label>
                    <Input id="category-slug" v-model="form.slug" placeholder="electronics" />
                </div>

                <div class="space-y-2">
                    <Label for="category-parent">Parent Category (optional)</Label>
                    <select id="category-parent" v-model="form.parentId"
                        class="border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                        <option value="">No parent</option>
                        <option v-for="option in allCategoryOptions" :key="option.category.id"
                            :value="String(option.category.id)">
                            {{ getTreeLabel(option.category.name, option.depth) }}
                        </option>
                    </select>
                </div>

                <div class="space-y-2">
                    <Label for="category-description">Description</Label>
                    <Textarea id="category-description" v-model="form.description" placeholder="Category details" />
                </div>

                <div class="flex items-center gap-2">
                    <Button class="cursor-pointer" variant="outline" @click="router.push('/dashboard/categories')">
                        Cancel
                    </Button>
                    <Button class="cursor-pointer" :disabled="isSubmitting" @click="submitCategory">
                        {{ isSubmitting ? "Saving..." : isEditMode ? "Update Category" : "Create Category" }}
                    </Button>
                </div>
            </div>
        </Card>

        <div v-if="isDeleteDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            @click.self="closeDeleteDialog">
            <div role="dialog" aria-modal="true" aria-labelledby="delete-category-title"
                class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
                <h3 id="delete-category-title" class="text-lg font-semibold">Delete category?</h3>
                <p class="mt-2 text-sm text-muted-foreground">
                    This will permanently delete
                    <span class="font-medium text-foreground">{{ categoryPendingDelete?.name }}</span>.
                    This action cannot be undone.
                </p>

                <div class="mt-6 flex justify-end gap-2">
                    <Button class="cursor-pointer" variant="outline" :disabled="isDeleting"
                        @click="closeDeleteDialog">Cancel</Button>
                    <Button class="cursor-pointer" variant="destructive" :disabled="isDeleting"
                        @click="confirmDeleteCategory">
                        {{ isDeleting ? "Deleting..." : "Delete" }}
                    </Button>
                </div>
            </div>
        </div>
    </section>
</template>
