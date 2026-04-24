import { storeToRefs } from "pinia";
import { useSubscriptionStore } from "~/features/subscription/store/subscription.store";

export const useSubscriptionManagement = () => {
  const store = useSubscriptionStore();
  const { isSubmitting, createdPlans, form } = storeToRefs(store);

  return {
    isSubmitting,
    createdPlans,
    form,
    createPlan: store.createPlan,
    resetForm: store.resetForm,
  };
};
