import type {
  AuthProfile,
  AuthProfileDTO,
  AuthSession,
  AuthTokenDTO,
} from "~/features/auth/types/auth.types";

export const mapTokenDtoToSession = (dto: AuthTokenDTO): AuthSession => ({
  accessToken: dto.accessToken,
  refreshToken: dto.refreshToken,
});

export const mapAuthProfileDto = (dto: AuthProfileDTO): AuthProfile => ({
  firstName: dto.firstName,
  lastName: dto.lastName,
  role: dto.role,
  email: dto.email, // Assuming email is added to AuthProfileDTO
});
