<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { CreateTemplateRequest } from "~/types/admin";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { templateService } from "~/services/template.service";
import { useAdminContextStore } from "~/stores/adminContext.store";
import { useAdminDataStore } from "~/stores/adminData.store";
import { templateSchema } from "~/validations/admin.schema";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const contextStore = useAdminContextStore();
const adminDataStore = useAdminDataStore();
const {
    templates,
    tenants,
    isTemplatesLoading,
    templatesLoaded,
    templatesPagination,
} = storeToRefs(adminDataStore);

const selectedTenantId = computed({
    get: () => contextStore.selectedTenantId,
    set: (value: string) => contextStore.setSelectedTenantId(value),
});

const isSubmitting = ref(false);
const isInitialLoading = computed(() => {
    if (!selectedTenantId.value) {
        return false;
    }

    return isTemplatesLoading.value && !templatesLoaded.value;
});

const pageSummary = computed(() => {
    if (!templatesPagination.value.totalElements) {
        return "No templates";
    }

    const start = templatesPagination.value.page * templatesPagination.value.size + 1;
    const end = start + templatesPagination.value.numberOfElements - 1;
    return `Showing ${start}-${end} of ${templatesPagination.value.totalElements}`;
});

const form = reactive<CreateTemplateRequest>({
    templateName: "",
    previewImageUrl: "",
});

const loadTenantOptions = async () => {
    try {
        await adminDataStore.ensureTenants({ page: 0, size: 10 });
    } catch {
        // Tenant load failure is non-blocking for initial render.
    }
};

const loadTemplates = async (page = templatesPagination.value.page, force = false) => {
    if (!selectedTenantId.value) {
        adminDataStore.invalidateTemplates();
        return;
    }

    const size = templatesPagination.value.size > 1
        ? templatesPagination.value.size
        : DEFAULT_PAGE_SIZE;

    try {
        await adminDataStore.ensureTemplates({
            force,
            page,
            size,
            tenantId: selectedTenantId.value,
        });
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    }
};

const submitTemplate = async () => {
    if (!selectedTenantId.value) {
        toast.error({ message: "Please select a tenant first" });
        return;
    }

    const parsed = templateSchema.safeParse(form);
    if (!parsed.success) {
        toast.error({ message: parsed.error.issues[0]?.message || "Invalid template data" });
        return;
    }

    isSubmitting.value = true;
    try {
        await templateService.create(parsed.data, selectedTenantId.value);
        await loadTemplates(templatesPagination.value.page, true);

        toast.success({ message: "Template created successfully" });

        form.templateName = "";
        form.previewImageUrl = "";
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isSubmitting.value = false;
    }
};

const goToPreviousPage = async () => {
    if (!templatesPagination.value.hasPrevious || isTemplatesLoading.value) {
        return;
    }

    await loadTemplates(templatesPagination.value.page - 1);
};

const goToNextPage = async () => {
    if (!templatesPagination.value.hasNext || isTemplatesLoading.value) {
        return;
    }

    await loadTemplates(templatesPagination.value.page + 1);
};

watch(
    () => selectedTenantId.value,
    async (tenantId, previousTenantId) => {
        if (tenantId === previousTenantId) {
            return;
        }

        await loadTemplates(0, true);
    },
);

onMounted(async () => {
    await loadTenantOptions();
    await loadTemplates(templatesLoaded.value ? templatesPagination.value.page : 0);
});
</script>

<template>
    <section class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold">Manage Templates</h1>
            <p class="text-sm text-muted-foreground">
                create and manage templates for the selected tenant.
            </p>
        </div>

        <Card class="px-6 py-4">
            <div class="space-y-2">
                <Label for="template-tenant">Tenant</Label>
                <select id="template-tenant" v-model="selectedTenantId"
                    class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Select tenant</option>
                    <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.tenantId || ''">
                        {{ tenant.fullName || `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() ||
                        tenant.email }}
                        ({{ tenant.tenantId || "No tenant id" }})
                    </option>
                </select>
                <p v-if="!selectedTenantId" class="text-xs text-amber-600">
                    Select a tenant to load and create templates.
                </p>
            </div>
        </Card>

        <div class="grid gap-4 lg:grid-cols-3">
            <Card class="lg:col-span-1 px-6">
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">Create Template</h2>

                    <div class="space-y-2">
                        <Label for="template-name">Template Name</Label>
                        <Input id="template-name" v-model="form.templateName" placeholder="Summer Hero Banner" />
                    </div>

                    <div class="space-y-2">
                        <Label for="template-preview">Preview Image URL</Label>
                        <Input id="template-preview" v-model="form.previewImageUrl"
                            placeholder="https://example.com/preview.png" />
                    </div>

                    <Button class="w-full cursor-pointer" :disabled="isSubmitting || !selectedTenantId"
                        @click="submitTemplate">
                        {{ isSubmitting ? "Creating..." : "Create Template" }}
                    </Button>
                </div>
            </Card>

            <Card class="lg:col-span-2 px-6">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-medium">Template List</h2>
                    </div>

                    <div v-if="!selectedTenantId" class="text-sm text-muted-foreground">
                        Select a tenant to view templates.
                    </div>

                    <div v-else-if="isInitialLoading" class="text-sm text-muted-foreground">
                        Loading templates...
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full border-collapse text-sm">
                            <thead>
                                <tr class="border-b text-left">
                                    <th class="py-2">Name</th>
                                    <th class="py-2">Preview</th>
                                    <th class="py-2">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="template in templates" :key="template.id" class="border-b">
                                    <td class="py-2">{{ template.templateName }}</td>
                                    <td class="py-2">
                                        <a :href="template.previewImageUrl" target="_blank" rel="noopener noreferrer"
                                            class="text-brand hover:underline">
                                            View preview
                                        </a>
                                    </td>
                                    <td class="py-2">{{ new Date(template.createdAt).toLocaleString() }}</td>
                                </tr>
                                <tr v-if="!templates.length">
                                    <td colspan="3" class="py-4 text-center text-muted-foreground">
                                        No templates yet.
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
                            <div class="flex items-center gap-2">
                                <Button class="cursor-pointer" size="sm" variant="outline"
                                    :disabled="!templatesPagination.hasPrevious || isTemplatesLoading"
                                    @click="goToPreviousPage">
                                    Previous
                                </Button>
                                <p class="text-xs text-muted-foreground">
                                    Page {{ templatesPagination.page + 1 }} of
                                    {{ Math.max(templatesPagination.totalPages, 1) }}
                                </p>
                                <Button class="cursor-pointer" size="sm" variant="outline"
                                    :disabled="!templatesPagination.hasNext || isTemplatesLoading"
                                    @click="goToNextPage">
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    </section>
</template>