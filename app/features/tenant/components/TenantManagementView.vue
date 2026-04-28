<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { useTenantManagement } from "~/features/tenant/composables/useTenantManagement";
import TenantListSkeleton from "~/features/tenant/components/TenantListSkeleton.vue";
import type {
  TenantProfileStatus,
  UserResponse,
} from "~/features/tenant/types/tenant.types";
import {
  getStatusBadgeClass,
  getStatusButtonClass,
  getTenantProfileStatusTone,
  getTenantStatusTone,
} from "~/utils/status";

interface TenantManagementViewProps {
  mode?: "list" | "create";
}

const props = withDefaults(defineProps<TenantManagementViewProps>(), {
  mode: "list",
});

const router = useRouter();
const route = useRoute();
const toast = useToast();
const { getMessageFromUnknown } = useApiError();

const {
  tenants,
  isTenantsLoading,
  tenantsLoaded,
  tenantsPagination,
  loadTenants,
  refreshTenants,
  createTenant,
  updateTenantStatus,
} = useTenantManagement();

const form = reactive({
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
});

const currentPath = computed(() => route.path.replace(/\/$/, ""));
const isListMode = computed(
  () => props.mode === "list" || currentPath.value === "/dashboard/tenants",
);
const isCreateMode = computed(
  () => props.mode === "create" || currentPath.value.endsWith("/create"),
);

const searchQuery = ref("");
const statusFilter = ref<"all" | TenantProfileStatus>("all");
const isSubmitting = ref(false);
const openActionMenuForId = ref<string | null>(null);
const isStatusDialogOpen = ref(false);
const tenantPendingStatusUpdate = ref<UserResponse | null>(null);
const selectedStatus = ref<TenantProfileStatus>("IN_REVIEW");

const tenantStatuses: TenantProfileStatus[] = [
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
];

const formatStatusLabel = (value: TenantProfileStatus) => {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
};

const resolveTenantProfileStatus = (
  tenant: UserResponse,
): TenantProfileStatus => {
  return tenant.status ?? (tenant.enabled ? "ACTIVE" : "INACTIVE");
};

const filteredTenants = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();

  return tenants.value.filter((tenant) => {
    const profileStatus = resolveTenantProfileStatus(tenant);
    const matchesStatus =
      statusFilter.value === "all" || profileStatus === statusFilter.value;

    if (!matchesStatus) {
      return false;
    }

    if (!q) {
      return true;
    }

    const name = [tenant.firstName, tenant.lastName, tenant.fullName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return tenant.email.toLowerCase().includes(q) || name.includes(q);
  });
});

const isInitialLoading = computed(
  () => isTenantsLoading.value && !tenantsLoaded.value,
);

const pageSummary = computed(() => {
  if (!tenantsPagination.value.totalElements) {
    return "No tenants";
  }

  const start = tenantsPagination.value.page * tenantsPagination.value.size + 1;
  const end = start + tenantsPagination.value.numberOfElements - 1;
  return `Showing ${start}-${end} of ${tenantsPagination.value.totalElements}`;
});

