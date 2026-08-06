import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Coins,
  Home,
  LayoutGrid,
  Settings,
  Shield,
  ShieldAlert,
  Target,
  Trophy,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function globalNav(): NavItem[] {
  return [
    { href: "/groups", label: "Mes groupes", icon: LayoutGrid },
    { href: "/leaderboard", label: "Classement global", icon: Trophy },
  ];
}

export function groupNav(groupId: string, isOwner: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: `/g/${groupId}`, label: "Accueil", icon: Home },
    { href: `/g/${groupId}/achievements`, label: "Achievements", icon: Target },
    { href: `/g/${groupId}/bets`, label: "Paris", icon: Coins },
    { href: `/g/${groupId}/leaderboard`, label: "Classement", icon: Trophy },
    { href: `/g/${groupId}/calendar`, label: "Calendrier", icon: CalendarDays },
  ];

  if (isOwner) {
    items.push({
      href: `/g/${groupId}/settings`,
      label: "Paramètres",
      icon: Settings,
    });
  }

  return items;
}

export function adminNav(): NavItem[] {
  return [
    { href: "/admin", label: "Administration", icon: Shield },
    { href: "/admin/moderation", label: "Modération", icon: ShieldAlert },
  ];
}

/** The group being viewed, read off the URL (`/g/<id>/...`). */
export function currentGroupId(pathname: string): string | null {
  return pathname.match(/^\/g\/([^/]+)/)?.[1] ?? null;
}

/** Exact match for index routes, prefix match for their sub-pages. */
export function isActive(pathname: string, href: string): boolean {
  const isGroupHome = /^\/g\/[^/]+$/.test(href);
  if (
    href === "/groups" ||
    href === "/leaderboard" ||
    href === "/admin" ||
    isGroupHome
  ) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
