"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut, Shield, ShieldAlert, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentGroupId as groupIdFromPath } from "@/components/nav-config";

type Props = {
  user: { name?: string | null; email?: string | null; image?: string | null };
  isPlatformAdmin: boolean;
  groups: { id: string; name: string }[];
  signOutAction: () => Promise<void>;
};

/** Mobile-only top bar: the sidebar is hidden below `lg`, so profile actions
 *  and group switching need a home. */
export function MobileHeader({
  user,
  isPlatformAdmin,
  groups,
  signOutAction,
}: Props) {
  const pathname = usePathname();
  const groupId = groupIdFromPath(pathname);
  const title = groups.find((g) => g.id === groupId)?.name ?? "Unlocked";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-3 lg:hidden">
      <span className="truncate text-base font-bold">{title}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Menu du compte">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.image ?? undefined} alt="" />
              <AvatarFallback className="rounded-lg bg-[var(--text-primary)] text-[10px] text-white">
                {(user.name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">
              {user.name ?? "Membre"}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {user.email ?? ""}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserRound size={16} />
              Mon profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/groups">
              <LayoutGrid size={16} />
              Mes groupes
            </Link>
          </DropdownMenuItem>
          {isPlatformAdmin && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <Shield size={16} />
                  Administration
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/moderation">
                  <ShieldAlert size={16} />
                  Modération
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action={signOutAction}>
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOut size={16} />
                Se déconnecter
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
