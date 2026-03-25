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
const isLoading = ref(false);
const isSubmitting = ref(false);
const editingCategoryId = ref<number | null>(null);

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

const deleteCategory = async (category: CategoryResponse) => {
    const confirmed = confirm(`Delete category \"${category.name}\"?`);
    if (!confirmed) {
        return;
    }

    try {
        await categoryService.remove(category.id);
        categories.value = categories.value.filter((item) => item.id !== category.id);
        toast.success({ message: "Category deleted" });

        if (selectedCategory.value?.id === category.id) {
            selectedCategory.value = null;
            descendants.value = [];
            contextStore.setSelectedCategoryId(null);
        }
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
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

await loadCategories();
</script>

<template>
    <section class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold">Categories Management</h1>
                <p class="text-sm text-muted-foreground">
                    Full CRUD + descendants lookup powered by current API contracts.
                </p>
            </div>
            <Button type="button" variant="outline" @click="resetForm">Reset Form</Button>
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

                    <Button class="w-full" :disabled="isSubmitting" @click="submitCategory">
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
                                            <Button size="sm" variant="outline"
                                                @click="startEdit(category)">Edit</Button>
                                            <Button size="sm" variant="outline"
                                                @click="loadDescendants(category)">Descendants</Button>
                                            <Button size="sm" variant="destructive"
                                                @click="deleteCategory(category)">Delete</Button>
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
    </section>
</template>
