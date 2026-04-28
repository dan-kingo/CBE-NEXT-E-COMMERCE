<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { subscriptionService } from "~/features/subscription/services/subscription.service";
import type {
  SubscriptionPlan,
  SubscriptionPlanStats,
} from "~/features/subscription/types/subscription.types";
import { useSubscriptionManagement } from "~/features/subscription/composables/useSubscriptionManagement";
import SubscriptionListSkeleton from "~/features/subscription/components/SubscriptionListSkeleton.vue";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import {
  getPlanStatusTone,
  getPlanToggleTone,
  getStatusBadgeClass,
  getStatusButtonClass,
} from "~/utils/status";

interface SubscriptionManagementViewProps {
  mode?: "list" | "create" | "edit";
  planId?: string;
}

const props = withDefaults(defineProps<SubscriptionManagementViewProps>(), {
  mode: "list",
  planId: "",
});

const router = useRouter();
const route = useRoute();
const toast = useToast();
const { getMessageFromUnknown } = useApiError();

const {
  isLoading,
  isSubmitting,
  plans,
  pagination,
  statsByPlanId,
  searchQuery,
  activeFilter,
  form,
  loadPlans,
  createPlan,
  updatePlan,
  togglePlanActive,
  loadPlanStats,
  resetForm,
} = useSubscriptionManagement();

const currentPath = computed(() => route.path.replace(/\/$/, ""));

const isListMode = computed(
  () =>
    props.mode === "list" || currentPath.value === "/dashboard/subscriptions",
);

const isCreateMode = computed(
  () => props.mode === "create" || currentPath.value.endsWith("/create"),
);

const isEditMode = computed(
  () => props.mode === "edit" || currentPath.value.endsWith("/edit"),
);

const editingPlanId = computed(() => {
  if (!isEditMode.value) {
    return "";
  }

  if (props.planId) {
    return props.planId;
  }

  const id = route.params.id;
  return typeof id === "string" ? id : "";
});

const planStats = computed<SubscriptionPlanStats | null>(() => {
  if (!editingPlanId.value) {
    return null;
  }

  return statsByPlanId.value[editingPlanId.value] ?? null;
});

const formatPrice = (plan: SubscriptionPlan) => {
  return `${plan.currency} ${plan.price.toFixed(2)}`;
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
};

const filterActivePlans = computed(() => {
  if (activeFilter.value === "active") {
    return true;
  }

  if (activeFilter.value === "inactive") {
    return false;
  }

  return undefined;
});

const openActionMenuForId = ref<string | null>(null);
const isStatusDialogOpen = ref(false);
const planPendingStatusChange = ref<SubscriptionPlan | null>(null);

const isInitialLoading = computed(() => isLoading.value && !plans.value.length);

const pageSummary = computed(() => {
  if (!pagination.value.totalElements) {
    return "No subscription plans";
  }

  const start = pagination.value.page * pagination.value.size + 1;
  const end = start + pagination.value.numberOfElements - 1;
  return `Showing ${start}-${end} of ${pagination.value.totalElements}`;
});

const loadPlanPage = async (page = 0) => {
  try {
    await loadPlans({
      page,
      size:
        pagination.value.size > 1 ? pagination.value.size : DEFAULT_PAGE_SIZE,
      search: searchQuery.value.trim() || undefined,
      active: filterActivePlans.value,
    });
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  }
};

const debouncedReload = useDebounceFn(() => {
  void loadPlanPage(0);
}, 250);

watch([searchQuery, activeFilter], () => {
  if (!isListMode.value) {
    return;
  }

  debouncedReload();
});

const fillFormFromPlan = (plan: SubscriptionPlan) => {
  resetForm(plan);
};

const resolvePlanForEdit = async () => {
  const targetId = editingPlanId.value;
  if (!targetId) {
    return null;
  }

  const cachedPlan = plans.value.find((plan) => plan.id === targetId);
  if (cachedPlan) {
    return cachedPlan;
  }

  const pageSize = 100;
  let page = 0;

  while (true) {
    const result = await subscriptionService.getAll({ page, size: pageSize });
    const found = result.content.find((plan) => plan.id === targetId);

    if (found) {
      return found;
    }

    if (page >= result.pagination.totalPages - 1) {
      break;
    }

    page += 1;
  }

  return null;
};

