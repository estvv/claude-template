"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  adminNav,
  currentGroupId as groupIdFromPath,
  globalNav,
  groupNav,
  isActive,
  type NavItem,
} from "@/components/nav-config";

type GroupSummary = { id: string; name: string; isOwner: boolean };

type Props = {
  user: { name?: string | null; email?: string | null; image?: string | null };
  isPlatformAdmin: boolean;
  groups: GroupSummary[];
  signOutAction: () => Promise<void>;
};

function SectionHeader({
  label,
  action,
}: {
  label: string;
  action?: { href: string; title: string };
}) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      {action && (
        <Link
          href={action.href}
          title={action.title}
          className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
        >
          <Plus size={14} />
        </Link>
      )}
    </div>
  );
}

function NavLink({
  item,
  active,
  indented = false,
}: {
  item: NavItem;
  active: boolean;
  indented?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        indented && "pl-7",
        active
          ? "bg-[var(--sidebar-active)] font-medium text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]",
      )}
    >
      <Icon size={indented ? 14 : 18} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppSidebar({
  user,
  isPlatformAdmin,
  groups,
  signOutAction,
}: Props) {
  const pathname = usePathname();
  const currentGroupId = groupIdFromPath(pathname);
  const currentGroup = groups.find((g) => g.id === currentGroupId) ?? null;

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[var(--sidebar-width)] flex-col border-r border-[var(--border-light)] bg-[var(--bg-sidebar)] lg:flex">
      <Link
        href="/profile"
        className="flex items-center gap-2.5 px-4 py-4 transition-colors hover:bg-[var(--sidebar-hover)]"
      >
        <Avatar className="h-9 w-9 rounded-lg">
          <AvatarImage src={user.image ?? undefined} alt="" />
          <AvatarFallback className="rounded-lg bg-[var(--text-primary)] text-xs text-white">
            {(user.name ?? "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name ?? "Membre"}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {user.email ?? ""}
          </p>
        </div>
      </Link>

      <hr className="border-[var(--border-light)]" />

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <SectionHeader label="Général" />
        {globalNav().map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}

        {groups.length > 0 && (
          <>
            <SectionHeader
              label="Groupes"
              action={{ href: "/groups/new", title: "Créer un groupe" }}
            />
            {groups.map((group) => (
              <NavLink
                key={group.id}
                item={{
                  href: `/g/${group.id}`,
                  label: group.name,
                  icon: globalNav()[0].icon,
                }}
                active={group.id === currentGroupId}
                indented
              />
            ))}
          </>
        )}

        {currentGroup && (
          <>
            <SectionHeader label={currentGroup.name} />
            {groupNav(currentGroup.id, currentGroup.isOwner).map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
              />
            ))}
          </>
        )}
      </nav>

      <hr className="border-[var(--border-light)]" />

      <div className="px-2 py-2">
        {isPlatformAdmin &&
          adminNav().map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
            />
          ))}
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
          >
            <LogOut size={18} className="shrink-0" />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
