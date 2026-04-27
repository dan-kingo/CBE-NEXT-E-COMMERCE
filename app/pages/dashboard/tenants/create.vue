<script setup lang="ts">
import { TenantManagementView } from "~/features/tenant";

definePageMeta({
  layout: "dashboard",
});
</script>

<template>
  <TenantManagementView mode="create" />
</template>