const goToCreatePlan = async () => {
  await router.push("/dashboard/subscriptions/create");
};

const goToEditPlan = async (plan: SubscriptionPlan) => {
  openActionMenuForId.value = null;
  await router.push(`/dashboard/subscriptions/${plan.id}/edit`);
};

const goToPreviousPage = async () => {
  if (!pagination.value.hasPrevious || isLoading.value) {
    return;
  }

  await loadPlanPage(pagination.value.page - 1);
};

const goToNextPage = async () => {
  if (!pagination.value.hasNext || isLoading.value) {
    return;
  }

  await loadPlanPage(pagination.value.page + 1);
};

const submitPlan = async () => {
  try {
    if (isEditMode.value && editingPlanId.value) {
      await updatePlan(editingPlanId.value);
      await loadPlanStats(editingPlanId.value);
      toast.success({ message: "Subscription plan updated" });
    } else {
      await createPlan();
      toast.success({ message: "Subscription plan created" });
    }

    await router.push("/dashboard/subscriptions");
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  }
};

const toggleActionMenu = (planId: string) => {
  openActionMenuForId.value =
    openActionMenuForId.value === planId ? null : planId;
};

const openStatusDialog = (plan: SubscriptionPlan) => {
  openActionMenuForId.value = null;
  planPendingStatusChange.value = plan;
  isStatusDialogOpen.value = true;
};

const closeStatusDialog = () => {
  isStatusDialogOpen.value = false;
  planPendingStatusChange.value = null;
};

