export interface ApiStatusDTO {
  code: number;
  message: string;
}

export interface AuthTokenDTO {
  accessToken: string;
  refreshToken: string;
}

export interface AuthLoginSessionDTO extends AuthTokenDTO {
  role: string;
}

export interface AuthProfileDTO {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  role: string;
}

export interface AuthProfile {
  firstName: string;
  lastName: string;
  email: string;
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