const loadTenantPage = async (page = 0, force = false) => {
  try {
    await loadTenants({
      force,
      page,
      size:
        tenantsPagination.value.size > 1
          ? tenantsPagination.value.size
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

  void loadTenantPage(0, true);
}, 250);

watch(searchQuery, () => {
  debouncedReload();
});

const resetForm = () => {
  form.email = "";
  form.password = "";
  form.firstName = "";
  form.lastName = "";
  form.phoneNumber = "";
};

const goToCreateTenant = async () => {
  await router.push("/dashboard/tenants/create");
};

const submitTenant = async () => {
  isSubmitting.value = true;
  try {
    await createTenant(form);
    toast.success({ message: "Tenant created successfully" });
    resetForm();
    await router.push("/dashboard/tenants");
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  } finally {
    isSubmitting.value = false;
  }
};

const toggleActionMenu = (tenantId: string) => {
  openActionMenuForId.value =
    openActionMenuForId.value === tenantId ? null : tenantId;
};

const openStatusDialog = (tenant: UserResponse) => {
  openActionMenuForId.value = null;
  tenantPendingStatusUpdate.value = tenant;
  selectedStatus.value = resolveTenantProfileStatus(tenant);
  isStatusDialogOpen.value = true;
};

const closeStatusDialog = () => {
  isStatusDialogOpen.value = false;
  tenantPendingStatusUpdate.value = null;
};

const confirmStatusUpdate = async () => {
  if (!tenantPendingStatusUpdate.value) {
    return;
  }

  const tenant = tenantPendingStatusUpdate.value;
  if (!tenant.tenantProfileId) {
    toast.error({ message: "Tenant profile ID is missing for this account." });
    return;
  }

  isSubmitting.value = true;
  try {
    await updateTenantStatus(
      Number(tenant.tenantProfileId),
      selectedStatus.value,
    );
    toast.success({ message: "Tenant status updated" });
    void refreshTenants({
      page: tenantsPagination.value.page,
      size: tenantsPagination.value.size,
    });
    closeStatusDialog();
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  } finally {
    isSubmitting.value = false;
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
  if (!tenantsPagination.value.hasPrevious || isTenantsLoading.value) {
    return;
  }

  await loadTenantPage(tenantsPagination.value.page - 1);
};

const goToNextPage = async () => {
  if (!tenantsPagination.value.hasNext || isTenantsLoading.value) {
    return;
  }

  await loadTenantPage(tenantsPagination.value.page + 1);
};

onMounted(async () => {
  document.addEventListener("click", handleDocumentClick, true);

  if (isListMode.value) {
    await loadTenantPage(0, true);
    return;
  }

  if (isCreateMode.value) {
    resetForm();
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
        <div class="rounded-2xl bg-card p-4 text-card-foreground shadow-sm transition-colors duration-300">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-2xl font-semibold text-foreground">Tenants</h2>
            </div>

            <div class="flex items-center gap-3">
              <Input v-model="searchQuery" placeholder="Search by email or name" class="max-w-sm" />

              <select v-model="statusFilter"
                class="border-input bg-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                <option value="all">All statuses</option>
                <option v-for="status in tenantStatuses" :key="status" :value="status">
                  {{ formatStatusLabel(status) }}
                </option>
              </select>

              <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover" @click="goToCreateTenant">
                <Icon name="lucide:plus" class="size-4" />
                Create Tenant
              </Button>
            </div>
          </div>
        </div>

        <TenantListSkeleton v-if="isInitialLoading" />

        <div v-else>
          <div class="space-y-3 md:hidden">
            <div v-for="tenant in filteredTenants" :key="`mobile-${tenant.id}`" class="space-y-3 rounded-lg border p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-muted-foreground">Email</p>
                  <p class="font-medium">{{ tenant.email }}</p>
                </div>
                <Badge variant="outline" :class="getStatusBadgeClass(
                  getTenantProfileStatusTone(
                    resolveTenantProfileStatus(tenant),
                  ),
                )
                  ">
                  {{ formatStatusLabel(resolveTenantProfileStatus(tenant)) }}
                </Badge>
              </div>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-xs text-muted-foreground">Name</p>
                  <p>
                    {{
                      [
                        tenant.fullName,
                        tenant.firstName,
                        tenant.lastName,
                      ].filter(Boolean)[0] || "-"
                    }}
                  </p>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="relative" data-action-menu>
                  <Button class="cursor-pointer" size="icon-sm" variant="ghost" @click="toggleActionMenu(tenant.id)">
                    <Icon name="lucide:ellipsis" class="size-4" />
                  </Button>

                  <div v-if="openActionMenuForId === tenant.id"
                    class="absolute left-0 bottom-full z-50 mb-2 min-w-44 rounded-md border bg-background p-1 shadow-lg">
                    <button class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                      @click="openStatusDialog(tenant)">
                      Change Status
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="!filteredTenants.length" class="py-4 text-center text-muted-foreground">
              No tenants found.
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
                  <th class="px-4 py-3 text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tenant in filteredTenants" :key="tenant.id"
                  class="border-b align-top transition-colors hover:bg-muted/10">
                  <td class="px-4 py-4 font-medium">{{ tenant.email }}</td>
                  <td class="px-4 py-4 text-muted-foreground">
                    {{
                      [
                        tenant.fullName,
                        tenant.firstName,
                        tenant.lastName,
                      ].filter(Boolean)[0] || "-"
                    }}
                  </td>
                  <td class="px-4 py-4">
                    <Badge variant="outline" :class="getStatusBadgeClass(
                      getTenantProfileStatusTone(
                        resolveTenantProfileStatus(tenant),
                      ),
                    )
                      ">
                      {{
                        formatStatusLabel(resolveTenantProfileStatus(tenant))
                      }}
                    </Badge>
                  </td>
                  <td class="px-4 py-4">
                    <div class="relative" data-action-menu>
                      <Button class="cursor-pointer" size="icon-sm" variant="ghost"
                        @click="toggleActionMenu(tenant.id)">
                        <Icon name="lucide:ellipsis" class="size-4" />
                      </Button>

                      <div v-if="openActionMenuForId === tenant.id"
                        class="absolute right-full top-6 z-50 mb-2 min-w-44 rounded-md border bg-background p-1 shadow-lg">
                        <button class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                          @click="openStatusDialog(tenant)">
                          Change Status
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filteredTenants.length">
                  <td colspan="4" class="py-4 text-center text-muted-foreground">
                    No tenants found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
            <div class="flex items-center gap-2">
              <Button class="cursor-pointer" size="sm" variant="outline"
                :disabled="!tenantsPagination.hasPrevious || isTenantsLoading" @click="goToPreviousPage">
                Previous
              </Button>
              <p class="text-xs text-muted-foreground">
                Page {{ tenantsPagination.page + 1 }} of
                {{ Math.max(tenantsPagination.totalPages, 1) }}
              </p>
              <Button class="cursor-pointer" size="sm" variant="outline"
                :disabled="!tenantsPagination.hasNext || isTenantsLoading" @click="goToNextPage">
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <div v-if="isStatusDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="closeStatusDialog">
      <div role="dialog" aria-modal="true" aria-labelledby="tenant-status-title"
        class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 id="tenant-status-title" class="text-lg font-semibold">
          Update tenant status
        </h3>
        <p class="mt-2 text-sm text-muted-foreground">
          Set a new status for
          <span class="font-medium text-foreground">
            {{ tenantPendingStatusUpdate?.email }}
          </span>
          .
        </p>

        <div class="mt-4 space-y-2">
          <Label for="tenant-status">Status</Label>
          <select id="tenant-status" v-model="selectedStatus"
            class="border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
            <option v-for="status in tenantStatuses" :key="status" :value="status">
              {{ formatStatusLabel(status) }}
            </option>
          </select>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <Button class="cursor-pointer" variant="outline" @click="closeStatusDialog">
            Cancel
          </Button>
          <Button class="cursor-pointer" :class="getStatusButtonClass(getTenantProfileStatusTone(selectedStatus))
            " :disabled="isSubmitting" @click="confirmStatusUpdate">
            {{ isSubmitting ? "Updating..." : "Update Status" }}
          </Button>
        </div>
      </div>
    </div>

    <Card v-if="!isListMode" class="w-full px-6">
      <div class="space-y-4">
        <div class="rounded-2xl bg-card p-4 text-card-foreground shadow-sm transition-colors duration-300">
          <h2 class="text-2xl font-semibold">Create Tenant</h2>
          <p class="text-sm text-muted-foreground">
            Add a new tenant account that can access the dashboard.
          </p>
        </div>

        <div
          class="rounded-2xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm transition-colors duration-300">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="tenant-email">Email</Label>
              <Input id="tenant-email" v-model="form.email" placeholder="tenant@example.com" />
            </div>

            <div class="space-y-2">
              <Label for="tenant-password">Password</Label>
              <Input id="tenant-password" v-model="form.password" type="password" placeholder="At least 8 chars" />
            </div>

            <div class="space-y-2">
              <Label for="tenant-first-name">First Name</Label>
              <Input id="tenant-first-name" v-model="form.firstName" placeholder="John" />
            </div>

            <div class="space-y-2">
              <Label for="tenant-last-name">Last Name</Label>
              <Input id="tenant-last-name" v-model="form.lastName" placeholder="Doe" />
            </div>

            <div class="space-y-2 md:col-span-2">
              <Label for="tenant-phone">Phone Number</Label>
              <Input id="tenant-phone" v-model="form.phoneNumber" placeholder="+2519xxxxxxx" />
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <Button class="cursor-pointer" variant="outline" @click="router.push('/dashboard/tenants')">
              Cancel
            </Button>
            <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover" :disabled="isSubmitting"
              @click="submitTenant">
              {{ isSubmitting ? "Creating..." : "Create Tenant" }}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </section>
</template>
