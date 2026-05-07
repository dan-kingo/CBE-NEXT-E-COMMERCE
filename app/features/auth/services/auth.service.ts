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
    const role = parsed.role ?? parsed.data?.role;
    if (!token) {
      throw new Error("Login response does not include a session.");
    }

    if (!role) {
      throw new Error("Login response does not include a role.");
    }

    return mapTokenDtoToSession({ ...token, role });
  },

  async getMe() {
    const { $api } = useNuxtApp();

    const response = await $api<unknown>("/admins/me");
    const parsed = profileResponseSchema.parse(response);
    assertStatusCode(parsed.status);

    // Handle both response structures: profile at root, nested under data.profile, or data is the profile itself
    let profile = parsed.profile;
    if (!profile && parsed.data) {
      // Check if data is the profile object itself (has firstName, lastName, email, role)
      if (
        "firstName" in parsed.data &&
        "lastName" in parsed.data &&
        "email" in parsed.data
      ) {
        profile = parsed.data;
      } else if ("profile" in parsed.data) {
        profile = (parsed.data as any).profile;
      }
    }

    if (!profile) {
      return null;
    }

    return mapAuthProfileDto(profile);
  },
};
