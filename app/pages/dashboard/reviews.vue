<script setup lang="ts">
import { storeToRefs } from "pinia";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { useAdminDataStore } from "~/stores/adminData.store";
import type {
  AdminReviewDecisionAction,
  ReviewListQueryParams,
  ReviewModerationStatus,
  ReviewResponse,
  ReviewVisibilityStatus,
} from "~/types/admin";

definePageMeta({
  layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const adminDataStore = useAdminDataStore();

const { reviews, reviewsPagination, isReviewsLoading, reviewsLoaded } =
  storeToRefs(adminDataStore);

const moderationStatusOptions: Array<{
  label: string;
  value: ReviewModerationStatus | "";
}> = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Rejected", value: "REJECTED" },
];

const visibilityStatusOptions: Array<{
  label: string;
  value: ReviewVisibilityStatus | "";
}> = [
  { label: "All", value: "" },
  { label: "Visible", value: "VISIBLE" },
  { label: "Hidden", value: "HIDDEN" },
];

const filters = reactive({
  storeId: "",
  productId: "",
  moderationStatus: "" as ReviewModerationStatus | "",
  visibilityStatus: "" as ReviewVisibilityStatus | "",
});

const isRejectDialogOpen = ref(false);
const reviewPendingDecision = ref<ReviewResponse | null>(null);
const rejectionReason = ref("");
const decidingById = ref<Record<number, boolean>>({});

const isInitialLoading = computed(
  () => isReviewsLoading.value && !reviewsLoaded.value,
);

const pageSummary = computed(() => {
  if (!reviewsPagination.value.totalElements) {
    return "No reviews";
  }

  const start = reviewsPagination.value.page * reviewsPagination.value.size + 1;
  const end = start + reviewsPagination.value.numberOfElements - 1;
  return `Showing ${start}-${end} of ${reviewsPagination.value.totalElements}`;
});

const normalizedFilters = computed<ReviewListQueryParams>(() => ({
  storeId: filters.storeId ? Number(filters.storeId) : undefined,
  productId: filters.productId ? Number(filters.productId) : undefined,
  moderationStatus: filters.moderationStatus || undefined,
  visibilityStatus: filters.visibilityStatus || undefined,
}));

const loadReviews = async (
  page = reviewsPagination.value.page,
  force = false,
) => {
  const size =
    reviewsPagination.value.size > 1
      ? reviewsPagination.value.size
      : DEFAULT_PAGE_SIZE;

  try {
    await adminDataStore.ensureReviews({
      ...normalizedFilters.value,
      page,
      size,
      force,
    });
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  }
};

const moderationBadgeVariant = (status: ReviewModerationStatus) => {
  if (status === "PUBLISHED") {
    return "outline" as const;
  }

  if (status === "REJECTED") {
    return "destructive" as const;
  }

  return "secondary" as const;
};

const visibilityBadgeVariant = (status: ReviewVisibilityStatus) => {
  return status === "VISIBLE" ? ("outline" as const) : ("secondary" as const);
};

const openRejectDialog = (review: ReviewResponse) => {
  reviewPendingDecision.value = review;
  rejectionReason.value = review.rejectionReason || "";
  isRejectDialogOpen.value = true;
};

const closeRejectDialog = () => {
  isRejectDialogOpen.value = false;
  reviewPendingDecision.value = null;
  rejectionReason.value = "";
};

const runDecision = async (
  review: ReviewResponse,
  action: AdminReviewDecisionAction,
  reason?: string,
) => {
  decidingById.value = {
    ...decidingById.value,
    [review.id]: true,
  };

  try {
    await adminDataStore.decideReview(review.id, {
      action,
      rejectionReason: reason,
    });

    toast.success({
      message: action === "PUBLISH" ? "Review published" : "Review rejected",
    });

    void adminDataStore.revalidateReviews({
      ...normalizedFilters.value,
      page: reviewsPagination.value.page,
      size:
        reviewsPagination.value.size > 1
          ? reviewsPagination.value.size
          : DEFAULT_PAGE_SIZE,
    });
  } catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
  } finally {
    decidingById.value = {
      ...decidingById.value,
      [review.id]: false,
    };
  }
};

const publishReview = async (review: ReviewResponse) => {
  await runDecision(review, "PUBLISH");
};

const submitRejectDecision = async () => {
  if (!reviewPendingDecision.value) {
    return;
  }

  const reason = rejectionReason.value.trim();
  if (!reason) {
    toast.error({ message: "Rejection reason is required" });
    return;
  }

  await runDecision(reviewPendingDecision.value, "REJECT", reason);
  closeRejectDialog();
};

const goToPreviousPage = async () => {
  if (!reviewsPagination.value.hasPrevious || isReviewsLoading.value) {
    return;
  }

  await loadReviews(reviewsPagination.value.page - 1);
};

const goToNextPage = async () => {
  if (!reviewsPagination.value.hasNext || isReviewsLoading.value) {
    return;
  }

  await loadReviews(reviewsPagination.value.page + 1);
};

watch(
  () => [
    filters.storeId,
    filters.productId,
    filters.moderationStatus,
    filters.visibilityStatus,
  ],
  async () => {
    await loadReviews(0, true);
  },
);

