<script setup lang="ts">
import { adminStatisticsService } from "~/services/adminStatistics.service";
import RevenueLineChart from "~/components/RevenueLineChart.vue";
import type { AdminOverviewResponse } from "~/types/dashboard";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const activeTab = ref<"revenue" | "tenants" | "subscriptions" | "financial" | "status">("revenue");
const activeStatusTab = ref<"tenants" | "stores" | "orders" | "products">("tenants");

const { data: overview, pending, error, refresh } = await useAsyncData<AdminOverviewResponse>(
    "admin-overview",
    () => adminStatisticsService.getOverview(),
);

watch(error, (value) => {
    if (!value) return;
    toast.error({ message: getMessageFromUnknown(value) });
});

const formatNumber = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
const formatLabel = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

const mainTabs = [
    { key: "revenue", label: "Revenue by month" },
    { key: "tenants", label: "Top tenants by revenue" },
    { key: "subscriptions", label: "Subscription activity" },
    { key: "financial", label: "Financial summary" },
    { key: "status", label: "Status breakdown" },
] as const;

const statusTabs = [
    { key: "tenants", label: "Tenants" },
    { key: "stores", label: "Stores" },
    { key: "orders", label: "Orders" },
    { key: "products", label: "Products" },
] as const;

const overviewCards = computed(() => {
    const stats = overview.value;
    if (!stats) return [];
    return [
        { title: "Tenants", value: formatNumber(stats.tenants.total), detail: `${formatNumber(stats.tenants.newLast30Days)} new in 30 days`, icon: "lucide:building-2" },
        { title: "Customers", value: formatNumber(stats.customers.total), detail: `${formatNumber(stats.customers.newLast30Days)} new in 30 days`, icon: "lucide:users" },
        { title: "Stores", value: formatNumber(stats.stores.total), detail: `${formatNumber(stats.stores.byStatus.ACTIVE || 0)} active stores`, icon: "lucide:store" },
        { title: "Products", value: formatNumber(stats.products.total), detail: `${formatNumber(stats.products.lowStock)} low stock, ${formatNumber(stats.products.outOfStock)} out of stock`, icon: "lucide:package" },
        { title: "Orders", value: formatNumber(stats.orders.total), detail: `${formatNumber(stats.orders.paidOrFulfilled)} paid or fulfilled`, icon: "lucide:shopping-cart" },
        { title: "Subscriptions", value: formatNumber(stats.subscriptions.activeCount), detail: `${formatNumber(stats.subscriptions.expiringIn7Days)} expiring in 7 days`, icon: "lucide:badge-check" },
    ];
});

const revenuePoints = computed(() => overview.value?.revenueByMonth ?? []);
const topTenants = computed(() => overview.value?.topTenantsByRevenue ?? []);
const activePlans = computed(() => overview.value?.subscriptions.activeByPlan ?? []);

const statusRows = computed(() => {
    const stats = overview.value;
    if (!stats) return { tenants: [] as Array<[string, number]>, stores: [] as Array<[string, number]>, orders: [] as Array<[string, number]>, products: [] as Array<[string, number]> };
    return {
        tenants: Object.entries(stats.tenants.byStatus),
        stores: Object.entries(stats.stores.byStatus),
        orders: Object.entries(stats.orders.byStatus),
        products: [["Active", stats.products.active], ["Low stock", stats.products.lowStock], ["Out of stock", stats.products.outOfStock]],
    };
});

const progressWidth = (value: number, maxValue: number) => {
    if (!maxValue) return "0%";
    return `${Math.max(8, Math.round((value / maxValue) * 100))}%`;
};

const topTenantMax = computed(() => Math.max(...topTenants.value.map((t) => t.total), 1));
const activePlanMax = computed(() => Math.max(...activePlans.value.map((p) => p.activeCount), 1));

const selectedStatusRows = computed(() => {
    const rows = statusRows.value;
    return { tenants: rows.tenants, stores: rows.stores, orders: rows.orders, products: rows.products };
});
</script>

