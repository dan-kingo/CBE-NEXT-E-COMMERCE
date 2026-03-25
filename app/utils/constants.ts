import {
  LayoutDashboard,
  Tags,
  UserCog,
  CreditCard,
  Building2,
} from "lucide-vue-next";

const menuItems = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Manage Categories", to: "/dashboard/categories", icon: Tags },
  { title: "Admin Bootstrap", to: "/dashboard/bootstrap", icon: UserCog },
  {
    title: "Manage Subscriptions",
    to: "/dashboard/subscriptions",
    icon: CreditCard,
  },
  { title: "Manage Tenants", to: "/dashboard/tenants", icon: Building2 },
];

export { menuItems };