onMounted(async () => {
  await loadReviews(reviewsLoaded.value ? reviewsPagination.value.page : 0);
});
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Manage Reviews</h1>
      <p class="text-sm text-muted-foreground">
        Moderate reviews using the admin review controller.
      </p>
    </div>

    <Card class="px-6 py-4">
      <div class="grid gap-3 md:grid-cols-4">
        <div class="space-y-1">
          <Label for="review-moderation">Moderation</Label>
          <select
            id="review-moderation"
            v-model="filters.moderationStatus"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option
              v-for="item in moderationStatusOptions"
              :key="item.label"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </div>

        <div class="space-y-1">
          <Label for="review-visibility">Visibility</Label>
          <select
            id="review-visibility"
            v-model="filters.visibilityStatus"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option
              v-for="item in visibilityStatusOptions"
              :key="item.label"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </div>

        <div class="space-y-1">
          <Label for="review-store">Store ID</Label>
          <Input
            id="review-store"
            v-model="filters.storeId"
            placeholder="e.g. 12"
          />
        </div>

        <div class="space-y-1">
          <Label for="review-product">Product ID</Label>
          <Input
            id="review-product"
            v-model="filters.productId"
            placeholder="e.g. 305"
          />
        </div>
      </div>
    </Card>

    <Card class="px-6">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium">Review List</h2>
        </div>

        <div v-if="isInitialLoading" class="text-sm text-muted-foreground">
          Loading reviews...
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b text-left">
                <th class="py-2">Review</th>
                <th class="py-2">Rating</th>
                <th class="py-2">Status</th>
                <th class="py-2">Reports</th>
                <th class="py-2">Created</th>
                <th class="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="review in reviews"
                :key="review.id"
                class="border-b align-top"
              >
                <td class="py-2">
                  <p class="font-medium">{{ review.title }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{
                      review.authorName ||
                      `User
                                        #${review.userId}`
                    }}
                  </p>
                  <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {{ review.comment }}
                  </p>
                  <p
                    v-if="review.rejectionReason"
                    class="mt-1 text-xs text-destructive"
                  >
                    Rejection reason: {{ review.rejectionReason }}
                  </p>
                </td>
                <td class="py-2">{{ review.rating }}/5</td>
                <td class="py-2 space-y-1">
                  <Badge
                    :variant="moderationBadgeVariant(review.moderationStatus)"
                  >
                    {{ review.moderationStatus }}
                  </Badge>
                  <div>
                    <Badge
                      :variant="visibilityBadgeVariant(review.visibilityStatus)"
                    >
                      {{ review.visibilityStatus }}
                    </Badge>
                  </div>
                </td>
                <td class="py-2">{{ review.reportCount }}</td>
                <td class="py-2">
                  {{ new Date(review.createdAt).toLocaleString() }}
                </td>
                <td class="py-2">
                  <div class="flex flex-wrap gap-2">
                    <Button
                      v-if="review.moderationStatus !== 'PUBLISHED'"
                      class="cursor-pointer"
                      size="sm"
                      variant="outline"
                      :disabled="decidingById[review.id]"
                      @click="publishReview(review)"
                    >
                      {{ decidingById[review.id] ? "Working..." : "Publish" }}
                    </Button>
                    <Button
                      v-if="review.moderationStatus !== 'REJECTED'"
                      class="cursor-pointer"
                      size="sm"
                      variant="destructive"
                      :disabled="decidingById[review.id]"
                      @click="openRejectDialog(review)"
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
              <tr v-if="!reviews.length">
                <td colspan="6" class="py-4 text-center text-muted-foreground">
                  No reviews found.
                </td>
              </tr>
            </tbody>
          </table>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
            <div class="flex items-center gap-2">
              <Button
                class="cursor-pointer"
                size="sm"
                variant="outline"
                :disabled="!reviewsPagination.hasPrevious || isReviewsLoading"
                @click="goToPreviousPage"
              >
                Previous
              </Button>
              <p class="text-xs text-muted-foreground">
                Page {{ reviewsPagination.page + 1 }} of
                {{ Math.max(reviewsPagination.totalPages, 1) }}
              </p>
              <Button
                class="cursor-pointer"
                size="sm"
                variant="outline"
                :disabled="!reviewsPagination.hasNext || isReviewsLoading"
                @click="goToNextPage"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <div
      v-if="isRejectDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="closeRejectDialog"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-review-title"
        class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
      >
        <h3 id="reject-review-title" class="text-lg font-semibold">
          Reject review
        </h3>
        <p class="mt-2 text-sm text-muted-foreground">
          Provide a reason for rejecting
          <span class="font-medium text-foreground">{{
            reviewPendingDecision?.title
          }}</span
          >.
        </p>

        <div class="mt-4 space-y-2">
          <Label for="rejection-reason">Reason</Label>
          <Textarea
            id="rejection-reason"
            v-model="rejectionReason"
            placeholder="Explain why this review is rejected"
          />
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <Button
            class="cursor-pointer"
            variant="outline"
            @click="closeRejectDialog"
            >Cancel</Button
          >
          <Button
            class="cursor-pointer"
            variant="destructive"
            @click="submitRejectDecision"
            >Reject review</Button
          >
        </div>
      </div>
    </div>
  </section>
</template>
