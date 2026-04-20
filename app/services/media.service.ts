import type { MediaUploadResponse } from "~/types/admin";

export const mediaService = {
  async uploadImage(file: File) {
    const { $api } = useNuxtApp();
    const formData = new FormData();
    formData.append("file", file);

    return await $api<MediaUploadResponse>("/media/files", {
      method: "POST",
      body: formData,
    });
  },
};
