<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { loginSchema } from '@/validations/auth.schema'
import { useAuth } from '@/composables/useAuth'

const { login, isLoading } = useAuth()
const toast = useToast()
const { handleSubmit, errors, defineField } = useForm({
    validationSchema: toTypedSchema(loginSchema)
})

const [email] = defineField('email')
const [password] = defineField('password')

const onSubmit = handleSubmit(async (values) => {
    try {
        await login(values)
        toast.success({ message: 'Logged in successfully!' })
        await navigateTo('/dashboard')
    } catch (error: any) {
        const message = error?.data?.message || error?.data?.error || error?.message || error?.message || 'Login failed. Please try again.'
        console.error('Login error:', error)
        toast.error({
            message: message
        })
    }
})

definePageMeta({
    layout: 'auth',
})
</script>


<template>
    <main class="relative min-h-screen w-full overflow-hidden bg-darkbrand text-golden">
        <div
            class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(149,41,142,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(149,41,142,0.16)_1px,transparent_1px)] bg-size-[36px_36px]" />

        <section class="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[0.30fr_0.70fr]">
            <aside
                class="relative flex flex-col justify-between border-b border-brand/40 bg-[linear-gradient(180deg,rgba(149,41,142,0.94)_0%,rgba(1,1,1,1)_100%)] p-7 sm:p-10 lg:border-b-0 lg:border-r lg:border-brand/40 lg:p-12">
                <div class="space-y-10">
                    <div class="flex items-center gap-3">
                        <div
                            class="grid h-10 w-10 place-items-center border border-golden/70 bg-darkbrand/25 text-sm font-bold tracking-wider text-gray-200">
                            CB
                        </div>
                        <p class="text-lg font-semibold tracking-[0.2em] text-gray-200">CBE NEXT</p>
                    </div>

                    <div class="space-y-4">
                        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">Console.</p>
                        <h1 class="max-w-sm text-3xl font-bold leading-tight text-gray-200 sm:text-4xl">Operations</h1>
                        <p class="max-w-md text-sm leading-7 text-slate-300 sm:text-base">
                            Sign in to create and manage categories, tenants and view analytics.
                        </p>
                    </div>
                </div>

                <p class="hidden text-xs tracking-[0.2em] text-golden/70 md:block">Tenant -> Stores -> Products ->
                    Customer -> Orders</p>
            </aside>

            <div class="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
                <Card
                    class="w-full max-w-md border border-brand/60 bg-darkbrand/95 text-golden shadow-[10px_10px_0_rgba(149,41,142,0.35)] sm:p-1">
                    <CardHeader class="space-y-2">
                        <CardTitle class="text-2xl font-bold uppercase tracking-widest text-gray-200 pt-6">Admin Login
                        </CardTitle>
                        <CardDescription class="text-gray-200">
                            Sign in to your account.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form @submit.prevent="onSubmit" class="space-y-6">
                            <div class="space-y-2">
                                <Label for="email"
                                    class="text-xs uppercase tracking-[0.2em] text-gray-200">Email</Label>
                                <Input id="email" name="email" v-model="email" type="email"
                                    placeholder="you@example.com"
                                    class="h-12 border-brand/50 bg-darkbrand/70 text-gray-200 placeholder:text-gray-400 focus-visible:ring-brand" />
                                <span class="text-sm text-red-600">{{ errors.email }}</span>
                            </div>

                            <div class="space-y-2">
                                <Label for="password"
                                    class="text-xs uppercase tracking-[0.2em] text-gray-200">Password</Label>
                                <Input id="password" name="password" v-model="password" type="password"
                                    placeholder="Enter your password"
                                    class="h-12 border-brand/50 bg-darkbrand/70 text-gray-200 placeholder:text-gray-400 focus-visible:ring-brand" />
                                <span class="text-sm text-red-600">{{ errors.password }}</span>
                            </div>

                            <Button v-if="!isLoading"
                                class="h-12 w-full cursor-pointer bg-brand text-white transition hover:bg-brand/90 uppercase"
                                type="submit">
                                Sign In
                            </Button>

                            <Button v-else class="h-12 w-full cursor-not-allowed bg-brand/90 text-golden" disabled>
                                <Icon name="lucide:loader-circle" class="animate-spin" />
                            </Button>

                            <p class="text-center text-sm text-golden/70"></p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </section>
    </main>
</template>
