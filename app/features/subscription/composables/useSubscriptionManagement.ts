import { storeToRefs } from "pinia";
import { useSubscriptionStore } from "~/features/subscription/store/subscription.store";

export const useSubscriptionManagement = () => {
  const store = useSubscriptionStore();
  const {
    isLoading,
    isSubmitting,
    plans,
    pagination,
    statsByPlanId,
    searchQuery,
    activeFilter,
    form,
  } = storeToRefs(store);

  return {
    isLoading,
    isSubmitting,
    plans,
    pagination,
    statsByPlanId,
    searchQuery,
    activeFilter,
    form,
    loadPlans: store.loadPlans,
    createPlan: store.createPlan,
    updatePlan: store.updatePlan,
    togglePlanActive: store.togglePlanActive,
    loadPlanStats: store.loadPlanStats,
    resetForm: store.resetForm,
  };
};
