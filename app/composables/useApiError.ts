const getMessageFromUnknown = (error: unknown) => {
  const fallback = "Something went wrong. Please try again.";

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const e = error as {
    data?: { message?: string; error?: string };
    message?: string;
  };

  return e.data?.message || e.data?.error || e.message || fallback;
};

export const useApiError = () => {
  return {
    getMessageFromUnknown,
  };
};
