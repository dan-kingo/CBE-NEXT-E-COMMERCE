import { storeToRefs } from "pinia";

export const useAuth = () => {
  const store = useAuthStore();
  const {  accessToken, isLoading } = storeToRefs(store);

  return {
    
    isAuthenticated: computed(() => !!accessToken.value),
    login: store.login,
    logout: store.logout,
    isLoading,
  };
};
