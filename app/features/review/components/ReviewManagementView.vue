<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import ReviewListSkeleton from "~/features/review/components/ReviewListSkeleton.vue";
import { useReviewManagement } from "~/features/review/composables/useReviewManagement";
import {
    createReviewDecisionSchema,
    reviewFiltersSchema,
} from "~/features/review/schemas/review.schema";
import type {
    AdminReviewDecisionAction,
    ReviewListQueryParams,
    ReviewModerationStatus,
    ReviewResponse,
    ReviewVisibilityStatus,
} from "~/features/review/types/review.types";

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const {
    reviews,
    reviewsPagination,
    isReviewsLoading,
    reviewsLoaded,
    loadReviews,
    refreshReviews,
    decideReview,
} = useReviewManagement();

const moderationStatusOptions: Array<{
    label: string;
    value: ReviewModerationStatus | "";
}> = [
        { label: "All moderation", value: "" },
        { label: "Pending", value: "PENDING" },
        { label: "Published", value: "PUBLISHED" },
        { label: "Rejected", value: "REJECTED" },
    ];

const visibilityStatusOptions: Array<{
    label: string;
    value: ReviewVisibilityStatus | "";
}> = [
        { label: "All visibility", value: "" },
        { label: "Visible", value: "VISIBLE" },
        { label: "Hidden", value: "HIDDEN" },
    ];

const filters = reactive({

    moderationStatus: "" as ReviewModerationStatus | "",
    visibilityStatus: "" as ReviewVisibilityStatus | "",
});

const isRejectDialogOpen = ref(false);
const reviewPendingDecision = ref<ReviewResponse | null>(null);
const rejectionReason = ref("");
const decidingById = ref<Record<number, boolean>>({});
const openActionMenuForId = ref<number | null>(null);

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

const normalizedFilters = computed<ReviewListQueryParams>(() => {
    const parsed = reviewFiltersSchema.parse({

        moderationStatus: filters.moderationStatus || undefined,
        visibilityStatus: filters.visibilityStatus || undefined,
    });

    return {
        storeId: parsed.storeId,
        productId: parsed.productId,
        moderationStatus: parsed.moderationStatus,
        visibilityStatus: parsed.visibilityStatus,
    };
});

