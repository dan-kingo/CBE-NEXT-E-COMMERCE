<script setup lang="ts">
import { adminStatisticsService } from "~/services/adminStatistics.service";
import type {
    AdminOverviewResponse,
    MonthlyRevenuePoint,
    PlanBreakdown,
    TopTenantRevenue,
} from "~/types/dashboard";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();

const {
    data: overview,
    pending,
    error,
    refresh,
} = await useAsyncData<AdminOverviewResponse>("admin-overview", () => {
    return adminStatisticsService.getOverview();
});

watch(error, (value) => {
    if (!value) {
        return;
    }

    toast.error({
        message: getMessageFromUnknown(value),
    });
});

const formatNumber = (value: number) => {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(value);
};

const formatLabel = (value: string) => {
    return value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
};

const overviewCards = computed(() => {
    const stats = overview.value;

    if (!stats) {
        return [];
    }

    return [
        {
            title: "Tenants",
            value: formatNumber(stats.tenants.total),
            detail: `${formatNumber(stats.tenants.newLast30Days)} new in 30 days`,
            icon: "lucide:building-2",
        },
        {
            title: "Customers",
            value: formatNumber(stats.customers.total),
            detail: `${formatNumber(stats.customers.newLast30Days)} new in 30 days`,
            icon: "lucide:users",
        },
        {
            title: "Stores",
            value: formatNumber(stats.stores.total),
            detail: `${formatNumber(stats.stores.byStatus.ACTIVE || 0)} active stores`,
            icon: "lucide:store",
        },
        {
            title: "Products",
            value: formatNumber(stats.products.total),
            detail: `${formatNumber(stats.products.lowStock)} low stock, ${formatNumber(stats.products.outOfStock)} out of stock`,
            icon: "lucide:package",
        },
        {
            title: "Orders",
            value: formatNumber(stats.orders.total),
            detail: `${formatNumber(stats.orders.paidOrFulfilled)} paid or fulfilled`,
            icon: "lucide:shopping-cart",
        },
        {
            title: "Subscriptions",
            value: formatNumber(stats.subscriptions.activeCount),
            detail: `${formatNumber(stats.subscriptions.expiringIn7Days)} expiring in 7 days`,
            icon: "lucide:badge-check",
        },
    ];
});

const maxRevenue = computed(() => {
    const values = overview.value?.revenueByMonth.map((item) => item.total) ?? [];
    return Math.max(...values, 1);
});

const revenueBars = computed(() => overview.value?.revenueByMonth ?? []);
const topTenants = computed(() => overview.value?.topTenantsByRevenue ?? []);
const activePlans = computed(() => overview.value?.subscriptions.activeByPlan ?? []);

const statusRows = computed(() => {
    const stats = overview.value;

    if (!stats) {
        return {
            tenants: [] as Array<[string, number]>,
            stores: [] as Array<[string, number]>,
            orders: [] as Array<[string, number]>,
            products: [] as Array<[string, number]>,
        };
    }

    return {
        tenants: Object.entries(stats.tenants.byStatus),
        stores: Object.entries(stats.stores.byStatus),
        orders: Object.entries(stats.orders.byStatus),
        products: [
            ["Active", stats.products.active],
            ["Low stock", stats.products.lowStock],
            ["Out of stock", stats.products.outOfStock],
        ],
    };
});

const progressWidth = (value: number, maxValue: number) => {
    if (!maxValue) {
        return "0%";
    }

    return `${Math.max(8, Math.round((value / maxValue) * 100))}%`;
};

const topTenantMax = computed(() => {
    const values = topTenants.value.map((item) => item.total);
    return Math.max(...values, 1);
});

const activePlanMax = computed(() => {
    const values = activePlans.value.map((item) => item.activeCount);
    return Math.max(...values, 1);
});
</script>

