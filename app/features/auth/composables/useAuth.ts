import { storeToRefs } from "pinia";
import { useAuthStore } from "~/features/auth/store/auth.store";
export const useAuth = () => {
  const store = useAuthStore();
  const { isFetching } = storeToRefs(store);

  const isLoading = computed(() => isFetching.value);

  return {
    isAuthenticated: computed(() => store.isAuthenticated),
    accessToken: computed(() => store.accessToken),
    profile: computed(() => store.profile),
    isLoading,
    login: store.login,
    logout: store.logout,
    fetchProfile: store.fetchProfile,
  };
};
