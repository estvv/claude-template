"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  currentGroupId as groupIdFromPath,
  globalNav,
  groupNav,
  isActive,
} from "@/components/nav-config";

type Props = {
  groups: { id: string; isOwner: boolean }[];
};

/**
 * Bottom tab bar — the mobile counterpart of the desktop sidebar. Inside a
 * group it exposes that group's sections; outside one it falls back to the
 * global nav. Kept to five entries max so targets stay thumb-sized.
 */
export function MobileNav({ groups }: Props) {
  const pathname = usePathname();
  const groupId = groupIdFromPath(pathname);
  const isOwner = groups.find((g) => g.id === groupId)?.isOwner ?? false;

  const items = groupId ? groupNav(groupId, isOwner).slice(0, 5) : globalNav();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border-light)] bg-[var(--bg-card)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navigation principale"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
              active
                ? "font-medium text-[var(--text-primary)]"
                : "text-[var(--text-muted)]",
            )}
          >
            <Icon size={20} />
            <span className="truncate px-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
