<script setup lang="ts">
import CategoryManagementView from "~/features/category/components/CategoryManagementView.vue";

definePageMeta({
  layout: "dashboard",
  alias: ["/categories"],
});
</script>

<template>
  <CategoryManagementView mode="list" />
</template>