const confirmStatusChange = async () => {
  if (!planPendingStatusChange.value) {
    return;
  }

  const currentPlan = planPendingStatusChange.value;

  try {
    await togglePlanActive(currentPlan.id, !currentPlan.active);
    toast.success({
      message: currentPlan.active
        ? "Subscription plan deactivated"
        : "Subscription plan activated",
    });

    await loadPlanPage(pagination.value.page);
    closeStatusDialog();
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

onMounted(async () => {
  document.addEventListener("click", handleDocumentClick, true);

  if (isListMode.value) {
    await loadPlanPage(0);
    return;
  }

  if (isCreateMode.value) {
    resetForm();
    return;
  }

  const plan = await resolvePlanForEdit();
  if (!plan) {
    toast.error({ message: "Subscription plan not found." });
    await router.push("/dashboard/subscriptions");
    return;
  }

  fillFormFromPlan(plan);

  if (isEditMode.value) {
    try {
      await loadPlanStats(plan.id);
    } catch (error) {
      toast.error({ message: getMessageFromUnknown(error) });
    }
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
        <div class="rounded-2xl bg-white p-4 shadow-sm">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div class="space-y-1">
              <h2 class="text-2xl font-semibold">Subscription Plans</h2>
            </div>

            <div class="flex  items-center gap-3">
              <Input v-model="searchQuery" placeholder="Search by name or currency" class="max-w-sm" />

              <select v-model="activeFilter"
                class="border-input bg-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                <option value="all">All plans</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover" @click="goToCreatePlan">
                <Icon name="lucide:plus" class="size-4" />
                Create Plan
              </Button>
            </div>
          </div>
        </div>

        <SubscriptionListSkeleton v-if="isInitialLoading" />

        <div v-else>
          <div class="space-y-3 md:hidden">
            <div v-for="plan in plans" :key="`mobile-${plan.id}`" class="space-y-3 rounded-lg border p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-muted-foreground">Plan</p>
                  <p class="font-medium">{{ plan.name }}</p>
                </div>
                <Badge variant="outline" :class="getStatusBadgeClass(getPlanStatusTone(plan.active))">
                  {{ plan.active ? "Active" : "Inactive" }}
                </Badge>
              </div>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-xs text-muted-foreground">Price</p>
                  <p>{{ formatPrice(plan) }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Duration</p>
                  <p>{{ plan.durationDays }} days</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Updated</p>
                  <p>{{ formatDate(plan.updatedAt) }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Created</p>
                  <p>{{ formatDate(plan.createdAt) }}</p>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="relative" data-action-menu>
                  <Button class="cursor-pointer" size="icon-sm" variant="ghost" @click="toggleActionMenu(plan.id)">
                    <Icon name="lucide:ellipsis" class="size-4" />
                  </Button>

                  <div v-if="openActionMenuForId === plan.id"
                    class="absolute left-0 bottom-full z-50 mb-2 min-w-40 rounded-md border bg-background p-1 shadow-lg">
                    <button class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                      @click="goToEditPlan(plan)">
                      View &amp; Edit
                    </button>
                    <button class="mt-1 w-full rounded-sm px-2 py-1.5 text-left text-sm cursor-pointer" :class="getStatusButtonClass(getPlanToggleTone(plan.active))
                      " @click="openStatusDialog(plan)">
                      {{ plan.active ? "Deactivate" : "Activate" }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="!plans.length" class="py-4 text-center text-muted-foreground">
              No subscription plans found.
            </p>
          </div>

          <div class="hidden overflow-x-auto md:block">
            <table class="w-full overflow-hidden rounded-lg border-collapse bg-white text-sm shadow-sm">
              <thead class="bg-muted/20">
                <tr class="text-left">
                  <th class="px-4 py-3 text-sm text-muted-foreground">Plan</th>
                  <th class="px-4 py-3 text-sm text-muted-foreground">Price</th>
                  <th class="px-4 py-3 text-sm text-muted-foreground">Duration</th>
                  <th class="px-4 py-3 text-sm text-muted-foreground">Status</th>
                  <th class="px-4 py-3 text-sm text-muted-foreground">Created</th>
                  <th class="px-4 py-3 text-right text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="plan in plans" :key="plan.id" class="border-b align-top transition-colors hover:bg-muted/10">
                  <td class="px-4 py-4 font-medium">
                    <div>
                      <p>{{ plan.name }}</p>
                      <p class="text-xs text-muted-foreground">
                        Created {{ formatDate(plan.createdAt) }}
                      </p>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-muted-foreground">
                    {{ formatPrice(plan) }}
                  </td>
                  <td class="px-4 py-4">{{ plan.durationDays }} days</td>
                  <td class="px-4 py-4">
                    <Badge variant="outline" :class="getStatusBadgeClass(getPlanStatusTone(plan.active))
                      ">
                      {{ plan.active ? "Active" : "Inactive" }}
                    </Badge>
                  </td>
                  <td class="px-4 py-4 text-muted-foreground">
                    {{ formatDate(plan.createdAt) }}
                  </td>
                  <td class="px-4 py-4">
                    <div class="relative" data-action-menu>
                      <Button class="cursor-pointer" size="icon-sm" variant="ghost" @click="toggleActionMenu(plan.id)">
                        <Icon name="lucide:ellipsis" class="size-4" />
                      </Button>

                      <div v-if="openActionMenuForId === plan.id"
                        class="absolute right-full top-6 z-50 mb-2 min-w-40 rounded-md border bg-background p-1 shadow-lg">
                        <button class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                          @click="goToEditPlan(plan)">
                          View &amp; Edit
                        </button>
                        <button class="mt-1 w-full rounded-sm px-2 py-1.5 text-left text-sm cursor-pointer" :class="getStatusButtonClass(getPlanToggleTone(plan.active))
                          " @click="openStatusDialog(plan)">
                          {{ plan.active ? "Deactivate" : "Activate" }}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-if="!plans.length">
                  <td colspan="6" class="py-4 text-center text-muted-foreground">
                    No subscription plans found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
            <div class="flex items-center gap-2">
              <Button class="cursor-pointer" size="sm" variant="outline"
                :disabled="!pagination.hasPrevious || isLoading" @click="goToPreviousPage">
                Previous
              </Button>

              <p class="text-xs text-muted-foreground">
                Page {{ pagination.page + 1 }} of
                {{ Math.max(pagination.totalPages, 1) }}
              </p>

              <Button class="cursor-pointer" size="sm" variant="outline" :disabled="!pagination.hasNext || isLoading"
                @click="goToNextPage">
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <div v-if="isStatusDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="closeStatusDialog">
      <div role="dialog" aria-modal="true" aria-labelledby="toggle-plan-title"
        class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 id="toggle-plan-title" class="text-lg font-semibold">
          {{
            planPendingStatusChange?.active
              ? "Deactivate subscription plan?"
              : "Activate subscription plan?"
          }}
        </h3>
        <p class="mt-2 text-sm text-muted-foreground">
          {{
            planPendingStatusChange?.active
              ? "This will disable the plan for new subscriptions."
              : "This will enable the plan for new subscriptions."
          }}
          <span class="font-medium text-foreground">
            {{ planPendingStatusChange?.name }}
          </span>
        </p>

        <div class="mt-6 flex justify-end gap-2">
          <Button class="cursor-pointer" variant="outline" @click="closeStatusDialog">
            Cancel
          </Button>
          <Button class="cursor-pointer" :class="getStatusButtonClass(
            planPendingStatusChange?.active ? 'warning' : 'success',
          )
            " :disabled="isSubmitting" @click="confirmStatusChange">
            {{
              isSubmitting
                ? planPendingStatusChange?.active
                  ? "Deactivating..."
                  : "Activating..."
                : planPendingStatusChange?.active
                  ? "Deactivate"
                  : "Activate"
            }}
          </Button>
        </div>
      </div>
    </div>

    <Card v-if="!isListMode" class="w-full px-6">
      <div class="space-y-4">
        <div class="rounded-2xl bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-2xl font-semibold">
                {{
                  isEditMode
                    ? "Edit Subscription Plan"
                    : "Create Subscription Plan"
                }}
              </h2>
              <p class="text-sm text-muted-foreground">
                {{
                  isEditMode
                    ? "Update pricing and activation settings for this plan."
                    : "Add a new plan for tenant subscriptions."
                }}
              </p>
            </div>

            <Badge v-if="isEditMode && planStats" variant="outline">
              {{ planStats.name }} stats loaded
            </Badge>
          </div>
        </div>

        <div class="rounded-2xl border border-border/60 bg-white p-4 shadow-sm space-y-4">
          <div v-if="isEditMode && planStats" class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border bg-muted/30 p-4">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">
                Total purchases
              </p>
              <p class="mt-2 text-2xl font-semibold">
                {{ planStats.totalPurchases }}
              </p>
            </div>
            <div class="rounded-xl border bg-muted/30 p-4">
              <p class="text-xs uppercase tracking-wide text-muted-foreground">
                Active tenants
              </p>
              <p class="mt-2 text-2xl font-semibold">
                {{ planStats.activeTenants }}
              </p>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="plan-name">Name</Label>
              <Input id="plan-name" v-model="form.name" placeholder="Basic Monthly" />
            </div>

            <div class="space-y-2">
              <Label for="plan-price">Price</Label>
              <Input id="plan-price" v-model="form.price" type="number" placeholder="9.99" />
            </div>

            <div class="space-y-2">
              <Label for="plan-currency">Currency</Label>
              <Input id="plan-currency" v-model="form.currency" placeholder="USD" />
            </div>

            <div class="space-y-2">
              <Label for="plan-duration">Duration (days)</Label>
              <Input id="plan-duration" v-model="form.durationDays" type="number" placeholder="30" />
            </div>
          </div>

          <div v-if="isEditMode" class="flex items-center gap-2 rounded-lg border px-3 py-2">
            <input id="plan-active" v-model="form.active" type="checkbox" class="size-4 rounded border-input" />
            <Label for="plan-active" class="cursor-pointer">Active</Label>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <Button class="cursor-pointer" variant="outline" @click="router.push('/dashboard/subscriptions')">
              Cancel
            </Button>
            <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover" :disabled="isSubmitting"
              @click="submitPlan">
              {{
                isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Update Plan"
                    : "Create Plan"
              }}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </section>
</template>
