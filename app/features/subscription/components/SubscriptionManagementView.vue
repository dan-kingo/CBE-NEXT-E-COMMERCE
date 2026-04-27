<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { subscriptionService } from "~/features/subscription/services/subscription.service";
import type {
  SubscriptionPlan,
  SubscriptionPlanStats,
} from "~/features/subscription/types/subscription.types";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { useSubscriptionManagement } from "~/features/subscription/composables/useSubscriptionManagement";

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
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-medium">Subscription Plans</h2>
          </div>

          <div class="flex items-center gap-3">
            <Input
              v-model="searchQuery"
              placeholder="Search by name or currency"
              class="max-w-sm"
            />

            <select
              v-model="activeFilter"
              class="border-input bg-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="all">All plans</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <Button class="cursor-pointer" @click="goToCreatePlan">
              <Icon name="lucide:plus" class="size-4" />
              Create Plan
            </Button>
          </div>
        </div>

        <div v-if="isInitialLoading" class="text-sm text-muted-foreground">
          Loading subscription plans...
        </div>

        <div v-else>
          <div class="space-y-3 md:hidden">
            <div
              v-for="plan in plans"
              :key="`mobile-${plan.id}`"
              class="space-y-3 rounded-lg border p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-muted-foreground">Plan</p>
                  <p class="font-medium">{{ plan.name }}</p>
                </div>
                <Badge :variant="plan.active ? 'outline' : 'secondary'">
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
                  <p class="text-xs text-muted-foreground">Created</p>
                  <p>{{ formatDate(plan.updatedAt) }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Created</p>
                  <p>{{ formatDate(plan.createdAt) }}</p>
                </div>
              </div>

              <div class="flex justify-end">
                <div class="relative" data-action-menu>
                  <Button
                    class="cursor-pointer"
                    size="icon-sm"
                    variant="ghost"
                    @click="toggleActionMenu(plan.id)"
                  >
                    <Icon name="lucide:ellipsis" class="size-4" />
                  </Button>

                  <div
                    v-if="openActionMenuForId === plan.id"
                    class="absolute left-0 bottom-full z-50 mb-2 min-w-40 rounded-md border bg-background p-1 shadow-lg"
                  >
                    <button
                      class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                      @click="goToEditPlan(plan)"
                    >
                      View &amp; Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p
              v-if="!plans.length"
              class="py-4 text-center text-muted-foreground"
            >
              No subscription plans found.
            </p>
          </div>

          <div class="hidden overflow-x-auto md:block">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b text-left">
                  <th class="py-2">Plan</th>
                  <th class="py-2">Price</th>
                  <th class="py-2">Duration</th>
                  <th class="py-2">Status</th>
                  <th class="py-2">Created</th>
                  <th class="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="plan in plans"
                  :key="plan.id"
                  class="border-b align-top"
                >
                  <td class="py-2 font-medium">
                    <div>
                      <p>{{ plan.name }}</p>
                      <p class="text-xs text-muted-foreground">
                        Created {{ formatDate(plan.createdAt) }}
                      </p>
                    </div>
                  </td>
                  <td class="py-2 text-muted-foreground">
                    {{ formatPrice(plan) }}
                  </td>
                  <td class="py-2">{{ plan.durationDays }} days</td>
                  <td class="py-2">
                    <Badge :variant="plan.active ? 'outline' : 'secondary'">
                      {{ plan.active ? "Active" : "Inactive" }}
                    </Badge>
                  </td>
                  <td class="py-2 text-muted-foreground">
                    {{ formatDate(plan.createdAt) }}
                  </td>
                  <td class="py-2">
                    <div class="relative" data-action-menu>
                      <Button
                        class="cursor-pointer"
                        size="icon-sm"
                        variant="ghost"
                        @click="toggleActionMenu(plan.id)"
                      >
                        <Icon name="lucide:ellipsis" class="size-4" />
                      </Button>

                      <div
                        v-if="openActionMenuForId === plan.id"
                        class="absolute right-full top-6 z-50 mb-2 min-w-40 rounded-md border bg-background p-1 shadow-lg"
                      >
                        <button
                          class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                          @click="goToEditPlan(plan)"
                        >
                          View &amp; Edit
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-if="!plans.length">
                  <td
                    colspan="6"
                    class="py-4 text-center text-muted-foreground"
                  >
                    No subscription plans found.
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
                :disabled="!pagination.hasPrevious || isLoading"
                @click="goToPreviousPage"
              >
                Previous
              </Button>

              <p class="text-xs text-muted-foreground">
                Page {{ pagination.page + 1 }} of
                {{ Math.max(pagination.totalPages, 1) }}
              </p>

              <Button
                class="cursor-pointer"
                size="sm"
                variant="outline"
                :disabled="!pagination.hasNext || isLoading"
                @click="goToNextPage"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <Card v-else class="w-full px-6">
      <div class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-medium">
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
            <Input
              id="plan-name"
              v-model="form.name"
              placeholder="Basic Monthly"
            />
          </div>

          <div class="space-y-2">
            <Label for="plan-price">Price</Label>
            <Input
              id="plan-price"
              v-model="form.price"
              type="number"
              placeholder="9.99"
            />
          </div>

          <div class="space-y-2">
            <Label for="plan-currency">Currency</Label>
            <Input
              id="plan-currency"
              v-model="form.currency"
              placeholder="USD"
            />
          </div>

          <div class="space-y-2">
            <Label for="plan-duration">Duration (days)</Label>
            <Input
              id="plan-duration"
              v-model="form.durationDays"
              type="number"
              placeholder="30"
            />
          </div>
        </div>

        <div
          v-if="isEditMode"
          class="flex items-center gap-2 rounded-lg border px-3 py-2"
        >
          <input
            id="plan-active"
            v-model="form.active"
            type="checkbox"
            class="size-4 rounded border-input"
          />
          <Label for="plan-active" class="cursor-pointer">Active</Label>
        </div>

        <div class="flex items-center gap-2">
          <Button
            class="cursor-pointer"
            variant="outline"
            @click="router.push('/dashboard/subscriptions')"
          >
            Cancel
          </Button>
          <Button
            class="cursor-pointer"
            :disabled="isSubmitting"
            @click="submitPlan"
          >
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
    </Card>
  </section>
</template>
