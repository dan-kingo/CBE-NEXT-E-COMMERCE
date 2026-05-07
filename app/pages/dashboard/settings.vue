<script setup lang="ts">
import { useAuth } from "~/features/auth/composables/useAuth";
import { authService } from "~/features/auth/services/auth.service";
const { profile, fetchProfile } = useAuth();

definePageMeta({
    layout: "dashboard",
});
const activeTab = ref<'profile' | 'password'>('profile');
const toast = useToast();
const isProfileSubmitting = ref(false);
const isPasswordSubmitting = ref(false);

const form = reactive({
    firstName: '',
    lastName: '',
    email: '',
});

const pwd = reactive({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const profileErrors = computed(() => {
    const errors = {
        firstName: '',
        lastName: '',
        email: '',
    };

    if (!form.firstName.trim()) {
        errors.firstName = 'First name is required';
    }

    if (!form.lastName.trim()) {
        errors.lastName = 'Last name is required';
    }

    if (!form.email.trim()) {
        errors.email = 'Email is required';
    } else if (!emailPattern.test(form.email.trim())) {
        errors.email = 'Please enter a valid email address';
    }

    return errors;
});

const hasProfileErrors = computed(() =>
    Boolean(profileErrors.value.firstName || profileErrors.value.lastName || profileErrors.value.email)
);

const passwordErrors = computed(() => {
    const errors = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    };

    if (!pwd.currentPassword.trim()) {
        errors.currentPassword = 'Current password is required';
    }

    if (!pwd.newPassword.trim()) {
        errors.newPassword = 'New password is required';
    } else if (pwd.newPassword.length < 8) {
        errors.newPassword = 'New password must be at least 8 characters';
    }

    if (!pwd.confirmPassword.trim()) {
        errors.confirmPassword = 'Please confirm your new password';
    } else if (pwd.newPassword !== pwd.confirmPassword) {
        errors.confirmPassword = 'New password and confirmation do not match';
    }

    return errors;
});

const hasPasswordErrors = computed(() =>
    Boolean(
        passwordErrors.value.currentPassword ||
        passwordErrors.value.newPassword ||
        passwordErrors.value.confirmPassword
    )
);

onMounted(async () => {
    const p = await fetchProfile(true);
    if (p) {
        form.firstName = p.firstName ?? '';
        form.lastName = p.lastName ?? '';
        form.email = p.email ?? '';
    }
});

const submitProfile = async () => {
    if (hasProfileErrors.value || isProfileSubmitting.value) {
        toast.error({ message: 'Please fix the profile validation errors' });
        return;
    }

    isProfileSubmitting.value = true;

    try {
        const updated = await authService.updateProfile({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
        });

        if (updated) {
            toast.success({ message: 'Profile updated' });
            // refresh profile
            await fetchProfile(true);
        } else {
            toast.error({ message: 'Failed to update profile' });
        }
    } catch (err: any) {
        toast.error({ message: err?.message || 'Failed to update profile' });
    } finally {
        isProfileSubmitting.value = false;
    }
};

const submitPassword = async () => {
    if (hasPasswordErrors.value || isPasswordSubmitting.value) {
        toast.error({ message: 'Please fix the password validation errors' });
        return;
    }

    isPasswordSubmitting.value = true;

    try {
        await authService.changePassword({
            currentPassword: pwd.currentPassword,
            newPassword: pwd.newPassword,
        });
        toast.success({ message: 'Password changed' });
        pwd.currentPassword = '';
        pwd.newPassword = '';
        pwd.confirmPassword = '';
    } catch (err: any) {
        toast.error({ message: err?.message || 'Failed to change password' });
    } finally {
        isPasswordSubmitting.value = false;
    }
};
</script>

<template>
    <div class="space-y-6">
        <Card class="w-full px-6">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-semibold">Settings</h1>
                <div class="space-x-2">
                    <Button :variant="activeTab === 'profile' ? 'default' : 'ghost'" class="cursor-pointer"
                        :class="activeTab === 'profile' ? 'bg-brand text-white hover:bg-brand-hover' : 'hover:bg-brand/10'"
                        @click="activeTab = 'profile'">Profile</Button>
                    <Button :variant="activeTab === 'password' ? 'default' : 'ghost'" class="cursor-pointer"
                        :class="activeTab === 'password' ? 'bg-brand text-white hover:bg-brand-hover' : 'hover:bg-brand/10'"
                        @click="activeTab = 'password'">Change
                        Password</Button>
                </div>
            </div>

            <div class="mt-6">
                <div v-if="activeTab === 'profile'" class="space-y-4">
                    <div>
                        <Label>First name</Label>
                        <Input v-model="form.firstName" />
                        <p v-if="profileErrors.firstName" class="mt-1 text-xs text-red-500">{{ profileErrors.firstName
                        }}</p>
                    </div>
                    <div>
                        <Label>Last name</Label>
                        <Input v-model="form.lastName" />
                        <p v-if="profileErrors.lastName" class="mt-1 text-xs text-red-500">{{ profileErrors.lastName }}
                        </p>
                    </div>
                    <div>
                        <Label>Email</Label>
                        <Input v-model="form.email" type="email" />
                        <p v-if="profileErrors.email" class="mt-1 text-xs text-red-500">{{ profileErrors.email }}</p>
                    </div>

                    <div class="pt-4">
                        <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover"
                            :disabled="hasProfileErrors || isProfileSubmitting" @click="submitProfile">
                            {{ isProfileSubmitting ? 'Saving...' : 'Save Profile' }}
                        </Button>
                    </div>
                </div>

                <div v-else class="space-y-4">
                    <div>
                        <Label>Current password</Label>
                        <Input v-model="pwd.currentPassword" type="password" />
                        <p v-if="passwordErrors.currentPassword" class="mt-1 text-xs text-red-500">{{
                            passwordErrors.currentPassword }}</p>
                    </div>
                    <div>
                        <Label>New password</Label>
                        <Input v-model="pwd.newPassword" type="password" />
                        <p v-if="passwordErrors.newPassword" class="mt-1 text-xs text-red-500">{{
                            passwordErrors.newPassword }}</p>
                    </div>
                    <div>
                        <Label>Confirm new password</Label>
                        <Input v-model="pwd.confirmPassword" type="password" />
                        <p v-if="passwordErrors.confirmPassword" class="mt-1 text-xs text-red-500">{{
                            passwordErrors.confirmPassword }}</p>
                    </div>

                    <div class="pt-4">
                        <Button class="cursor-pointer bg-brand text-white hover:bg-brand-hover"
                            :disabled="hasPasswordErrors || isPasswordSubmitting" @click="submitPassword">
                            {{ isPasswordSubmitting ? 'Updating...' : 'Change Password' }}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    </div>
</template>
