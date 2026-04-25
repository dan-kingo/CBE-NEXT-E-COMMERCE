<script setup lang="ts">
import CategoryManagementView from "~/features/category/components/CategoryManagementView.vue";

definePageMeta({
    layout: "dashboard",
    alias: ["/categories/create"],
});
</script>

<template>
    <CategoryManagementView mode="create" />
</template>
