export type StatusTone = "success" | "warning" | "danger";
export type TenantProfileStatus =
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

const statusBadgeClasses: Record<StatusTone, string> = {
  success:
    "!border-transparent !bg-emerald-500/15 !text-emerald-700 dark:!text-emerald-300",
  warning:
    "!border-transparent !bg-amber-500/15 !text-amber-700 dark:!text-amber-300",
  danger: "!border-transparent !bg-red-500/15 !text-red-700 dark:!text-red-300",
};

const statusButtonClasses: Record<StatusTone, string> = {
  success: "!bg-emerald-600 !text-white hover:!bg-emerald-700",
  warning: "!bg-amber-600 !text-white hover:!bg-amber-700",
  danger: "!bg-red-600 !text-white hover:!bg-red-700",
};

export const getStatusBadgeClass = (tone: StatusTone) => {
  return statusBadgeClasses[tone];
};

export const getStatusButtonClass = (tone: StatusTone) => {
  return statusButtonClasses[tone];
};

export const getPlanStatusTone = (active: boolean): StatusTone => {
  return active ? "success" : "danger";
};

export const getPlanToggleTone = (active: boolean): StatusTone => {
  return active ? "warning" : "success";
};

export const getTenantStatusTone = (enabled: boolean): StatusTone => {
  return enabled ? "success" : "danger";
};

export const getTenantProfileStatusTone = (
  status: TenantProfileStatus,
): StatusTone => {
  if (status === "APPROVED" || status === "ACTIVE") {
    return "success";
  }

  if (status === "IN_REVIEW") {
    return "warning";
  }

  return "danger";
};
