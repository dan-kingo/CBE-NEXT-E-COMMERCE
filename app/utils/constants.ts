import {
  LayoutDashboard,
  Tags,
  UserCog,
  CreditCard,
  Building2,
  Users,
} from "lucide-vue-next";

export interface ProfileData {
  full_name: string;
  role: string;
}

const menuItems = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Manage Categories", to: "/dashboard/categories", icon: Tags },
  { title: "Manage Admins", to: "/dashboard/admins", icon: UserCog },
  {
    title: "Manage Subscriptions",
    to: "/dashboard/subscriptions",
    icon: CreditCard,
  },
  { title: "Manage Tenants", to: "/dashboard/tenants", icon: Building2 },
  { title: "Manage Users", to: "/dashboard/users", icon: Users },
];

export { menuItems };
