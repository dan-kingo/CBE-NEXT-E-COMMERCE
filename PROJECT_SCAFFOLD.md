# Nuxt 4 Admin Project Scaffold (Structure + Style + Config)

Use this as a blueprint to create a new project with the same architecture and UI style system, without copying current business content.

## 1) Tech Stack

- Nuxt 4 + Vue 3 + TypeScript
- Pinia for state management
- Tailwind CSS v4
- shadcn-nuxt + Reka UI (component primitives)
- Vee-Validate + Zod (forms and validation)
- VueUse utilities
- Lucide icons
- Nuxt fonts + Nuxt icon
- nuxt-toast notifications

## 2) Create Project

```bash
npx nuxi@latest init my-admin-project
cd my-admin-project
npm install
```

## 3) Install Packages

```bash
npm install @nuxt/fonts @nuxt/icon @pinia/nuxt @vee-validate/zod @vueuse/core class-variance-authority clsx lucide-vue-next nuxt-toast reka-ui shadcn-nuxt tailwind-merge vee-validate zod
npm install -D @nuxtjs/tailwindcss tailwindcss tw-animate-css typescript
```

## 4) package.json (example)

```json
{
  "name": "my-admin-project",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare"
  }
}
```

## 5) nuxt.config.ts (template)

```ts
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxtjs/tailwindcss",
    "shadcn-nuxt",
    "@nuxt/icon",
    "@nuxt/fonts",
    "@pinia/nuxt",
    "nuxt-toast",
  ],

  shadcn: {
    prefix: "",
    componentDir: "@/components/ui",
  },

  fonts: {
    families: [{ name: "Outfit", provider: "google" }],
  },

  css: ["@/assets/css/tailwind.css"],

  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],

  app: {
    head: {
      title: "Your Admin App",
      link: [
        { rel: "icon", type: "image/x-icon", href: "data:," },
        { rel: "shortcut icon", href: "data:," },
        { rel: "apple-touch-icon", href: "data:," },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:8080/api",
    },
  },

  toast: {
    settings: {
      timeout: 3000,
      position: "topRight",
    },
  },
});
```

## 6) components.json (shadcn)

```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "new-york",
  "typescript": true,
  "tailwind": {
    "config": "",
    "css": "app/assets/css/tailwind.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "composables": "@/composables"
  },
  "registries": {}
}
```

## 7) app/assets/css/tailwind.css (style foundation)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-brand: "Outfit", sans-serif;
  --font-heading: "Carter One", sans-serif;

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-button: var(--button);
  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-golden: var(--golden);
  --color-darkbrand: var(--darkbrand);
}

:root {
  --radius: 0.625rem;

  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);

  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);

  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);

  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);

  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);

  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);

  --button: #00dc82;
  --brand: #95298e;
  --brand-hover: #95298e80;
  --golden: #a47b58;
  --darkbrand: #010101;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
  }
}

html {
  scroll-behavior: smooth;
}
```

## 8) tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" }
  ]
}
```

## 9) Folder Structure (scaffold only)

```text
my-admin-project/
  app/
    app.vue
    assets/
      css/
        tailwind.css
      img/
    components/
      dashboard/
        DashboardSidebar.vue
      ui/
        accordion/
        badge/
        button/
        card/
        input/
        input-group/
        label/
        separator/
        sheet/
        sidebar/
        skeleton/
        textarea/
        tooltip/
    composables/
      useApiError.ts
      useAuth.ts
    layouts/
      auth.vue
      dashboard.vue
      default.vue
    lib/
      utils.ts
    middleware/
      auth.global.ts
    pages/
      [...catchAll].vue
      index.vue
      dashboard/
        admin.vue
        categories.vue
        index.vue
        subscriptions.vue
        tenants.vue
    plugins/
      api.ts
    services/
      auth.service.ts
      adminBootstrap.service.ts
      category.service.ts
      customer.service.ts
      subscriptionPlan.service.ts
      tenant.service.ts
      pagination.ts
    stores/
      auth.store.ts
      adminContext.store.ts
      adminData.store.ts
      bootstrap.store.ts
    types/
      admin.ts
    utils/
      constants.ts
    validations/
      auth.schema.ts
      admin.schema.ts

  public/
    robots.txt

  components.json
  nuxt.config.ts
  package.json
  tsconfig.json
  README.md
  .env.example
```

## 10) Optional .env.example

```env
NUXT_PUBLIC_API_BASE=http://localhost:8080/api
```

## 11) Initialize shadcn components

```bash
npx shadcn-vue@latest init
```

Then add the UI primitives you need, for example:

```bash
npx shadcn-vue@latest add button input card badge sheet sidebar
```
