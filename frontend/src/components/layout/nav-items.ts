import { Bell, LayoutGrid, Settings, Star } from "lucide-react";

export const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export type NavItem = (typeof navItems)[number];
