<script setup lang="ts">
import type { CategoryResponse, CreateCategoryRequest } from "~/types/admin";
import { categoryService } from "~/services/category.service";
import { useAdminContextStore } from "~/stores/adminContext.store";
import { categorySchema } from "~/validations/admin.schema";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const contextStore = useAdminContextStore();

const categories = ref<CategoryResponse[]>([]);
const descendants = ref<number[]>([]);
const selectedCategory = ref<CategoryResponse | null>(null);
const isLoading = ref(true);
const isSubmitting = ref(false);
const isDeleting = ref(false);
const editingCategoryId = ref<number | null>(null);
const isDeleteDialogOpen = ref(false);
const categoryPendingDelete = ref<CategoryResponse | null>(null);

const form = reactive({
    name: "",
    slug: "",
    description: "",
    parentId: "",
});

const searchQuery = computed({
    get: () => contextStore.categorySearchQuery,
    set: (value: string) => contextStore.setCategorySearchQuery(value),
});

const filteredCategories = computed(() => {
    if (!searchQuery.value) {
        return categories.value;
    }

    const q = searchQuery.value.toLowerCase();
    return categories.value.filter(
        (category) =>
            category.name.toLowerCase().includes(q) ||
            category.slug.toLowerCase().includes(q),
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

const loadCategories = async () => {
    isLoading.value = true;
    try {
        categories.value = await categoryService.getAll();
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isLoading.value = false;
    }
};

const startEdit = (category: CategoryResponse) => {
    editingCategoryId.value = category.id;
    form.name = category.name;
    form.slug = category.slug;
    form.description = category.description || "";
    form.parentId = category.parentId ? String(category.parentId) : "";
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
            toast.success({ message: "Category updated successfully" });
        } else {
            await categoryService.create(payload);
            toast.success({ message: "Category created successfully" });
        }

        await loadCategories();
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

const confirmDeleteCategory = async () => {
    if (!categoryPendingDelete.value) {
        return;
    }

    isDeleting.value = true;

    try {
        const deletingId = categoryPendingDelete.value.id;
        await categoryService.remove(deletingId);
        categories.value = categories.value.filter((item) => item.id !== deletingId);
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
    try {
        descendants.value = await categoryService.getDescendantIds(category.id);
        selectedCategory.value = category;
        contextStore.setSelectedCategoryId(category.id);
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    }
};

onMounted(() => {
    loadCategories();
});
</script>

<template>
    <section class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold">Categories Management</h1>
                <p class="text-sm text-muted-foreground">
                    Manage all categories and their descendants in one place.
                </p>
            </div>
            <Button class="cursor-pointer" type="button" variant="outline" @click="resetForm">Reset Form</Button>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
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
                        <Label for="category-parent">Parent ID (optional)</Label>
                        <Input id="category-parent" v-model="form.parentId" placeholder="12" />
                    </div>

                    <div class="space-y-2">
                        <Label for="category-description">Description</Label>
                        <Textarea id="category-description" v-model="form.description" placeholder="Category details" />
                    </div>

                    <Button class="w-full cursor-pointer" :disabled="isSubmitting" @click="submitCategory">
                        {{ isSubmitting ? "Saving..." : editingCategoryId ? "Update Category" : "Create Category" }}
                    </Button>
                </div>
            </Card>

            <Card class="lg:col-span-2 px-6">
                <div class="space-y-4">
                    <div class="flex items-center justify-between gap-3">
                        <h2 class="text-lg font-medium">Category List</h2>
                        <Input v-model="searchQuery" placeholder="Search by name or slug" class="max-w-sm" />
                    </div>

                    <div v-if="isLoading" class="text-sm text-muted-foreground">Loading categories...</div>

                    <div v-else class="overflow-x-auto">
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
                                <tr v-for="category in filteredCategories" :key="category.id"
                                    class="border-b align-top">
                                    <td class="py-2 font-medium">{{ category.name }}</td>
                                    <td class="py-2 text-muted-foreground">{{ category.slug }}</td>
                                    <td class="py-2">{{ category.parentId ?? "-" }}</td>
                                    <td class="py-2">
                                        <div class="flex flex-wrap gap-2">
                                            <Button class="cursor-pointer" size="sm" variant="outline"
                                                @click="startEdit(category)">Edit</Button>
                                            <Button class="cursor-pointer" size="sm" variant="outline"
                                                @click="loadDescendants(category)">Descendants</Button>
                                            <Button class="cursor-pointer" size="sm" variant="destructive"
                                                @click="openDeleteDialog(category)">Delete</Button>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="!filteredCategories.length">
                                    <td colspan="4" class="py-4 text-center text-muted-foreground">No categories found.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>

        <Card class="px-6" v-if="selectedCategory">
            <div class="space-y-3">
                <h2 class="text-lg font-medium">Descendants for {{ selectedCategory.name }}</h2>
                <div class="flex flex-wrap gap-2">
                    <Badge v-for="descendantId in descendants" :key="descendantId" variant="outline">
                        ID: {{ descendantId }}
                    </Badge>
                    <p v-if="!descendants.length" class="text-sm text-muted-foreground">
                        No descendants returned for this category.
                    </p>
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
                    <Button class="cursor-pointer" variant="outline" :disabled="isDeleting" @click="closeDeleteDialog">Cancel</Button>
                    <Button class="cursor-pointer" variant="destructive" :disabled="isDeleting" @click="confirmDeleteCategory">
                        {{ isDeleting ? "Deleting..." : "Delete" }}
                    </Button>
                </div>
            </div>
        </div>
    </section>
</template>
