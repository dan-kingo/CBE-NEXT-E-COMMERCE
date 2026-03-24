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
    <Card class="w-full max-w-sm">
        <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
                Enter your email below to login to your account
            </CardDescription>
            
        </CardHeader>
        <CardContent>
            <form @submit.prevent="onSubmit">
                <div class="grid w-full items-center gap-4">
                    <div class="flex flex-col space-y-1.5">
                        <Label for="email">Email</Label>
                        <Input id="email" name="email" v-model="email" type="email" placeholder="m@example.com" />
                        <span class="text-red-500">{{ errors.email }}</span>
                    </div>
                    <div class="flex flex-col space-y-1.5">
                        <div class="flex items-center">
                            <Label for="password">Password</Label>
                            
                        </div>
                        <Input id="password" name="password" v-model="password" type="password"
                            placeholder="Enter your password" />
                        <span class="text-red-500">{{ errors.password }}</span>
                    </div>
                    <Button v-if="!isLoading" class="w-full cursor-pointer bg-brand text-white hover:bg-brand/90"
                        type="submit">
                        Login
                    </Button>

                    <Button v-else class="w-full cursor-not-allowed bg-brand/90 text-white" disabled>
                        <Icon name="lucide:loader-circle" class="animate-spin" />
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
</template>
