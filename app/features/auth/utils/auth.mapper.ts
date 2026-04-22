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
  fullName: dto.full_name,
  role: dto.role,
});
