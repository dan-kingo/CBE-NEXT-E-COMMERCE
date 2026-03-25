import type { CustomerResponse } from "~/types/admin"
export const customerService = {
    async getAll() {
        const { $api } = useNuxtApp();
        return await $api<CustomerResponse[]>("/users/customers/getAll");
    }

}