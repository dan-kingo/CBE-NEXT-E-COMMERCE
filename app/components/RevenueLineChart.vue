<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const props = defineProps<{
    points: Array<{ month: string; total: number }>;
    height?: number;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const formatLabel = (value: string) => {
    return value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
};

const renderChart = () => {
    if (!canvas.value) return;

    const labels = props.points.map((p) => formatLabel(p.month));
    const dataPoints = props.points.map((p) => p.total);

    const data = {
        labels,
        datasets: [
            {
                label: "Revenue",
                data: dataPoints,
                tension: 0.35,
                borderWidth: 3,
                borderColor: "#94298E",
                backgroundColor: "rgba(149,41,142,0.24)",
                pointRadius: 4,
                pointBackgroundColor: "#94298E",
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => {
                        const value = ctx.parsed.y ?? ctx.raw;
                        return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
                    },
                },
            },
        },
        scales: {
            y: {
                ticks: {
                    callback: function (val: any) {
                        return new Intl.NumberFormat(undefined).format(Number(val));
                    },
                },
            },
        },
    } as any;

    if (chart) {
        chart.data = data as any;
        chart.options = options as any;
        chart.update();
        return;
    }

    chart = new Chart(canvas.value.getContext("2d") as CanvasRenderingContext2D, {
        type: "line",
        data: data as any,
        options: options as any,
    });
};

onMounted(() => renderChart());
watch(() => props.points, () => renderChart(), { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
    <div :style="{ height: (props.height || 320) + 'px' }" class="w-full">
        <canvas ref="canvas" />
    </div>
</template>
