<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { useAdminManagement } from "~/features/admin/composables/useAdminManagement";
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

const goToCreateAdmin = async () => {
  await router.push("/dashboard/admin/create");
};

const submitAdmin = async () => {
  try {
    await createAdmin();
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

const toggleStatus = async (admin: UserResponse) => {
  openActionMenuForId.value = null;
  const nextStatus = !admin.enabled;
  try {
    await updateAdminStatus(admin.id, nextStatus);
    toast.success({ message: `Admin ${nextStatus ? 'enabled' : 'disabled'} successfully` });
    void refreshAdmins({
      page: adminsPagination.value.page,
      size: adminsPagination.value.size,
    });
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
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
    <div v-if="isListMode">
      <h1 class="text-2xl font-semibold mb-2">Admin Management</h1>
      <p class="text-sm text-muted-foreground mb-6">
        View and manage admin accounts that can access the dashboard.
      </p>

      <Card class="w-full px-6 py-4">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3 w-full md:w-auto">
              <Input
                v-model="searchQuery"
                placeholder="Search by email or name"
                class="max-w-sm flex-1 md:flex-none"
              />

              <select
                v-model="statusFilter"
                class="border-input bg-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <Button class="cursor-pointer" @click="goToCreateAdmin">
              <Icon name="lucide:plus" class="size-4" />
              Create Admin
            </Button>
          </div>

          <div v-if="isInitialLoading" class="text-sm text-muted-foreground">
            Loading admins...
          </div>

          <div v-else>
            <div class="space-y-3 md:hidden">
              <div
                v-for="admin in filteredAdmins"
                :key="`mobile-${admin.id}`"
                class="space-y-3 rounded-lg border p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="truncate">
                    <p class="text-xs text-muted-foreground">Email</p>
                    <p class="font-medium truncate">{{ admin.email }}</p>
                  </div>
                  <Badge
                    variant="outline"
                    :class="admin.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'"
                  >
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
                    <Button
                      class="cursor-pointer"
                      size="icon-sm"
                      variant="ghost"
                      @click="toggleActionMenu(admin.id)"
                    >
                      <Icon name="lucide:ellipsis" class="size-4" />
                    </Button>

                    <div
                      v-if="openActionMenuForId === admin.id"
                      class="absolute right-0 bottom-full z-50 mb-2 min-w-44 rounded-md border bg-background p-1 shadow-lg"
                    >
                      <button
                        class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                        @click="toggleStatus(admin)"
                      >
                        {{ admin.enabled ? "Disable User" : "Enable User" }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p
                v-if="!filteredAdmins.length"
                class="py-4 text-center text-muted-foreground"
              >
                No admins found.
              </p>
            </div>

            <div class="hidden overflow-x-auto md:block">
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border-b text-left">
                    <th class="py-2">Email</th>
                    <th class="py-2">Name</th>
                    <th class="py-2">Status</th>
                    <th class="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="admin in filteredAdmins"
                    :key="admin.id"
                    class="border-b align-top"
                  >
                    <td class="py-2 font-medium truncate max-w-xs">{{ admin.email }}</td>
                    <td class="py-2 text-muted-foreground">
                      {{
                        [admin.fullName, admin.firstName, admin.lastName].filter(Boolean)[0] || "-"
                      }}
                    </td>
                    <td class="py-2">
                      <Badge
                        variant="outline"
                        :class="admin.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'"
                      >
                        {{ admin.enabled ? "Active" : "Inactive" }}
                      </Badge>
                    </td>
                    <td class="py-2 text-right">
                      <div class="relative inline-block" data-action-menu>
                        <Button
                          class="cursor-pointer"
                          size="icon-sm"
                          variant="ghost"
                          @click="toggleActionMenu(admin.id)"
                        >
                          <Icon name="lucide:ellipsis" class="size-4" />
                        </Button>

                        <div
                          v-if="openActionMenuForId === admin.id"
                          class="absolute right-full top-6 z-50 mb-2 min-w-44 rounded-md border bg-background p-1 shadow-lg text-left"
                        >
                          <button
                            class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                            @click="toggleStatus(admin)"
                          >
                            {{ admin.enabled ? "Disable User" : "Enable User" }}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!filteredAdmins.length">
                    <td
                      colspan="4"
                      class="py-4 text-center text-muted-foreground"
                    >
                      No admins found.
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
                  :disabled="!adminsPagination.hasPrevious || isAdminsLoading"
                  @click="goToPreviousPage"
                >
                  Previous
                </Button>
                <p class="text-xs text-muted-foreground">
                  Page {{ adminsPagination.page + 1 }} of
                  {{ Math.max(adminsPagination.totalPages, 1) }}
                </p>
                <Button
                  class="cursor-pointer"
                  size="sm"
                  variant="outline"
                  :disabled="!adminsPagination.hasNext || isAdminsLoading"
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

    <Card v-if="!isListMode" class="w-full px-6">
      <div class="space-y-4">
        <div>
          <h2 class="text-lg font-medium">Create Admin</h2>
          <p class="text-sm text-muted-foreground">
            Create an admin account that can access the dashboard.
          </p>
        </div>

        <div class="space-y-2">
          <Label for="bootstrap-email">Email</Label>
          <Input id="bootstrap-email" v-model="form.email" placeholder="admin@company.com" />
        </div>

        <div class="space-y-2">
          <Label for="bootstrap-password">Password</Label>
          <Input id="bootstrap-password" v-model="form.password" type="password"
            placeholder="At least 8 chars" />
        </div>

        <div class="flex items-center gap-2">
          <Button
            class="cursor-pointer"
            variant="outline"
            @click="router.push('/dashboard/admin')"
          >
            Cancel
          </Button>
          <Button
            class="cursor-pointer"
            :disabled="isSubmitting"
            @click="submitAdmin"
          >
            {{ isSubmitting ? "Creating..." : "Create Admin" }}
          </Button>
        </div>
      </div>
    </Card>
  </section>
</template>
