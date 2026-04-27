type ApiStatus = {
  code?: number;
  message?: string;
};

type ApiResponseLike = {
  status?: ApiStatus;
  data?: {
    status?: ApiStatus;
    message?: string;
    error?: string;
  };
  message?: string;
  error?: string;
};

const getMessageFromUnknown = (error: unknown) => {
  const fallback = "Something went wrong. Please try again.";

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const response = error as ApiResponseLike;
  const message =
    response.data?.status?.message ||
    response.status?.message ||
    response.data?.message ||
    response.data?.error ||
    response.message ||
    response.error ||
    fallback;

  console.error("API error:", message, error);

  return message;
};

export const useApiError = () => {
  return {
    getMessageFromUnknown,
  };
};
