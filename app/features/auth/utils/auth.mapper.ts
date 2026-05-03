import type {
  AuthLoginSessionDTO,
  AuthProfile,
  AuthProfileDTO,
  AuthSession,
} from "~/features/auth/types/auth.types";

export const mapTokenDtoToSession = (
  dto: AuthLoginSessionDTO,
): AuthSession => ({
  accessToken: dto.accessToken,
  refreshToken: dto.refreshToken,
  role: dto.role,
});

export const mapAuthProfileDto = (dto: AuthProfileDTO): AuthProfile => ({
  firstName: dto.firstName,
  lastName: dto.lastName,
  role: dto.role,
  email: dto.email, // Assuming email is added to AuthProfileDTO
});
