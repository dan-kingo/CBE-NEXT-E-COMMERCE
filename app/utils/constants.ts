import {
  LayoutDashboard,
  MessageSquare,
  Tags,
  UserCog,
  CreditCard,
  Building2,
} from "lucide-vue-next";

const menuItems = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Manage Categories", to: "/dashboard/categories", icon: Tags },
  { title: "Manage Admin", to: "/dashboard/admin", icon: UserCog },
  {
    title: "Manage Subscriptions",
    to: "/dashboard/subscriptions",
    icon: CreditCard,
  },
  { title: "Manage Tenants", to: "/dashboard/tenants", icon: Building2 },
  { title: "Manage Reviews", to: "/dashboard/reviews", icon: MessageSquare },
];

export { menuItems };
