<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { useAdminManagement } from "~/features/admin/composables/useAdminManagement";
import { createAdminSchema } from "~/features/admin/schemas/admin.schema";
import AdminListSkeleton from "~/features/admin/components/AdminListSkeleton.vue";
import type { UserResponse } from "~/features/admin/types/admin.types";

interface AdminManagementViewProps {
  mode?: "list" | "create";
}

const props = withDefaults(defineProps<AdminManagementViewProps>(), {
  mode: "list",
});

const router = useRouter();
const route = useRoute();
const toast = useToast();
const { getMessageFromUnknown } = useApiError();

const {
  admins,
  isAdminsLoading,
  adminsLoaded,
  adminsPagination,
  loadAdmins,
  refreshAdmins,
  updateAdminStatus,
  form,
  isSubmitting,
  createAdmin,
} = useAdminManagement();

const currentPath = computed(() => route.path.replace(/\/$/, ""));
const isListMode = computed(
  () => props.mode === "list" || currentPath.value === "/dashboard/admin",
);
const isCreateMode = computed(
  () => props.mode === "create" || currentPath.value.endsWith("/create"),
);

const searchQuery = ref("");
const statusFilter = ref<"all" | "active" | "inactive">("all");
const openActionMenuForId = ref<string | null>(null);
const createSubmitAttempted = ref(false);

const getUserId = (admin: UserResponse) => admin.userId ?? admin.id;

const createFormErrors = computed(() => {
  const parsed = createAdminSchema.safeParse(form);

  if (parsed.success) {
    return {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      password: "",
    };
  }

  const fieldErrors = parsed.error.flatten().fieldErrors;
  return {
    firstName: fieldErrors.firstName?.[0] ?? "",
    lastName: fieldErrors.lastName?.[0] ?? "",
    phoneNumber: fieldErrors.phoneNumber?.[0] ?? "",
    email: fieldErrors.email?.[0] ?? "",
    password: fieldErrors.password?.[0] ?? "",
  };
});

const hasCreateFormErrors = computed(() =>
  Boolean(
    createFormErrors.value.firstName ||
    createFormErrors.value.lastName ||
    createFormErrors.value.phoneNumber ||
    createFormErrors.value.email ||
    createFormErrors.value.password,
  ),
);

const filteredAdmins = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();

  return admins.value.filter((admin) => {
    const isActive = admin.enabled;
    const profileStatus = isActive ? "active" : "inactive";
    const matchesStatus =
      statusFilter.value === "all" || profileStatus === statusFilter.value;

    if (!matchesStatus) {
      return false;
    }

    if (!q) {
      return true;
    }

    const name = [admin.firstName, admin.lastName, admin.fullName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return admin.email.toLowerCase().includes(q) || name.includes(q);
  });
});

const isInitialLoading = computed(
  () => isAdminsLoading.value && !adminsLoaded.value,
);

const pageSummary = computed(() => {
  if (!adminsPagination.value.totalElements) {
    return "No admins";
  }

  const start = adminsPagination.value.page * adminsPagination.value.size + 1;
  const end = start + adminsPagination.value.numberOfElements - 1;
  return `Showing ${start}-${end} of ${adminsPagination.value.totalElements}`;
});

const loadAdminPage = async (page = 0, force = false) => {
  try {
    await loadAdmins({
      force,
      page,
      size:
        adminsPagination.value.size > 1
          ? adminsPagination.value.size
          : DEFAULT_PAGE_SIZE,
    });
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  }
};

const debouncedReload = useDebounceFn(() => {
  if (!isListMode.value) {
    return;
  }

  void loadAdminPage(0, true);
}, 250);

watch(searchQuery, () => {
  debouncedReload();
});

watch(admins, (list) => {
  if (!openActionMenuForId.value) {
    return;
  }

  const hasMatchingRow = list.some((admin) => admin.id === openActionMenuForId.value);
  if (!hasMatchingRow) {
    openActionMenuForId.value = null;
  }
});

watch(statusFilter, () => {
  closeActionMenu();
});

watch(searchQuery, () => {
  closeActionMenu();
});

const goToCreateAdmin = async () => {
  await router.push("/dashboard/admin/create");
};

const submitAdmin = async () => {
  createSubmitAttempted.value = true;

  if (hasCreateFormErrors.value) {
    toast.error({ message: "Please fix the create admin form errors" });
    return;
  }

  try {
    await createAdmin();
    createSubmitAttempted.value = false;
    toast.success({ message: "Admin account created successfully" });
    await router.push("/dashboard/admin");
  } catch (error) {
    const message = getMessageFromUnknown(error);
    toast.error({ message });
  }
};

const toggleActionMenu = (adminId: string) => {
  openActionMenuForId.value =
    openActionMenuForId.value === adminId ? null : adminId;
};

const isStatusDialogOpen = ref(false);
const adminPendingStatusUpdate = ref<UserResponse | null>(null);
const pendingEnabled = ref<boolean | null>(null);
const isStatusSubmitting = ref(false);

