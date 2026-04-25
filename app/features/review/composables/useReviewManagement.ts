import { storeToRefs } from "pinia";
import { useReviewStore } from "~/features/review/store/review.store";

export const useReviewManagement = () => {
  const store = useReviewStore();
  const { reviews, reviewsSummary, pagination, loaded, isLoading } =
    storeToRefs(store);

  return {
    reviews,
    reviewsSummary,
    reviewsPagination: pagination,
    reviewsLoaded: loaded,
    isReviewsLoading: isLoading,
    loadReviews: store.ensureReviews,
    refreshReviews: store.revalidateReviews,
    decideReview: store.decideReview,
    invalidateReviews: store.invalidateReviews,
  };
};
