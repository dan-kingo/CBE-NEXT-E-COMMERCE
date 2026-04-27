<script setup lang="ts">
import { SubscriptionManagementView } from "~/features/subscription";

const route = useRoute();

const planId = computed(() => {
  const id = route.params.id;
  return typeof id === "string" ? id : "";
});

definePageMeta({
  layout: "dashboard",
});
</script>

<template>
  <SubscriptionManagementView mode="edit" :plan-id="planId" />
</template>
