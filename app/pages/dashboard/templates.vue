<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { CreateTemplateRequest, TemplateResponse } from "~/types/admin";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { templateService } from "~/services/template.service";
import { useAdminDataStore } from "~/stores/adminData.store";
import { templateSchema } from "~/validations/admin.schema";

definePageMeta({
  layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const adminDataStore = useAdminDataStore();
const { templates, isTemplatesLoading, templatesLoaded, templatesPagination } =
  storeToRefs(adminDataStore);

const isSubmitting = ref(false);
const isDeleting = ref(false);
const editingTemplateId = ref<number | null>(null);
const editFormRef = ref<HTMLElement | null>(null);
const isDeleteDialogOpen = ref(false);
const templatePendingDelete = ref<TemplateResponse | null>(null);
const isInitialLoading = computed(() => {
  return isTemplatesLoading.value && !templatesLoaded.value;
});

const pageSummary = computed(() => {
  if (!templatesPagination.value.totalElements) {
    return "No templates";
  }

  const start =
    templatesPagination.value.page * templatesPagination.value.size + 1;
  const end = start + templatesPagination.value.numberOfElements - 1;
  return `Showing ${start}-${end} of ${templatesPagination.value.totalElements}`;
});

const form = reactive<CreateTemplateRequest>({
  templateName: "",
  previewImageUrl: "",
});

const resetForm = () => {
  form.templateName = "";
  form.previewImageUrl = "";
  editingTemplateId.value = null;
};

const parseFormToPayload = () => {
  const parsed = templateSchema.safeParse(form);
  if (!parsed.success) {
    toast.error({
      message: parsed.error.issues[0]?.message || "Invalid template data",
    });

    return null;
  }

  return parsed.data;
};

const loadTemplates = async (
  page = templatesPagination.value.page,
  force = false,
) => {
  const size =
    templatesPagination.value.size > 1
      ? templatesPagination.value.size
      : DEFAULT_PAGE_SIZE;

  try {
    await adminDataStore.ensureTemplates({
      force,
      page,
      size,
    });
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  }
};

const submitTemplate = async () => {
  const payload = parseFormToPayload();
  if (!payload) {
    return;
  }

  isSubmitting.value = true;
  try {
    if (editingTemplateId.value) {
      await templateService.patch(editingTemplateId.value, {
        templateName: payload.templateName,
        previewImageUrl: payload.previewImageUrl,
      });
      toast.success({ message: "Template updated successfully" });
    } else {
      await templateService.create(payload);
      toast.success({ message: "Template created successfully" });
    }

    await loadTemplates(templatesPagination.value.page, true);
    resetForm();
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  } finally {
    isSubmitting.value = false;
  }
};

const startEditing = async (template: TemplateResponse) => {
  editingTemplateId.value = template.id;
  form.templateName = template.templateName;
  form.previewImageUrl = template.previewImageUrl;

  if (window.matchMedia("(max-width: 767px)").matches) {
    await nextTick();
    editFormRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const openDeleteDialog = (template: TemplateResponse) => {
  templatePendingDelete.value = template;
  isDeleteDialogOpen.value = true;
};

const closeDeleteDialog = () => {
  isDeleteDialogOpen.value = false;
  templatePendingDelete.value = null;
};

const confirmDeleteTemplate = async () => {
  if (!templatePendingDelete.value) {
    return;
  }

  isDeleting.value = true;
  try {
    const deletingId = templatePendingDelete.value.id;
    await templateService.remove(deletingId);

    if (editingTemplateId.value === deletingId) {
      resetForm();
    }

    const shouldGoPreviousPage =
      templatesPagination.value.page > 0 && templates.value.length === 1;
    const nextPage = shouldGoPreviousPage
      ? templatesPagination.value.page - 1
      : templatesPagination.value.page;

    await loadTemplates(nextPage, true);
    toast.success({ message: "Template deleted" });
    closeDeleteDialog();
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  } finally {
    isDeleting.value = false;
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

onMounted(async () => {
  await loadTemplates(
    templatesLoaded.value ? templatesPagination.value.page : 0,
  );
});
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Manage Templates</h1>
        <p class="text-sm text-muted-foreground">
          Create, view, update, and remove templates in one place.
        </p>
      </div>
      <Button
        class="cursor-pointer"
        type="button"
        variant="outline"
        @click="resetForm"
        >Reset Form</Button
      >
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div ref="editFormRef">
        <Card class="lg:col-span-1 px-6">
          <div class="space-y-4">
            <h2 class="text-lg font-medium">
              {{ editingTemplateId ? "Edit Template" : "Create Template" }}
            </h2>

            <div class="space-y-2">
              <Label for="template-name">Template Name</Label>
              <Input
                id="template-name"
                v-model="form.templateName"
                placeholder="Summer Hero Banner"
              />
            </div>

            <div class="space-y-2">
              <Label for="template-preview">Preview Image URL</Label>
              <Input
                id="template-preview"
                v-model="form.previewImageUrl"
                placeholder="https://example.com/preview.png"
              />
            </div>

            <Button
              class="w-full cursor-pointer"
              :disabled="isSubmitting"
              @click="submitTemplate"
            >
              {{
                isSubmitting
                  ? "Saving..."
                  : editingTemplateId
                    ? "Update Template"
                    : "Create Template"
              }}
            </Button>
          </div>
        </Card>
      </div>

      <Card class="lg:col-span-2 px-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium">Template List</h2>
          </div>

          <div v-if="isInitialLoading" class="text-sm text-muted-foreground">
            Loading templates...
          </div>

          <div v-else>
            <div class="space-y-3 md:hidden">
              <div
                v-for="template in templates"
                :key="`mobile-${template.id}`"
                class="rounded-lg border p-3 space-y-3"
              >
                <div>
                  <p class="text-xs text-muted-foreground">Name</p>
                  <p class="font-medium">{{ template.templateName }}</p>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-xs text-muted-foreground">Preview</p>
                    <a
                      :href="template.previewImageUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-brand hover:underline"
                    >
                      View preview
                    </a>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Created</p>
                    <p>{{ new Date(template.createdAt).toLocaleString() }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <Button
                    class="cursor-pointer w-full"
                    size="sm"
                    variant="outline"
                    :disabled="isSubmitting || isDeleting"
                    @click="startEditing(template as TemplateResponse)"
                  >
                    Edit
                  </Button>
                  <Button
                    class="cursor-pointer w-full"
                    size="sm"
                    variant="destructive"
                    :disabled="isSubmitting || isDeleting"
                    @click="openDeleteDialog(template as TemplateResponse)"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <p
                v-if="!templates.length"
                class="py-4 text-center text-muted-foreground"
              >
                No templates yet.
              </p>
            </div>

            <div class="hidden overflow-x-auto md:block">
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border-b text-left">
                    <th class="py-2">Name</th>
                    <th class="py-2">Preview</th>
                    <th class="py-2">Created</th>
                    <th class="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="template in templates"
                    :key="template.id"
                    class="border-b"
                  >
                    <td class="py-2">{{ template.templateName }}</td>
                    <td class="py-2">
                      <a
                        :href="template.previewImageUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-brand hover:underline"
                      >
                        View preview
                      </a>
                    </td>
                    <td class="py-2">
                      {{ new Date(template.createdAt).toLocaleString() }}
                    </td>
                    <td class="py-2">
                      <div class="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          class="cursor-pointer"
                          :disabled="isSubmitting || isDeleting"
                          @click="startEditing(template as TemplateResponse)"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          class="cursor-pointer"
                          :disabled="isSubmitting || isDeleting"
                          @click="
                            openDeleteDialog(template as TemplateResponse)
                          "
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!templates.length">
                    <td
                      colspan="4"
                      class="py-4 text-center text-muted-foreground"
                    >
                      No templates yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
              <div class="flex items-center gap-2">
                <Button
                  class="cursor-pointer"
                  size="sm"
                  variant="outline"
                  :disabled="
                    !templatesPagination.hasPrevious || isTemplatesLoading
                  "
                  @click="goToPreviousPage"
                >
                  Previous
                </Button>
                <p class="text-xs text-muted-foreground">
                  Page {{ templatesPagination.page + 1 }} of
                  {{ Math.max(templatesPagination.totalPages, 1) }}
                </p>
                <Button
                  class="cursor-pointer"
                  size="sm"
                  variant="outline"
                  :disabled="!templatesPagination.hasNext || isTemplatesLoading"
                  @click="goToNextPage"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <div
      v-if="isDeleteDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="closeDeleteDialog"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-template-title"
        class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
      >
        <h3 id="delete-template-title" class="text-lg font-semibold">
          Delete template?
        </h3>
        <p class="mt-2 text-sm text-muted-foreground">
          This will permanently delete
          <span class="font-medium text-foreground">{{
            templatePendingDelete?.templateName
          }}</span
          >. This action cannot be undone.
        </p>

        <div class="mt-6 flex justify-end gap-2">
          <Button
            class="cursor-pointer"
            variant="outline"
            :disabled="isDeleting"
            @click="closeDeleteDialog"
          >
            Cancel
          </Button>
          <Button
            class="cursor-pointer"
            variant="destructive"
            :disabled="isDeleting"
            @click="confirmDeleteTemplate"
          >
            {{ isDeleting ? "Deleting..." : "Delete" }}
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
