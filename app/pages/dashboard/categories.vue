<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { CategoryResponse, CreateCategoryRequest } from "~/types/admin";
import { categoryService } from "~/services/category.service";
import { useAdminDataStore } from "~/stores/adminData.store";
import { useAdminContextStore } from "~/stores/adminContext.store";
import { categorySchema } from "~/validations/admin.schema";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const contextStore = useAdminContextStore();
const adminDataStore = useAdminDataStore();
const { categories, isCategoriesLoading, categoriesLoaded, categoriesPagination } =
    storeToRefs(adminDataStore);

const descendants = ref<number[]>([]);
const selectedCategory = ref<CategoryResponse | null>(null);
const isSubmitting = ref(false);
const isDeleting = ref(false);
const isDescendantsLoading = ref(false);
const editingCategoryId = ref<number | null>(null);
const editFormRef = ref<HTMLElement | null>(null);
const isDeleteDialogOpen = ref(false);
const isDescendantsDialogOpen = ref(false);
const categoryPendingDelete = ref<CategoryResponse | null>(null);
const descendantsDialogCategory = ref<CategoryResponse | null>(null);
const descendantsTree = ref<DescendantTreeNode[]>([]);

interface DescendantTreeNode {
    id: number;
    name: string;
    children: DescendantTreeNode[];
}

interface DescendantTreeRow {
    id: number;
    name: string;
    depth: number;
    hasChildren: boolean;
}

const form = reactive({
    name: "",
    slug: "",
    description: "",
    parentId: "",
});

interface CategoryTreeRow {
    category: CategoryResponse;
    depth: number;
}

const flattenTreeRows = (items: CategoryResponse[], depth = 0): CategoryTreeRow[] => {
    return items.flatMap((item) => [
        { category: item, depth },
        ...flattenTreeRows(item.children || [], depth + 1),
    ]);
};

const categoryTreeRows = computed(() => flattenTreeRows(categories.value));

const allCategoryOptions = computed(() => {
    const options = categoryTreeRows.value;
    if (editingCategoryId.value) {
        return options.filter((item) => item.category.id !== editingCategoryId.value);
    }

    return options;
});

const categoryNameById = computed(() => {
    const map = new Map<number, string>();
    for (const row of categoryTreeRows.value) {
        map.set(row.category.id, row.category.name);
    }
    return map;
});

const getTreeLabel = (name: string, depth: number) => {
    return `${"\u00A0\u00A0".repeat(depth)}${depth ? "- " : ""}${name}`;
};

const getParentName = (parentId: number | null) => {
    if (!parentId) {
        return "-";
    }

    return categoryNameById.value.get(parentId) || `Unknown (#${parentId})`;
};

const searchQuery = computed({
    get: () => contextStore.categorySearchQuery,
    set: (value: string) => contextStore.setCategorySearchQuery(value),
});

const filteredCategories = computed(() => {
    if (!searchQuery.value) {
        return categoryTreeRows.value;
    }

    const q = searchQuery.value.toLowerCase();
    return categoryTreeRows.value.filter(
        (row) =>
            row.category.name.toLowerCase().includes(q) ||
            row.category.slug.toLowerCase().includes(q),
    );
});

const resetForm = () => {
    form.name = "";
    form.slug = "";
    form.description = "";
    form.parentId = "";
    editingCategoryId.value = null;
};

const parseFormToPayload = (): CreateCategoryRequest | null => {
    const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        parentId: form.parentId ? Number(form.parentId) : null,
    };

    const parsed = categorySchema.safeParse(payload);
    if (!parsed.success) {
        toast.error({ message: parsed.error.issues[0]?.message || "Invalid data" });
        return null;
    }

    return parsed.data;
};

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

const loadCategories = async (page = categoriesPagination.value.page, force = false) => {
    try {
        await adminDataStore.ensureCategories({
            force,
            page,
            size: categoriesPagination.value.size,
        });

        if (!force && categoriesLoaded.value) {
            void adminDataStore.revalidateCategories({
                page,
                size: categoriesPagination.value.size,
            });
        }
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    }
};

