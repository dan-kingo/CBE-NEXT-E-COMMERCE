import { storeToRefs } from "pinia";
import {
  createTenantSchema,
  type CreateTenantInput,
} from "~/features/tenant/schemas/tenant.schema";
import { tenantService } from "~/features/tenant/services/tenant.service";
import { useTenantStore } from "~/features/tenant/store/tenant.store";
import type { TenantProfileStatus } from "~/features/tenant/types/tenant.types";

export const useTenantManagement = () => {
  const store = useTenantStore();
  const { tenants, isLoading, loaded, pagination } = storeToRefs(store);

  const parsePayload = (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }): CreateTenantInput => {
    const parsed = createTenantSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid tenant data");
    }

    return parsed.data;
  };

  const createTenant = async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }) => {
    const input = parsePayload(payload);
    const created = await tenantService.create(input);
    store.prependTenant(created);
    void store.revalidateTenants({
      page: pagination.value.page,
      size: pagination.value.size,
    });
    return created;
  };

  return {
    tenants,
    isTenantsLoading: isLoading,
    tenantsLoaded: loaded,
    tenantsPagination: pagination,
    loadTenants: store.ensureTenants,
    refreshTenants: store.revalidateTenants,
    updateTenantStatus: store.updateTenantStatus,
    createTenant,
  };
};
