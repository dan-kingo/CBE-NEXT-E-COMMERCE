export interface ApiStatusDTO {
  code: number;
  message: string;
}

export interface AuthTokenDTO {
  accessToken: string;
  refreshToken: string;
}

export interface AuthProfileDTO {
  full_name: string;
  role: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export interface AuthProfile {
  fullName: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthStateData {
  session: AuthSession | null;
  profile: AuthProfile | null;
}
