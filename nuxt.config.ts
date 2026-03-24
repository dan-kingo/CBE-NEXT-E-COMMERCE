// https://nuxt.com/docs/api/configuration/nuxt-config
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
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
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
      title: "CBE Next E-commerce Admin ",
      link: [
        { rel: "icon", type: "image/x-icon", href: "data:," },
        { rel: "shortcut icon", href: "data:," },
        { rel: "apple-touch-icon", href: "data:," },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: "https://bellytalk.onrender.com/api",
    },
  },

  toast: {
    settings: {
      timeout: 3000,
      position: "topRight",
    },
  },
});