const openStatusDialog = (admin: UserResponse) => {
  openActionMenuForId.value = null;
  adminPendingStatusUpdate.value = admin;
  // target enabled state is the inverse of current enabled
  pendingEnabled.value = !admin.enabled;
  isStatusDialogOpen.value = true;
};

const closeStatusDialog = () => {
  isStatusDialogOpen.value = false;
  adminPendingStatusUpdate.value = null;
  pendingEnabled.value = null;
};

const confirmStatusUpdate = async () => {
  if (!adminPendingStatusUpdate.value || pendingEnabled.value === null) return;
  isStatusSubmitting.value = true;
  try {
    await updateAdminStatus(getUserId(adminPendingStatusUpdate.value), pendingEnabled.value);
    toast.success({ message: `Admin ${pendingEnabled.value ? 'enabled' : 'disabled'} successfully` });
    void refreshAdmins({ page: adminsPagination.value.page, size: adminsPagination.value.size });
    closeStatusDialog();
    closeActionMenu();
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  } finally {
    isStatusSubmitting.value = false;
  }
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

const goToPreviousPage = async () => {
  if (!adminsPagination.value.hasPrevious || isAdminsLoading.value) {
    return;
  }

  await loadAdminPage(adminsPagination.value.page - 1);
};

const goToNextPage = async () => {
  if (!adminsPagination.value.hasNext || isAdminsLoading.value) {
    return;
  }

  await loadAdminPage(adminsPagination.value.page + 1);
};

onMounted(async () => {
  document.addEventListener("click", handleDocumentClick, true);

  if (isListMode.value) {
    await loadAdminPage(0, true);
    return;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick, true);
});
</script>

<template>
  <section class="space-y-6">
    <div v-if="openActionMenuForId" class="fixed inset-0 z-40 bg-transparent" @click="closeActionMenu" />

    <div v-if="isListMode">


      <Card class="w-full px-6">
        <div class="space-y-4">
          <div class="rounded-2xl bg-card p-4 text-card-foreground shadow-sm transition-colors duration-300">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div class="flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                  <Input v-model="searchQuery" placeholder="Search by email or name" class="max-w-sm bg-transparent" />
                </div>

                <select v-model="statusFilter"
                  class="border-input bg-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover" @click="goToCreateAdmin">
                <Icon name="lucide:plus" class="size-4" />
                Create Admin
              </Button>
            </div>
          </div>

          <AdminListSkeleton v-if="isInitialLoading" />

          <div v-else>
            <div class="space-y-3 md:hidden">
              <div v-for="admin in filteredAdmins" :key="`mobile-${admin.id}`" class="space-y-3 rounded-lg border p-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="truncate">
                    <p class="text-xs text-muted-foreground">Email</p>
                    <p class="font-medium truncate">{{ admin.email }}</p>
                  </div>
                  <Badge variant="outline"
                    :class="admin.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'">
                    {{ admin.enabled ? "Active" : "Inactive" }}
                  </Badge>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-xs text-muted-foreground">Name</p>
                    <p>
                      {{
                        [admin.fullName, admin.firstName, admin.lastName].filter(Boolean)[0] || "-"
                      }}
                    </p>
                  </div>
                </div>

                <div class="flex justify-end">
                  <div class="relative" data-action-menu>
                    <Button class="cursor-pointer" size="icon-sm" variant="ghost"
                      @click.stop="toggleActionMenu(admin.id)">
                      <Icon name="lucide:ellipsis" class="size-4" />
                    </Button>

                    <div v-if="openActionMenuForId === admin.id"
                      class="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-md border bg-background p-1 shadow-lg"
                      @click.stop>
                      <button class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                        @click="openStatusDialog(admin)">
                        {{ admin.enabled ? "Disable User" : "Enable User" }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p v-if="!filteredAdmins.length" class="py-4 text-center text-muted-foreground">
                No admins found.
              </p>
            </div>

            <div class="hidden overflow-x-auto md:block">
              <table
                class="w-full overflow-hidden rounded-lg border-collapse bg-card text-sm text-card-foreground shadow-sm transition-colors duration-300">
                <thead class="bg-muted/20">
                  <tr class="text-left">
                    <th class="px-4 py-3 text-sm text-muted-foreground">Email</th>
                    <th class="px-4 py-3 text-sm text-muted-foreground">Name</th>
                    <th class="px-4 py-3 text-sm text-muted-foreground">Status</th>
                    <th class="px-4 py-3 text-right text-sm text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="admin in filteredAdmins" :key="admin.id"
                    class="border-b align-top transition-colors hover:bg-muted/10">
                    <td class="max-w-xs px-4 py-4 truncate font-medium">{{ admin.email }}</td>
                    <td class="px-4 py-4 text-muted-foreground">
                      {{
                        [admin.fullName, admin.firstName, admin.lastName].filter(Boolean)[0] || "-"
                      }}
                    </td>
                    <td class="px-4 py-4">
                      <Badge variant="outline"
                        :class="admin.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'">
                        {{ admin.enabled ? "Active" : "Inactive" }}
                      </Badge>
                    </td>
                    <td class="px-4 py-4 text-right">
                      <div class="relative inline-block" data-action-menu>
                        <Button class="cursor-pointer" size="icon-sm" variant="ghost"
                          @click.stop="toggleActionMenu(admin.id)">
                          <Icon name="lucide:ellipsis" class="size-4" />
                        </Button>

                        <div v-if="openActionMenuForId === admin.id"
                          class="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-md border bg-background p-1 text-left shadow-lg"
                          @click.stop>
                          <button class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                            @click="openStatusDialog(admin)">
                            {{ admin.enabled ? "Disable User" : "Enable User" }}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!filteredAdmins.length">
                    <td colspan="4" class="py-4 text-center text-muted-foreground">
                      No admins found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
              <div class="flex items-center gap-2">
                <Button class="cursor-pointer" size="sm" variant="outline"
                  :disabled="!adminsPagination.hasPrevious || isAdminsLoading" @click="goToPreviousPage">
                  Previous
                </Button>
                <p class="text-xs text-muted-foreground">
                  Page {{ adminsPagination.page + 1 }} of
                  {{ Math.max(adminsPagination.totalPages, 1) }}
                </p>
                <Button class="cursor-pointer" size="sm" variant="outline"
                  :disabled="!adminsPagination.hasNext || isAdminsLoading" @click="goToNextPage">
                  Next
                </Button>
              </div>
            </div>

            <div v-if="isStatusDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
              @click.self="closeStatusDialog">
              <div role="dialog" aria-modal="true" aria-labelledby="status-admin-title"
                class="w-full max-w-md rounded-lg border border-border/60 bg-card p-6 text-card-foreground shadow-lg transition-colors duration-300">
                <h3 id="status-admin-title" class="text-lg font-semibold">Update admin status</h3>
                <p class="mt-2 text-sm text-muted-foreground">
                  Set <span class="font-medium text-foreground">{{ adminPendingStatusUpdate?.email }}</span>
                  to <span class="font-medium text-foreground">{{ pendingEnabled ? 'Active' : 'Inactive' }}</span>?
                </p>

                <div class="mt-6 flex justify-end gap-2">
                  <Button class="cursor-pointer" variant="outline" :disabled="isStatusSubmitting"
                    @click="closeStatusDialog">Cancel</Button>
                  <Button class="cursor-pointer" :disabled="isStatusSubmitting" variant="destructive"
                    @click="confirmStatusUpdate">
                    {{ isStatusSubmitting ? 'Updating...' : (pendingEnabled ? 'Enable' : 'Disable') }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <Card v-if="!isListMode" class="w-full px-6">
      <div class="space-y-4">
        <div class="rounded-2xl bg-card p-4 text-card-foreground shadow-sm transition-colors duration-300">
          <div class="space-y-1">
            <h2 class="text-2xl font-semibold text-foreground">Create Admin</h2>
            <p class="text-sm text-muted-foreground">
              Create an admin account that can access the dashboard.
            </p>
          </div>
        </div>

        <div
          class="rounded-2xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm transition-colors duration-300">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="bootstrap-first-name">First Name</Label>
              <Input id="bootstrap-first-name" v-model="form.firstName" placeholder="John" />
              <p v-if="createSubmitAttempted && createFormErrors.firstName" class="text-xs text-red-500">
                {{ createFormErrors.firstName }}
              </p>
            </div>

            <div class="space-y-2">
              <Label for="bootstrap-last-name">Last Name</Label>
              <Input id="bootstrap-last-name" v-model="form.lastName" placeholder="Doe" />
              <p v-if="createSubmitAttempted && createFormErrors.lastName" class="text-xs text-red-500">
                {{ createFormErrors.lastName }}
              </p>
            </div>

            <div class="space-y-2">
              <Label for="bootstrap-phone-number">Phone Number</Label>
              <Input id="bootstrap-phone-number" v-model="form.phoneNumber" placeholder="+251 9XX XXX XXX" />
              <p v-if="createSubmitAttempted && createFormErrors.phoneNumber" class="text-xs text-red-500">
                {{ createFormErrors.phoneNumber }}
              </p>
            </div>

            <div class="space-y-2">
              <Label for="bootstrap-email">Email</Label>
              <Input id="bootstrap-email" v-model="form.email" placeholder="admin@company.com" />
              <p v-if="createSubmitAttempted && createFormErrors.email" class="text-xs text-red-500">
                {{ createFormErrors.email }}
              </p>
            </div>

            <div class="space-y-2">
              <Label for="bootstrap-password">Password</Label>
              <Input id="bootstrap-password" v-model="form.password" type="password" placeholder="At least 8 chars" />
              <p v-if="createSubmitAttempted && createFormErrors.password" class="text-xs text-red-500">
                {{ createFormErrors.password }}
              </p>
            </div>

            <div class="flex items-center gap-2 pt-2">
              <Button class="cursor-pointer" variant="outline" @click="router.push('/dashboard/admin')">
                Cancel
              </Button>
              <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover" :disabled="isSubmitting"
                @click="submitAdmin">
                {{ isSubmitting ? "Creating..." : "Create Admin" }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  </section>
</template>
