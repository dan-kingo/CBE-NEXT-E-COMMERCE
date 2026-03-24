import {
  LayoutDashboard,
  FileText,
  Hospital,
  Boxes,
  ShoppingCart,
  MessageSquare,
  UserCircle2,
} from "lucide-vue-next";
interface PricingPlan {
  name: string;
  price: string;
  subtitle?: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

export interface ProfileData {
  full_name: string;
  role: string;
}
const plans: PricingPlan[] = [
  {
    name: "Starter",
    price: "0/mo",
    subtitle: "(Free Forever)",
    features: [
      "1 Basic Storefront",
      "Drag & Drop Customization",
      "Integrated Quick Stats",
      "2% Transaction Fee",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "$49/mo",
    subtitle: "(Billed annually)",
    features: [
      "5 High-Performance Storefronts",
      "Global Edge Delivery",
      "Full Analytics & Revenue Charts",
      "100+ Payment Gateways",
      "Priority Support",
      "0.5% Transaction Fee",
    ],
    cta: "Select Pro Plan",
    highlighted: true,
    badge: "MOST POPULAR",
  },
  {
    name: "Enterprise",
    price: "Custom Pricing",
    features: [
      "Unlimited Storefronts",
      "Dedicated Account Manager",
      "Custom API Access",
      "SLA Guarantee",
      "0% Transaction Fee",
      "SSO (Single Sign-On)",
    ],
    cta: "Contact Sales",
  },
];
const navLinks = [
  {
    name: "Features",
    path: "#features",
  },
  {
    name: "Pricing",
    path: "pricing",
  },
  {
    name: "Marketplace",
    path: "marketplace",
  },
  {
    name: "Faqs",
    path: "faq",
  },
];

const featureCards = [
  {
    iconName: "lucide:store",
    title: "Beautiful, customizable storefronts that convert.",
    heading: "Powerful Storefront",
    description:
      "Get a holistic view of your operations with our intuitive dashboard, providing real-time insights and analytics to help you make informed decisions.",
  },
  {
    iconName: "lucide:blocks",
    title: "Seamless integration with your existing tools and workflows.",
    heading: "Seamless Integrations",
    description:
      "Get a holistic view of your operations with our intuitive dashboard, providing real-time insights and analytics to help you make informed decisions.",
  },
  {
    iconName: "lucide:bar-chart",
    title: "Comprehensive analytics and reporting to your business.",
    heading: "Comprehensive Analytics",
    description:
      "Get a holistic view of your operations with our intuitive dashboard, providing real-time insights and analytics to help you make informed decisions.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "How quickly can I launch my store?",
    answer:
      "Most teams launch their first storefront in days, not weeks, using our prebuilt sections and integrations.",
  },
  {
    question: "Can I connect my existing payment gateways?",
    answer:
      "Yes. You can connect popular payment providers and manage checkout options from a single dashboard.",
  },
  {
    question: "Is this suitable for international selling?",
    answer:
      "Absolutely. You can run multi-region storefronts with localized experiences, currencies, and performance delivery.",
  },
  {
    question: "Do you provide analytics and reporting?",
    answer:
      "You get built-in analytics for sales, conversion, and customer behavior, plus export options for deeper reporting.",
  },
  {
    question: "Can I upgrade or downgrade plans later?",
    answer:
      "Yes. Plans are flexible, and you can move between tiers as your business requirements change.",
  },
];
const menuItems = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Content", to: "/dashboard/content", icon: FileText },
  { title: "Hospital", to: "/dashboard/hospital", icon: Hospital },
  { title: "Manage Products", to: "/dashboard/manage-products", icon: Boxes },
  { title: "Manage Order", to: "/dashboard/manage-order", icon: ShoppingCart },
  { title: "Messages", to: "/dashboard/messages", icon: MessageSquare },
];
const features = [
  { icon: "lucide:store", label: "Multi-tenant storefronts" },
  { icon: "lucide:bar-chart-2", label: "Analytics & insights" },
  { icon: "lucide:zap", label: "Lightning-fast checkout" },
  { icon: "lucide:shield-check", label: "Secure by default" },
];

const logos = ["CBE Birr", "Telebirr", "Mpesa", "Chapa"];
export { navLinks, featureCards, plans, faqs, menuItems, logos, features };
