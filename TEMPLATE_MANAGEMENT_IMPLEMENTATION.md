# Template Management Implementation Guide (Tenant Scoped)

This guide shows how to implement **Manage Templates** using the same architecture already used for tenant/category/customer management.

## 1) Tenant Management Reference (Current Project)

Use these files as your baseline pattern:

- `app/pages/dashboard/tenants.vue`
  - Page layout, create form, list table, pagination controls, toasts, validation flow.
- `app/services/tenant.service.ts`
  - API contract wrapper (`create`, `getAll`) and pagination normalization.
- `app/stores/adminData.store.ts`
  - Shared admin list state, page cache, in-flight request dedupe, invalidate/revalidate helpers.
- `app/types/admin.ts`
  - Request/response contracts and shared pagination types.
- `app/validations/admin.schema.ts`
  - Zod schema and inferred input type.
- `app/utils/constants.ts`
  - Dashboard sidebar menu item routing.

## 2) Files To Create For Manage Templates

Create:

- `app/services/template.service.ts`

Use existing (already created, but implement fully):

- `app/pages/dashboard/templates.vue`

## 3) Files To Update For Manage Templates

Update these to stay consistent with current structure:

- `app/types/admin.ts`
- `app/validations/admin.schema.ts`
- `app/stores/adminData.store.ts`

Check only if missing route/menu:

- `app/utils/constants.ts` (already has `Manage Templates` route)

## 4) Step-by-Step Implementation

### Step 1: Add Template Types in `app/types/admin.ts`

Add request/response interfaces similar to tenant/category style.

Suggested shape (adjust to your backend contract):

```ts
export interface CreateTemplateRequest {
  tenantId: string;
  code: string;
  name: string;
  subject?: string;
  body: string;
  active?: boolean;
}

export interface UpdateTemplateRequest {
  code?: string;
  name?: string;
  subject?: string;
  body?: string;
  active?: boolean;
}

export interface TemplateResponse {
  id: number;
  tenantId: string;
  code: string;
  name: string;
  subject: string | null;
  body: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Why: all services/pages/stores rely on central type contracts from this file.

### Step 2: Add Template Validation in `app/validations/admin.schema.ts`

Add a Zod schema and inferred input type, same as `tenantSchema` and `subscriptionPlanSchema`.

```ts
export const templateSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  code: z.string().min(1, "Template code is required"),
  name: z.string().min(1, "Template name is required"),
  subject: z.string().optional(),
  body: z.string().min(1, "Template body is required"),
  active: z.boolean().optional(),
});

export type TemplateInput = z.infer<typeof templateSchema>;
```

Why: this keeps form validation and error messages consistent with existing pages.

### Step 3: Create `app/services/template.service.ts`

Match the same style as `tenant.service.ts` and `category.service.ts`.

```ts
import {
  DEFAULT_PAGE_SIZE,
  normalizePaginatedList,
} from "~/services/pagination";
import type {
  CreateTemplateRequest,
  ListQueryParams,
  PaginatedApiResponse,
  TemplateResponse,
  UpdateTemplateRequest,
} from "~/types/admin";

interface TemplateListParams extends ListQueryParams {
  tenantId?: string;
}

