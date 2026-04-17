import {
  DEFAULT_PAGE_SIZE,
  normalizePaginatedList,
} from "~/services/pagination";
import type {
  CreateTemplateRequest,
  ListQueryParams,
  PaginatedApiResponse,
  TemplatePatchRequest,
  TemplateResponse,
} from "~/types/admin";

interface TemplateListParams extends ListQueryParams {
  tenantId?: string;
}

const tenantHeader = (tenantId?: string) => {
  if (!tenantId) {
    return undefined;
  }

  return {
    "X-Tenant-ID": tenantId,
  };
};

export const templateService = {
  async create(payload: CreateTemplateRequest, tenantId?: string) {
    const { $api } = useNuxtApp();
    return await $api<TemplateResponse>("/templates", {
      method: "POST",
      body: payload,
      headers: tenantHeader(tenantId),
    });
  },

  async getAll(params: TemplateListParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      PaginatedApiResponse<TemplateResponse> | TemplateResponse[]
    >("/templates", {
      query: { page, size },
      headers: tenantHeader(params.tenantId),
    });

    return normalizePaginatedList(response, page, size);
  },

  async getById(id: number, tenantId?: string) {
    const { $api } = useNuxtApp();
    return await $api<TemplateResponse>(`/templates/${id}`, {
      headers: tenantHeader(tenantId),
    });
  },

  async patch(id: number, payload: TemplatePatchRequest, tenantId?: string) {
    const { $api } = useNuxtApp();
    return await $api<TemplateResponse>(`/templates/${id}`, {
      method: "PATCH",
      body: payload,
      headers: tenantHeader(tenantId),
    });
  },

  async remove(id: number, tenantId?: string) {
    const { $api } = useNuxtApp();
    return await $api(`/templates/${id}`, {
      method: "DELETE",
      headers: tenantHeader(tenantId),
    });
  },
};
