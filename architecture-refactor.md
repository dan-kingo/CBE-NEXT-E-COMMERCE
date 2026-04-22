# Frontend Architecture Refactor Guide 

## Purpose

Refactor the existing codebase from a **centralized, non-modular structure** into a **feature-based, scalable architecture** with:

* Feature isolation
* DTO → Domain Model mapping
* Zod validation
* Smart caching (TTL)
* Request deduplication
* Cache invalidation
* Pagination-aware data handling
* Clean data flow

---

## Current Problems (TO FIX)

* ❌ Centralized services, schemas, and stores
* ❌ API calls inside components
* ❌ No caching strategy (refetch on every mount)
* ❌ No request deduplication
* ❌ No cache invalidation after mutations
* ❌ UI tightly coupled to backend response shape
* ❌ Hard to scale and maintain

---

## Target Architecture

### Data Flow (STRICT)

```
UI Component
   ↓
Composable (business orchestration)
   ↓
Store (state + caching)
   ↓
Service (API + validation + mapping)
   ↓
Backend
```

---

## Folder Structure (MANDATORY)

```
/components/
  /ui/
  /shared/

/features/
  /auth/
  /category/
  /template/
  /tenant/
  /admin/
  /subscription/
  /review/

/plugins/
  api.ts

/layouts
  auth.vue
  default.vue
  dashboard.vue

/middlewares

/pages

/composables
  useApiError.ts

/utils/
  cache.ts
  mapper.ts

/types/
  api.ts
```

---

## Feature Structure (STRICT)

Each feature MUST follow:

```
/features/<feature>/
├── components/
├── composables/
├── store/
├── services/
├── schemas/
├── types/
├── utils/
└── index.ts
```

---

## Backend Response Format (GLOBAL)

All API responses:

```json
{
  "status": { "message": "string", "code": number },
  "data": {},
  "token": { "accessToken": "string", "refreshToken": "string" }
}
```

### Rules:

* Only auth endpoints return `token`
* ALWAYS check `status.code`
* NEVER use raw response directly

---

## API Plugin (REQUIRED)

* Attach token from cookies
* Normalize response
* Throw error if `status.code !== 200`

---

## DTO vs Domain Model (MANDATORY)

Each feature MUST define:

### Example

```ts
// types/product.types.ts

// Backend shape
export interface ProductDTO {
  id: string
  title: string
  amount: number
}

// Frontend shape
export interface Product {
  id: string
  name: string
  price: number
}
```

---

## Mapping Layer (REQUIRED)

DTO must be transformed:

```ts
// utils/product.mapper.ts

export function mapProduct(dto: ProductDTO): Product {
  return {
    id: dto.id,
    name: dto.title,
    price: dto.amount
  }
}
```

❗ NEVER expose DTO to UI

---

## Zod Validation (REQUIRED)

Validate ALL API responses:

```ts
const parsed = productSchema.parse(res.data)
```

---

## Store Rules (CRITICAL)

Each store MUST include:

```ts
state: () => ({
  data: [],
  lastFetched: null,
  isFetching: false
})
```

---

## Caching Strategy

### TTL-based caching

```ts
if (!force && isFresh(this.lastFetched, 60000)) return
```

---

## Deduplication

```ts
if (this.isFetching) return
```

---

## Invalidation

Each store MUST have:

```ts
invalidate() {
  this.lastFetched = null
}
```

---

## Mutation Handling

After create/update/delete:

Choose ONE:

### Option A: Optimistic update

```ts
this.items.unshift(newItem)
```

### Option B: Invalidate + refetch

```ts
this.invalidate()
await this.fetchItems(true)
```

---

## Pagination (REQUIRED for list-heavy features)

Example state:

```ts
itemsByPage: Record<number, Item[]>
lastFetchedByPage: Record<number, number>
currentPage: number
```

### Rules:

* Cache per page
* Do not refetch cached pages unless stale
* Support force refresh

---

## Composables Rules

* MUST orchestrate logic
* MUST call store actions
* MUST NOT call API directly
* MUST return UI-ready state

---

## Component Rules

* MUST NOT call API
* MUST NOT contain business logic
* ONLY consume composables

---

## Central Utilities

### cache.ts

* Generic cache helpers (no feature logic)

### mapper.ts

* Generic mapping helpers (no domain knowledge)

---

## Refactor Plan (STEP-BY-STEP)

### Step 1: Identify Features

Group existing code into:

* auth
* category
* template
* tenant
* admin
* subscription
* review

---

### Step 2: Move Files

Move related files into `/features/<feature>/`

---

### Step 3: Split Responsibilities

For each feature:

* Extract service layer
* Extract store
* Extract composables
* Create types (DTO + Model)
* Add Zod schemas
* Add mapper

---

### Step 4: Remove Direct API Calls

Replace all `$fetch` calls in components with composables

---

### Step 5: Add Caching

Update stores:

* add `lastFetched`
* add `isFetching`
* implement TTL logic

---

### Step 6: Add Invalidation

After mutations:

* invalidate cache OR update store

---

### Step 7: Add Deduplication

Prevent duplicate requests via `isFetching`

---

### Step 8: Normalize API Usage

Ensure ALL API calls go through:

* service layer
* validated with Zod
* mapped to domain model

---

## Naming Conventions

* DTO → `ProductDTO`
* Model → `Product`
* Request → `CreateProductRequest`
* Store → `useProductStore`
* Composable → `useProducts`

---

## Anti-Patterns (DO NOT DO)

* ❌ API calls in components
* ❌ Global “god” services
* ❌ Central schema files for all features
* ❌ Using backend response directly in UI
* ❌ Refetching on every mount
* ❌ No cache invalidation after mutation

---

## Expected Outcome

After refactor:

* ✅ Modular feature-based architecture
* ✅ Clean separation of concerns
* ✅ Faster UI (due to caching)
* ✅ Reduced API calls
* ✅ Scalable and maintainable codebase
* ✅ Easier onboarding and extension

---

## Final Rule

> Each feature must be self-contained:
> Removing one feature should not break others.
