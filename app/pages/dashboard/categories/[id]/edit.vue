<script setup lang="ts">
import CategoryManagementView from "~/features/category/components/CategoryManagementView.vue";

const route = useRoute();

const categoryId = computed(() => {
    const id = route.params.id;
    return typeof id === "string" ? id : "";
});

definePageMeta({
    layout: "dashboard",
    alias: ["/categories/:id/edit"],
});
</script>

<template>
    <CategoryManagementView mode="edit" :category-id="categoryId" />
</template>