const fetchReviews = async (
    page = reviewsPagination.value.page,
    force = false,
) => {
    const size =
        reviewsPagination.value.size > 1
            ? reviewsPagination.value.size
            : DEFAULT_PAGE_SIZE;

    try {
        await loadReviews({
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
    openActionMenuForId.value = null;
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
    const parsed = createReviewDecisionSchema.safeParse({
        action,
        rejectionReason: reason,
    });

    if (!parsed.success) {
        toast.error({
            message: parsed.error.issues[0]?.message || "Invalid review decision",
        });
        return;
    }

    decidingById.value = {
        ...decidingById.value,
        [review.id]: true,
    };

    try {
        await decideReview(review.id, parsed.data);

        toast.success({
            message: action === "PUBLISH" ? "Review published" : "Review rejected",
        });

        void refreshReviews({
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
    openActionMenuForId.value = null;
    await runDecision(review, "PUBLISH");
};

const submitRejectDecision = async () => {
    if (!reviewPendingDecision.value) {
        return;
    }

    await runDecision(reviewPendingDecision.value, "REJECT", rejectionReason.value);
    closeRejectDialog();
};

const toggleActionMenu = (reviewId: number) => {
    openActionMenuForId.value =
        openActionMenuForId.value === reviewId ? null : reviewId;
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
    if (!reviewsPagination.value.hasPrevious || isReviewsLoading.value) {
        return;
    }

    await fetchReviews(reviewsPagination.value.page - 1);
};

const goToNextPage = async () => {
    if (!reviewsPagination.value.hasNext || isReviewsLoading.value) {
        return;
    }

    await fetchReviews(reviewsPagination.value.page + 1);
};

watch(
    () => [

        filters.moderationStatus,
        filters.visibilityStatus,
    ],
    async () => {
        await fetchReviews(0, true);
    },
);

onMounted(async () => {
    document.addEventListener("click", handleDocumentClick, true);
    await fetchReviews(reviewsLoaded.value ? reviewsPagination.value.page : 0);
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleDocumentClick, true);
});
</script>

<template>
    <section class="space-y-6">


        <Card class="w-full px-6">
            <div class="space-y-4">
                <div class="rounded-2xl bg-white p-4 shadow-sm">
                    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <h2 class="text-2xl font-semibold">Reviews</h2>

                        <div class="flex flex-wrap items-center gap-3 md:justify-end">
                            <select id="review-moderation" v-model="filters.moderationStatus"
                                class="border-input bg-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                                <option v-for="item in moderationStatusOptions" :key="item.label" :value="item.value">
                                    {{ item.label }}
                                </option>
                            </select>
                            <select id="review-visibility" v-model="filters.visibilityStatus"
                                class="border-input bg-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] hidden sm:block">
                                <option v-for="item in visibilityStatusOptions" :key="item.label" :value="item.value">
                                    {{ item.label }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <ReviewListSkeleton v-if="isInitialLoading" />

                <div v-else>
                    <!-- Mobile View -->
                    <div class="space-y-3 md:hidden">
                        <div v-for="review in reviews" :key="`mobile-${review.id}`"
                            class="space-y-3 rounded-lg border p-3">

                            <div class="flex items-start justify-between gap-3">
                                <div class="truncate">
                                    <p class="text-xs text-muted-foreground">Rating: {{ review.rating }}/5</p>
                                    <p class="font-medium truncate">{{ review.title }}</p>
                                    <p class="text-xs text-muted-foreground">By {{ review.authorName || `User
                                        #${review.userId}` }}</p>
                                </div>

                                <div class="flex flex-col items-end gap-1">
                                    <Badge :variant="moderationBadgeVariant(review.moderationStatus)">
                                        {{ review.moderationStatus }}
                                    </Badge>
                                    <Badge :variant="visibilityBadgeVariant(review.visibilityStatus)">
                                        {{ review.visibilityStatus }}
                                    </Badge>
                                </div>
                            </div>

                            <p class="mt-1 line-clamp-3 text-sm text-muted-foreground">
                                {{ review.comment }}
                            </p>
                            <p v-if="review.rejectionReason" class="mt-1 text-xs text-destructive">
                                Rejected: {{ review.rejectionReason }}
                            </p>
                            <p class="text-xs text-muted-foreground">
                                Reports: {{ review.reportCount }} | {{ new Date(review.createdAt).toLocaleDateString()
                                }}
                            </p>

                            <div class="flex justify-end gap-2 border-t pt-2">
                                <Button v-if="review.moderationStatus !== 'PUBLISHED'" class="cursor-pointer" size="sm"
                                    variant="outline" :disabled="decidingById[review.id]"
                                    @click="publishReview(review)">
                                    {{ decidingById[review.id] ? "Working..." : "Publish" }}
                                </Button>
                                <Button v-if="review.moderationStatus !== 'REJECTED'" class="cursor-pointer" size="sm"
                                    variant="destructive" :disabled="decidingById[review.id]"
                                    @click="openRejectDialog(review)">
                                    Reject
                                </Button>
                            </div>
                        </div>

                        <p v-if="!reviews.length" class="py-4 text-center text-muted-foreground">
                            No reviews found.
                        </p>
                    </div>

                    <!-- Desktop View -->
                    <div class="hidden overflow-x-auto md:block">
                        <table class="w-full overflow-hidden rounded-lg border-collapse bg-white text-sm shadow-sm">
                            <thead class="bg-muted/20">
                                <tr class="text-left">
                                    <th class="px-4 py-3 text-sm text-muted-foreground">Review</th>
                                    <th class="px-4 py-3 text-sm text-muted-foreground">Rating</th>
                                    <th class="px-4 py-3 text-sm text-muted-foreground">Status</th>
                                    <th class="px-4 py-3 text-sm text-muted-foreground">Reports</th>
                                    <th class="px-4 py-3 text-sm text-muted-foreground">Created</th>
                                    <th class="px-4 py-3 text-right text-sm text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="review in reviews" :key="review.id"
                                    class="border-b align-top transition-colors hover:bg-muted/10">
                                    <td class="max-w-sm px-4 py-4">
                                        <p class="font-medium truncate">{{ review.title }}</p>
                                        <p class="text-xs text-muted-foreground">
                                            {{ review.authorName || `User #${review.userId}` }}
                                        </p>
                                        <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {{ review.comment }}
                                        </p>
                                        <p v-if="review.rejectionReason" class="mt-1 text-xs text-destructive">
                                            Rejection reason: {{ review.rejectionReason }}
                                        </p>
                                    </td>
                                    <td class="px-4 py-4 font-medium">{{ review.rating }}/5</td>
                                    <td class="space-y-1 px-4 py-4">
                                        <div>
                                            <Badge :variant="moderationBadgeVariant(review.moderationStatus)">
                                                {{ review.moderationStatus }}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Badge :variant="visibilityBadgeVariant(review.visibilityStatus)">
                                                {{ review.visibilityStatus }}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td class="px-4 py-4">{{ review.reportCount }}</td>
                                    <td class="px-4 py-4">
                                        {{ new Date(review.createdAt).toLocaleDateString() }}
                                    </td>
                                    <td class="px-4 py-4 text-right">
                                        <div class="relative inline-block" data-action-menu>
                                            <Button class="cursor-pointer" size="icon-sm" variant="ghost"
                                                @click="toggleActionMenu(review.id)">
                                                <Icon name="lucide:ellipsis" class="size-4" />
                                            </Button>

                                            <div v-if="openActionMenuForId === review.id"
                                                class="absolute right-full top-6 z-50 mb-2 min-w-44 rounded-md border bg-background p-1 text-left shadow-lg">
                                                <button v-if="review.moderationStatus !== 'PUBLISHED'"
                                                    class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                                                    :disabled="decidingById[review.id]" @click="publishReview(review)">
                                                    Publish
                                                </button>
                                                <button v-if="review.moderationStatus !== 'REJECTED'"
                                                    class="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-destructive/10 text-destructive cursor-pointer"
                                                    :disabled="decidingById[review.id]"
                                                    @click="openRejectDialog(review)">
                                                    Reject
                                                </button>
                                            </div>
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
                    </div>

                    <div class="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
                        <div class="flex items-center gap-2">
                            <Button class="cursor-pointer" size="sm" variant="outline"
                                :disabled="!reviewsPagination.hasPrevious || isReviewsLoading"
                                @click="goToPreviousPage">
                                Previous
                            </Button>
                            <p class="text-xs text-muted-foreground">
                                Page {{ reviewsPagination.page + 1 }} of
                                {{ Math.max(reviewsPagination.totalPages, 1) }}
                            </p>
                            <Button class="cursor-pointer" size="sm" variant="outline"
                                :disabled="!reviewsPagination.hasNext || isReviewsLoading" @click="goToNextPage">
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Card>

        <div v-if="isRejectDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            @click.self="closeRejectDialog">
            <div role="dialog" aria-modal="true" aria-labelledby="reject-review-title"
                class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
                <h3 id="reject-review-title" class="text-lg font-semibold">Reject review</h3>
                <p class="mt-2 text-sm text-muted-foreground">
                    Provide a reason for rejecting
                    <span class="font-medium text-foreground">{{ reviewPendingDecision?.title }}</span>.
                </p>

                <div class="mt-4 space-y-2">
                    <Label for="rejection-reason">Reason</Label>
                    <Textarea id="rejection-reason" v-model="rejectionReason"
                        placeholder="Explain why this review is rejected" />
                </div>

                <div class="mt-6 flex justify-end gap-2">
                    <Button class="cursor-pointer" variant="outline" @click="closeRejectDialog">Cancel</Button>
                    <Button class="cursor-pointer" variant="destructive" @click="submitRejectDecision">
                        Reject review
                    </Button>
                </div>
            </div>
        </div>
    </section>
</template>
