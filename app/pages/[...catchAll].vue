<script setup lang="ts">
definePageMeta({
    layout: false
})
</script>

<template>
    <div class="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6">
        <div class="max-w-2xl w-full text-center space-y-8 md:space-y-10">
            <!-- Big 404 with brand accent -->
            <div class="relative">
                <h1
                    class="text-[6rem] md:text-[10rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-brand via-brand/90 to-brand/70 opacity-90">
                    404
                </h1>

                <div
                    class="absolute -top-6 md:-top-12 left-1/2 -translate-x-1/2 w-32 h-32 md:w-48 md:h-48 bg-brand/10 rounded-full blur-3xl -z-10">
                </div>
            </div>

            <div class="space-y-4">
                
                <p class="text-lg md:text-xl text-gray-600 max-w-md mx-auto">
                    Oops! It looks like this page has wandered off or never existed.<br>
                    
                </p>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <button @click="$router.back()"
                    class="group inline-flex items-center gap-2 px-8 py-1.5 bg-brand text-white font-semibold text-lg rounded-md cursor-pointer shadow-lg hover:bg-brand-hover hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2">
                    <Icon name="lucide:arrow-left" class="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    Go Back
                </button>

                <!-- <button @click="$router.back()"
                    class="inline-flex items-center px-8 py-1.5 text-lg font-semibold text-brand border-2 border-brand/30 rounded-md cursor-pointer hover:bg-brand/5 hover:border-brand/50 transition-colors duration-300">
                    Go Back
                </button> -->
            </div>

            
            <div class="pt-8 opacity-80">
                <p class="text-sm text-gray-500 italic">
                    While you're here... maybe the page is just taking a coffee break ☕
                </p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Optional micro-animation for the 404 number */
@keyframes gentleFloat {

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-12px);
    }
}

.animate-float {
    animation: gentleFloat 7s ease-in-out infinite;
}
</style>