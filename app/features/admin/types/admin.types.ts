export type UserRole = "CUSTOMER" | "TENANT" | "ADMIN";

export interface CreateAdminInput {
  email: string;
  password: string;
}

export interface CreateUserRequest extends CreateAdminInput {
  role: UserRole;
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  tenantId?: string;
  customerId?: string;
  customerFullName?: string;
  customerAddress?: string;
  customerPhoneNumber?: string;
  tenantProfileId?: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  fullName?: string;
}