<template>
    <section class="space-y-6">
        <div class="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
            <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div class="space-y-2">
                    <p class="text-sm uppercase tracking-[0.2em] text-muted-foreground">Admin overview</p>
                    <h1 class="text-3xl font-semibold">Dashboard</h1>
                    <p class="max-w-2xl text-sm text-muted-foreground">
                        A live view of tenants, customers, stores, products, orders, subscriptions, and revenue.
                    </p>
                </div>

                <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover" :disabled="pending"
                    @click="refresh">
                    {{ pending ? "Refreshing..." : "Refresh dashboard" }}
                </Button>
            </div>
        </div>

        <div v-if="pending && !overview" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div v-for="card in 6" :key="card" class="h-28 animate-pulse rounded-2xl border bg-card/60" />
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

            <div class="grid gap-6 xl:grid-cols-2">
                <Card class="border-border/70 bg-card p-5 shadow-sm">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <h2 class="text-xl font-semibold">Revenue by month</h2>
                            <p class="text-sm text-muted-foreground">Monthly revenue trend from the admin overview.</p>
                        </div>
                    </div>

                    <div class="mt-6 space-y-4">
                        <div v-for="point in revenueBars" :key="point.month" class="space-y-2">
                            <div class="flex items-center justify-between text-sm">
                                <span class="font-medium text-foreground">{{ formatLabel(point.month) }}</span>
                                <span class="text-muted-foreground">{{ formatCurrency(point.total) }}</span>
                            </div>
                            <div class="h-3 overflow-hidden rounded-full bg-muted/60">
                                <div class="h-full rounded-full bg-brand transition-all"
                                    :style="{ width: progressWidth(point.total, maxRevenue) }" />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card class="border-border/70 bg-card p-5 shadow-sm">
                    <div>
                        <h2 class="text-xl font-semibold">Top tenants by revenue</h2>
                        <p class="text-sm text-muted-foreground">Leading tenants based on total revenue contribution.
                        </p>
                    </div>

                    <div class="mt-6 space-y-4">
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

                        <p v-if="!topTenants.length" class="py-4 text-sm text-muted-foreground">
                            No revenue data available yet.
                        </p>
                    </div>
                </Card>
            </div>

            <div class="grid gap-6 xl:grid-cols-2">
                <Card class="border-border/70 bg-card p-5 shadow-sm">
                    <h2 class="text-xl font-semibold">Subscription activity</h2>
                    <p class="text-sm text-muted-foreground">Active subscriptions and plan breakdown.</p>

                    <div class="mt-5 grid gap-4 sm:grid-cols-3">
                        <div class="rounded-2xl border bg-muted/20 p-4">
                            <p class="text-xs uppercase tracking-wide text-muted-foreground">Active</p>
                            <p class="mt-2 text-2xl font-semibold">{{ formatNumber(overview.subscriptions.activeCount)
                                }}</p>
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
                </Card>

                <Card class="border-border/70 bg-card p-5 shadow-sm">
                    <h2 class="text-xl font-semibold">Status breakdown</h2>
                    <p class="text-sm text-muted-foreground">Operational status counts across the platform.</p>

                    <div class="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tenants</h3>
                            <div class="mt-3 space-y-2">
                                <div v-for="[label, value] in statusRows.tenants" :key="label"
                                    class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                    <span>{{ formatLabel(label) }}</span>
                                    <span class="font-medium">{{ formatNumber(value) }}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stores</h3>
                            <div class="mt-3 space-y-2">
                                <div v-for="[label, value] in statusRows.stores" :key="label"
                                    class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                    <span>{{ formatLabel(label) }}</span>
                                    <span class="font-medium">{{ formatNumber(value) }}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Orders</h3>
                            <div class="mt-3 space-y-2">
                                <div v-for="[label, value] in statusRows.orders" :key="label"
                                    class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                    <span>{{ formatLabel(label) }}</span>
                                    <span class="font-medium">{{ formatNumber(value) }}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Products
                            </h3>
                            <div class="mt-3 space-y-2">
                                <div v-for="[label, value] in statusRows.products" :key="label"
                                    class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                    <span>{{ label }}</span>
                                    <span class="font-medium">{{ formatNumber(value) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <Card class="border-border/70 bg-card p-5 shadow-sm">
                <h2 class="text-xl font-semibold">Financial summary</h2>
                <p class="text-sm text-muted-foreground">Order revenue and fulfillment metrics from the overview
                    endpoint.</p>

                <div class="mt-5 grid gap-4 md:grid-cols-4">
                    <div class="rounded-2xl border bg-muted/20 p-4">
                        <p class="text-xs uppercase tracking-wide text-muted-foreground">Revenue total</p>
                        <p class="mt-2 text-2xl font-semibold">{{ formatCurrency(overview.orders.revenueTotal) }}</p>
                    </div>
                    <div class="rounded-2xl border bg-muted/20 p-4">
                        <p class="text-xs uppercase tracking-wide text-muted-foreground">Average order value</p>
                        <p class="mt-2 text-2xl font-semibold">{{ formatCurrency(overview.orders.averageOrderValue) }}
                        </p>
                    </div>
                    <div class="rounded-2xl border bg-muted/20 p-4">
                        <p class="text-xs uppercase tracking-wide text-muted-foreground">Paid or fulfilled</p>
                        <p class="mt-2 text-2xl font-semibold">{{ formatNumber(overview.orders.paidOrFulfilled) }}</p>
                    </div>
                    <div class="rounded-2xl border bg-muted/20 p-4">
                        <p class="text-xs uppercase tracking-wide text-muted-foreground">Active plans</p>
                        <p class="mt-2 text-2xl font-semibold">{{
                            formatNumber(overview.subscriptions.activeByPlan.length) }}</p>
                    </div>
                </div>
            </Card>
        </div>

        <Card v-else class="border-border/70 bg-card p-6 shadow-sm">
            <h2 class="text-xl font-semibold">Dashboard unavailable</h2>
            <p class="mt-2 text-sm text-muted-foreground">
                The statistics overview could not be loaded.
            </p>
        </Card>
    </section>
</template>