<template>
    <section class="space-y-6">
        <div class="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
            <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div class="space-y-2">
                    <p class="text-sm uppercase tracking-[0.2em] text-muted-foreground">Admin overview</p>
                    <h1 class="text-3xl font-semibold">Dashboard</h1>
                    <p class="max-w-2xl text-sm text-muted-foreground">A live view of tenants, customers, stores,
                        products, orders, subscriptions, and revenue.</p>
                </div>

                <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover" :disabled="pending"
                    @click="refresh">
                    {{ pending ? "Refreshing..." : "Refresh dashboard" }}
                </Button>
            </div>

            <!-- main tabs moved into the bottom changing card per design request -->
        </div>

        <div v-if="pending && !overview" class="space-y-6">
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Skeleton v-for="card in 6" :key="card" class="h-28 rounded-2xl" />
            </div>

            <Skeleton class="h-90 rounded-3xl" />
            <Skeleton class="h-70 rounded-3xl" />
        </div>

        <div v-else-if="overview" class="space-y-6">
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Card v-for="card in overviewCards" :key="card.title" class="border-border/70 bg-card p-5 shadow-sm">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-sm text-muted-foreground">{{ card.title }}</p>
                            <p class="mt-2 text-3xl font-semibold">{{ card.value }}</p>
                            <p class="mt-1 text-sm text-muted-foreground">{{ card.detail }}</p>
                        </div>
                        <div class="rounded-2xl bg-brand/10 p-3 text-brand">
                            <Icon :name="card.icon" class="size-6" />
                        </div>
                    </div>
                </Card>
            </div>

            <!-- Bottom changing card: tabs live here and swap inner content -->
            <Card class="border-border/70 bg-card p-5 shadow-sm">
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <h2 class="text-xl font-semibold">{{(mainTabs.find((t) => t.key === activeTab) ||
                            mainTabs[0]).label }}</h2>
                        <p class="text-sm text-muted-foreground">
                            {{
                                activeTab === 'revenue'
                                    ? 'Monthly revenue trend from the admin overview.'
                                    : activeTab === 'tenants'
                                        ? 'Leading tenants based on total revenue contribution.'
                                        : activeTab === 'subscriptions'
                                            ? 'Active subscriptions and plan breakdown.'
                                            : activeTab === 'financial'
                                                ? 'Order revenue and fulfillment metrics from the overview endpoint.'
                            : 'Operational status counts across the platform.'
                            }}
                        </p>
                    </div>
                </div>

                <div class="mt-6 flex flex-wrap gap-2">
                    <Button v-for="tab in mainTabs" :key="tab.key" class="cursor-pointer rounded-full" size="sm"
                        :variant="activeTab === tab.key ? 'default' : 'outline'"
                        :class="activeTab === tab.key ? 'bg-brand text-white hover:bg-brand-hover' : 'hover:bg-brand/10'"
                        @click="activeTab = tab.key">
                        {{ tab.label }}
                    </Button>
                </div>

                <div class="mt-6">
                    <div v-if="activeTab === 'revenue'">
                        <RevenueLineChart :points="revenuePoints" :height="320" />
                    </div>

                    <div v-else-if="activeTab === 'tenants'" class="space-y-4">
                        <div v-for="tenant in topTenants" :key="tenant.tenantId" class="space-y-2">
                            <div class="flex items-center justify-between gap-3 text-sm">
                                <div class="min-w-0">
                                    <p class="truncate font-medium text-foreground">{{ tenant.tenantName }}</p>
                                    <p class="text-xs text-muted-foreground">{{ formatCurrency(tenant.total) }}</p>
                                </div>
                                <span class="text-xs text-muted-foreground">{{ formatNumber(tenant.total) }}</span>
                            </div>
                            <div class="h-3 overflow-hidden rounded-full bg-muted/60">
                                <div class="h-full rounded-full bg-emerald-500 transition-all"
                                    :style="{ width: progressWidth(tenant.total, topTenantMax) }" />
                            </div>
                        </div>

                        <p v-if="!topTenants.length" class="py-4 text-sm text-muted-foreground">No revenue data
                            available yet.</p>
                    </div>

                    <div v-else-if="activeTab === 'subscriptions'" class="space-y-4">
                        <div class="mt-5 grid gap-4 sm:grid-cols-3">
                            <div class="rounded-2xl border bg-muted/20 p-4">
                                <p class="text-xs uppercase tracking-wide text-muted-foreground">Active</p>
                                <p class="mt-2 text-2xl font-semibold">{{
                                    formatNumber(overview.subscriptions.activeCount) }}</p>
                            </div>
                            <div class="rounded-2xl border bg-muted/20 p-4">
                                <p class="text-xs uppercase tracking-wide text-muted-foreground">Expiring in 7 days</p>
                                <p class="mt-2 text-2xl font-semibold">{{
                                    formatNumber(overview.subscriptions.expiringIn7Days) }}</p>
                            </div>
                            <div class="rounded-2xl border bg-muted/20 p-4">
                                <p class="text-xs uppercase tracking-wide text-muted-foreground">Expiring in 30 days</p>
                                <p class="mt-2 text-2xl font-semibold">{{
                                    formatNumber(overview.subscriptions.expiringIn30Days) }}</p>
                            </div>
                        </div>

                        <div class="mt-6 space-y-3">
                            <div v-for="plan in activePlans" :key="plan.planId" class="space-y-2">
                                <div class="flex items-center justify-between gap-3 text-sm">
                                    <span class="font-medium">{{ plan.planName }}</span>
                                    <span class="text-muted-foreground">{{ formatNumber(plan.activeCount) }}</span>
                                </div>
                                <div class="h-3 overflow-hidden rounded-full bg-muted/60">
                                    <div class="h-full rounded-full bg-blue-500 transition-all"
                                        :style="{ width: progressWidth(plan.activeCount, activePlanMax) }" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="activeTab === 'financial'" class="space-y-4">
                        <div class="mt-5 grid gap-4 md:grid-cols-4">
                            <div class="rounded-2xl border bg-muted/20 p-4">
                                <p class="text-xs uppercase tracking-wide text-muted-foreground">Revenue total</p>
                                <p class="mt-2 text-2xl font-semibold">{{ formatCurrency(overview.orders.revenueTotal)
                                    }}</p>
                            </div>
                            <div class="rounded-2xl border bg-muted/20 p-4">
                                <p class="text-xs uppercase tracking-wide text-muted-foreground">Average order value</p>
                                <p class="mt-2 text-2xl font-semibold">{{
                                    formatCurrency(overview.orders.averageOrderValue) }}</p>
                            </div>
                            <div class="rounded-2xl border bg-muted/20 p-4">
                                <p class="text-xs uppercase tracking-wide text-muted-foreground">Paid or fulfilled</p>
                                <p class="mt-2 text-2xl font-semibold">{{ formatNumber(overview.orders.paidOrFulfilled)
                                    }}</p>
                            </div>
                            <div class="rounded-2xl border bg-muted/20 p-4">
                                <p class="text-xs uppercase tracking-wide text-muted-foreground">Active plans</p>
                                <p class="mt-2 text-2xl font-semibold">{{
                                    formatNumber(overview.subscriptions.activeByPlan.length) }}</p>
                            </div>
                        </div>
                    </div>

                    <div v-else class="space-y-4">
                        <div class="mt-6 flex flex-wrap gap-2">
                            <Button v-for="tab in statusTabs" :key="tab.key" class="cursor-pointer rounded-full"
                                size="sm" :variant="activeStatusTab === tab.key ? 'default' : 'outline'"
                                :class="activeStatusTab === tab.key ? 'bg-brand text-white hover:bg-brand-hover' : 'hover:bg-brand/10'"
                                @click="activeStatusTab = tab.key">{{ tab.label }}</Button>
                        </div>

                        <div class="mt-6 grid gap-4 sm:grid-cols-2">
                            <div v-for="[label, value] in selectedStatusRows[activeStatusTab]" :key="label"
                                class="rounded-2xl border bg-muted/20 p-4">
                                <p class="text-xs uppercase tracking-wide text-muted-foreground">{{
                                    formatLabel(String(label)) }}</p>
                                <p class="mt-2 text-2xl font-semibold">{{ formatNumber(Number(value)) }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>

        <Card v-else class="border-border/70 bg-card p-6 shadow-sm">
            <h2 class="text-xl font-semibold">Dashboard unavailable</h2>
            <p class="mt-2 text-sm text-muted-foreground">The statistics overview could not be loaded.</p>
        </Card>
    </section>
</template>
