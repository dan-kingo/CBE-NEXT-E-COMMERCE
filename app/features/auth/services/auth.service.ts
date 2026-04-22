import {
  loginResponseSchema,
  profileResponseSchema,
  type LoginInput,
} from "~/features/auth/schemas/auth.schema";
import {
  mapAuthProfileDto,
  mapTokenDtoToSession,
} from "~/features/auth/utils/auth.mapper";

const assertStatusCode = (status?: { code: number; message: string }) => {
  if (status && status.code !== 200) {
    throw new Error(status.message || "Request failed.");
  }
};

export const authService = {
  async login(payload: LoginInput) {
    const { $api } = useNuxtApp();

    const input = payload;
    const response = await $api<unknown>("/auth/login", {
      method: "POST",
      body: input,
    });

    const parsed = loginResponseSchema.parse(response);
    assertStatusCode(parsed.status);

    const token = parsed.token ?? parsed.data?.token;
    if (!token) {
      throw new Error("Login response does not include a session.");
    }

    return mapTokenDtoToSession(token);
  },

  async getMe() {
    const { $api } = useNuxtApp();

    const response = await $api<unknown>("/profile/me");
    const parsed = profileResponseSchema.parse(response);
    assertStatusCode(parsed.status);

    const profile = parsed.profile ?? parsed.data?.profile;
    if (!profile) {
      return null;
    }

    return mapAuthProfileDto(profile);
  },
};