export const templateService = {
  async create(payload: CreateTemplateRequest) {
    const { $api } = useNuxtApp();
    return await $api<TemplateResponse>("/templates", {
      method: "POST",
      body: payload,
    });
  },

  async update(id: number, payload: UpdateTemplateRequest) {
    const { $api } = useNuxtApp();
    return await $api<TemplateResponse>(`/templates/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  async remove(id: number) {
    const { $api } = useNuxtApp();
    return await $api(`/templates/${id}`, {
      method: "DELETE",
    });
  },

  async getAll(params: TemplateListParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      PaginatedApiResponse<TemplateResponse> | TemplateResponse[]
    >("/templates", {
      query: {
        tenantId: params.tenantId,
        page,
        size,
      },
    });

    return normalizePaginatedList(response, page, size);
  },
};
```

Why: keeps API logic isolated from page/store and uses shared pagination normalizer.

### Step 4: Extend `app/stores/adminData.store.ts`

Follow tenant/customer pattern exactly:

1. Add state:
   - `templates`
   - `templatesPagination`
   - `templatesPageCache`
   - `templatesLoaded`
   - `isTemplatesLoading`

2. Add in-flight map near other maps:
   - `inFlightTemplatePages`

3. Add actions equivalent to tenant actions:
   - `setTemplatesFromCache`
   - `cacheTemplatesPage`
   - `ensureTemplates(options?: boolean | ListLoadOptions & { tenantId?: string })`
   - `revalidateTemplates(...)`
   - `invalidateTemplates()`
   - optional helper: `prependTemplate(...)` or `upsertTemplate(...)`

4. Ensure cache key includes tenant context.
   - Recommended: `tenantId:page:size`.
   - This avoids mixing template pages across tenants.

5. Optional: include template prefetch in `warmDashboardData()` only if templates are needed on initial dashboard load.

Why: shared store provides one consistent caching/loading model for every management page.

### Step 5: Implement `app/pages/dashboard/templates.vue`

Use the same composition structure as `tenants.vue`:

- `definePageMeta({ layout: "dashboard" })`
- `useToast()` + `useApiError()`
- `storeToRefs(useAdminDataStore())`
- local reactive form
- `templateSchema.safeParse(form)` before submit
- `isSubmitting`, `isInitialLoading`, `pageSummary`
- pagination handlers (`goToPreviousPage`, `goToNextPage`)

Important for tenant scope:

- Read selected tenant from `useAdminContextStore()` (`selectedTenantId`).
- Require tenant selection before create/list request.
- Pass `tenantId` to `ensureTemplates` / service `getAll`.

UI structure to keep consistent:

- Left card: create template form.
- Right card: list table with pagination + status badges.
- Reuse same spacing/typography/classes as other dashboard pages.

### Step 6: Tenant Selection Behavior

`adminContext.store.ts` already has `selectedTenantId`.

Recommended behavior in templates page:

- If no tenant selected:
  - show inline warning/empty-state,
  - disable create button,
  - skip load request.
- If tenant changes:
  - call `loadTemplates(0, true)` to refresh list for new tenant.

### Step 7: Keep Route and Menu Consistent

- Route file exists: `app/pages/dashboard/templates.vue` -> `/dashboard/templates`.
- Menu already includes `Manage Templates` in `app/utils/constants.ts`.

No extra route config needed in Nuxt file-based routing.

### Step 8: Apply Same Blueprint To Any New Management Page

For any new management feature (example: coupons, campaigns, products), always follow this order:

1. Add interfaces in `app/types/admin.ts`.
2. Add Zod schema in `app/validations/admin.schema.ts`.
3. Add API wrapper in `app/services/<entity>.service.ts`.
4. Extend `app/stores/adminData.store.ts` with:
   - state,
   - pagination,
   - cache,
   - in-flight dedupe,
   - ensure/revalidate/invalidate actions.
5. Create page in `app/pages/dashboard/<entity>.vue`.
6. Add menu item in `app/utils/constants.ts`.
7. Keep UX conventions:
   - toasts for success/error,
   - optimistic update only when safe,
   - fallback pagination defaults,
   - graceful empty states.

## 5) Suggested Implementation Checklist

- [ ] Add template request/response types.
- [ ] Add template schema + `TemplateInput`.
- [ ] Create `template.service.ts`.
- [ ] Extend `adminData.store.ts` for templates with tenant-scoped cache key.
- [ ] Implement full templates page form + list + pagination.
- [ ] Connect tenant selector behavior via `selectedTenantId`.
- [ ] Verify menu navigation to `/dashboard/templates`.
- [ ] Test create/list/pagination/switch-tenant behavior.

## 6) Manual Test Flow

1. Open dashboard and go to Manage Templates.
2. Without tenant selected, verify warning/disabled submit.
3. Select tenant A, create template, verify appears in list and success toast.
4. Paginate next/previous and verify summary text.
5. Switch to tenant B, verify list refreshes and does not show tenant A templates.
6. Trigger API failure case and verify toast error handling.

---

If you want, next step can be implementing these code changes directly based on this guide.
