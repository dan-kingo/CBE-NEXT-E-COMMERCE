import {
  createAdminSchema,
  type CreateAdminSchemaInput,
} from "~/features/admin/schemas/admin.schema";
import { adminService } from "~/features/admin/services/admin.service";
import type {
  CreateUserRequest,
  UserResponse,
} from "~/features/admin/types/admin.types";

export const useAdminManagement = () => {
  const isSubmitting = ref(false);
  const createdAdmin = ref<UserResponse | null>(null);
  const form = reactive<CreateAdminSchemaInput>({
    email: "",
    password: "",
  });

  const createAdmin = async () => {
    const parsed = createAdminSchema.safeParse(form);

    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message || "Invalid admin payload",
      );
    }

    isSubmitting.value = true;

    try {
      const payload: CreateUserRequest = {
        ...parsed.data,
        role: "ADMIN",
      };

      const created = await adminService.createAdmin(payload);
      createdAdmin.value = created;
      form.email = "";
      form.password = "";
      return created;
    } finally {
      isSubmitting.value = false;
    }
  };

  return {
    form,
    isSubmitting,
    createdAdmin,
    createAdmin,
  };
};