const startEdit = async (category: CategoryResponse) => {
    editingCategoryId.value = category.id;
    form.name = category.name;
    form.slug = category.slug;
    form.description = category.description || "";
    form.parentId = category.parentId ? String(category.parentId) : "";

    if (window.matchMedia("(max-width: 767px)").matches) {
        await nextTick();
        editFormRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};

const submitCategory = async () => {
    const payload = parseFormToPayload();
    if (!payload) {
        return;
    }

    isSubmitting.value = true;
    try {
        if (editingCategoryId.value) {
            await categoryService.update(editingCategoryId.value, payload);
            await loadCategories(categoriesPagination.value.page, true);
            toast.success({ message: "Category updated successfully" });
        } else {
            await categoryService.create(payload);
            await loadCategories(0, true);
            toast.success({ message: "Category created successfully" });
        }

        resetForm();
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isSubmitting.value = false;
    }
};

const openDeleteDialog = (category: CategoryResponse) => {
    categoryPendingDelete.value = category;
    isDeleteDialogOpen.value = true;
};

const closeDeleteDialog = () => {
    isDeleteDialogOpen.value = false;
    categoryPendingDelete.value = null;
};

const closeDescendantsDialog = () => {
    isDescendantsDialogOpen.value = false;
    descendantsDialogCategory.value = null;
    descendantsTree.value = [];
};

const buildDescendantsTree = (
    descendantIds: number[],
    rootCategoryId: number,
    rootCategoryName: string,
): DescendantTreeNode[] => {
    const idsSet = new Set(descendantIds);
    const allRows = categoryTreeRows.value;
    const rowById = new Map(allRows.map((row) => [row.category.id, row.category]));

    const nodesById = new Map<number, DescendantTreeNode>();
    for (const id of descendantIds) {
        const category = rowById.get(id);
        nodesById.set(id, {
            id,
            name: category?.name || `Unknown (#${id})`,
            children: [],
        });
    }

    const roots: DescendantTreeNode[] = [];
    for (const id of descendantIds) {
        const node = nodesById.get(id);
        if (!node) {
            continue;
        }

        const category = rowById.get(id);
        const parentId = category?.parentId ?? null;

        if (parentId && idsSet.has(parentId)) {
            const parentNode = nodesById.get(parentId);
            if (parentNode) {
                parentNode.children.push(node);
                continue;
            }
        }

        roots.push(node);
    }

    const rootNodeFromDescendants = nodesById.get(rootCategoryId);
    if (rootNodeFromDescendants) {
        return [rootNodeFromDescendants];
    }

    return [
        {
            id: rootCategoryId,
            name: rootCategoryName,
            children: roots,
        },
    ];

};

const descendantsTreeRows = computed<DescendantTreeRow[]>(() => {
    const rows: DescendantTreeRow[] = [];

    const visit = (nodes: DescendantTreeNode[], depth: number) => {
        for (const node of nodes) {
            rows.push({
                id: node.id,
                name: node.name,
                depth,
                hasChildren: node.children.length > 0,
            });
            if (node.children.length) {
                visit(node.children, depth + 1);
            }
        }
    };

    visit(descendantsTree.value, 0);

    return rows;
});

const confirmDeleteCategory = async () => {
    if (!categoryPendingDelete.value) {
        return;
    }

    isDeleting.value = true;

    try {
        const deletingId = categoryPendingDelete.value.id;
        await categoryService.remove(deletingId);
        // Backend performs cascade delete, so re-sync to reflect the true server state.
        await loadCategories(categoriesPagination.value.page, true);
        toast.success({ message: "Category deleted" });

        if (selectedCategory.value?.id === deletingId) {
            selectedCategory.value = null;
            descendants.value = [];
            contextStore.setSelectedCategoryId(null);
        }

        closeDeleteDialog();
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isDeleting.value = false;
    }
};

const loadDescendants = async (category: CategoryResponse) => {
    isDescendantsDialogOpen.value = true;
    descendantsDialogCategory.value = category;
    isDescendantsLoading.value = true;

    try {
        descendants.value = await adminDataStore.ensureDescendants(category.id);
        selectedCategory.value = category;
        contextStore.setSelectedCategoryId(category.id);

        const resolvedNames = await Promise.all(
            descendants.value.map(async (id) => {
                const fromCache = categoryNameById.value.get(id);
                if (fromCache) {
                    return;
                }

                try {
                    const found = await categoryService.getById(id);
                    adminDataStore.upsertCategory(found);
                } catch {
                    // Ignore single-node hydrate failures; fallback labels are handled later.
                }
            }),
        );
        void resolvedNames;

        descendantsTree.value = buildDescendantsTree(
            descendants.value,
            category.id,
            category.name,
        );

        // Keep UX instant with cache, then silently refresh this subtree.
        void adminDataStore.revalidateDescendants(category.id);
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
        closeDescendantsDialog();
    } finally {
        isDescendantsLoading.value = false;
    }
};

const goToPreviousPage = async () => {
    if (!categoriesPagination.value.hasPrevious || isCategoriesLoading.value) {
        return;
    }

    await loadCategories(categoriesPagination.value.page - 1, true);
};

const goToNextPage = async () => {
    if (!categoriesPagination.value.hasNext || isCategoriesLoading.value) {
        return;
    }

    await loadCategories(categoriesPagination.value.page + 1, true);
};

onMounted(() => {
    loadCategories(0);
});
</script>

<template>
    <section class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="md:text-2xl text-xl font-semibold">Categories Management</h1>
                <p class="text-sm text-muted-foreground">
                    Manage all categories and their descendants in one place.
                </p>
            </div>
            <Button class="cursor-pointer" type="button" variant="outline" @click="resetForm">Reset Form</Button>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
            <div ref="editFormRef">
                <Card class="lg:col-span-1 px-6">
                    <div class="space-y-4">
                        <h2 class="text-lg font-medium">
                            {{ editingCategoryId ? "Edit Category" : "Create Category" }}
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
                            <Textarea id="category-description" v-model="form.description"
                                placeholder="Category details" />
                        </div>

                        <Button class="w-full cursor-pointer" :disabled="isSubmitting" @click="submitCategory">
                            {{ isSubmitting ? "Saving..." : editingCategoryId ? "Update Category" : "Create Category" }}
                        </Button>
                    </div>
                </Card>
            </div>

            <Card class="lg:col-span-2 px-6">
                <div class="space-y-4">
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                        <h2 class="md:text-lg text-xl font-medium">Category List</h2>
                        <Input v-model="searchQuery" placeholder="Search by name or slug" class="max-w-sm" />
                    </div>

                    <div v-if="isInitialLoading" class="text-sm text-muted-foreground">Loading categories...</div>

                    <div v-else>
                        <div class="space-y-3 md:hidden">
                            <div v-for="row in filteredCategories" :key="`mobile-${row.category.id}`"
                                class="rounded-lg border p-3 space-y-3">
                                <div>
                                    <p class="text-xs text-muted-foreground">Category</p>
                                    <p class="font-medium" :style="{ paddingLeft: `${row.depth * 12}px` }">
                                        <span v-if="row.depth" class="mr-1 text-muted-foreground">-</span>{{
                                            row.category.name }}
                                    </p>
                                </div>

                                <div class="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p class="text-xs text-muted-foreground">Slug</p>
                                        <p>{{ row.category.slug }}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-muted-foreground">Parent</p>
                                        <p>{{ getParentName(row.category.parentId) }}</p>
                                    </div>
                                </div>

                                <div class="grid grid-cols-3 gap-2">
                                    <Button class="cursor-pointer w-full" size="sm" variant="outline"
                                        @click="startEdit(row.category)">Edit</Button>
                                    <Button class="cursor-pointer w-full" size="sm" variant="outline"
                                        @click="loadDescendants(row.category)">Descendants</Button>
                                    <Button class="cursor-pointer w-full" size="sm" variant="destructive"
                                        @click="openDeleteDialog(row.category)">Delete</Button>
                                </div>
                            </div>

                            <p v-if="!filteredCategories.length" class="py-4 text-center text-muted-foreground">No
                                categories found.</p>
                        </div>

                        <div class="hidden overflow-x-auto md:block">
                            <table class="w-full border-collapse text-sm">
                                <thead>
                                    <tr class="border-b text-left">
                                        <th class="py-2">Name</th>
                                        <th class="py-2">Slug</th>
                                        <th class="py-2">Parent</th>
                                        <th class="py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in filteredCategories" :key="row.category.id"
                                        class="border-b align-top">
                                        <td class="py-2 font-medium">
                                            <span :style="{ paddingLeft: `${row.depth * 16}px` }" class="inline-block">
                                                <span v-if="row.depth" class="mr-1 text-muted-foreground">-</span>
                                                {{ row.category.name }}
                                            </span>
                                        </td>
                                        <td class="py-2 text-muted-foreground">{{ row.category.slug }}</td>
                                        <td class="py-2">{{ getParentName(row.category.parentId) }}</td>
                                        <td class="py-2">
                                            <div class="flex flex-wrap gap-2">
                                                <Button class="cursor-pointer" size="sm" variant="outline"
                                                    @click="startEdit(row.category)">Edit</Button>
                                                <Button class="cursor-pointer" size="sm" variant="outline"
                                                    @click="loadDescendants(row.category)">Descendants</Button>
                                                <Button class="cursor-pointer" size="sm" variant="destructive"
                                                    @click="openDeleteDialog(row.category)">Delete</Button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr v-if="!filteredCategories.length">
                                        <td colspan="4" class="py-4 text-center text-muted-foreground">No categories
                                            found.
                                        </td>
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
                                    :disabled="!categoriesPagination.hasNext || isCategoriesLoading"
                                    @click="goToNextPage">
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>

        <div v-if="isDescendantsDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            @click.self="closeDescendantsDialog">
            <div role="dialog" aria-modal="true" aria-labelledby="descendants-title"
                class="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
                <h3 id="descendants-title" class="text-lg font-semibold">
                    Descendants of {{ descendantsDialogCategory?.name }}
                </h3>

                <div class="mt-3">
                    <p v-if="isDescendantsLoading" class="text-sm text-muted-foreground">Loading descendants...</p>

                    <ul v-else-if="descendantsTreeRows.length" class="space-y-1 text-sm">
                        <li v-for="row in descendantsTreeRows" :key="row.id">
                            <div class="flex items-center gap-2" :style="{ paddingLeft: `${row.depth * 20}px` }">
                                <Icon :name="row.hasChildren ? 'lucide:folder-open' : 'lucide:file'"
                                    class="size-4 text-muted-foreground" />
                                <span :class="row.depth === 0 ? 'font-semibold' : ''">{{ row.name }}</span>
                            </div>
                        </li>
                    </ul>

                    <p v-else class="text-sm text-muted-foreground">No descendants found for this category.</p>
                </div>

                <div class="mt-6 flex justify-end">
                    <Button class="cursor-pointer" variant="outline" @click="closeDescendantsDialog">Close</Button>
                </div>
            </div>
        </div>

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
