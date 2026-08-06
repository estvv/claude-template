import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: { group: { select: { id: true, name: true, ownerId: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    isOwner: m.group.ownerId === user.id,
  }));

  async function signOutAction() {
    "use server";
    await signOut({ redirect: false });
    redirect("/login");
  }

  return (
    <>
      <AppSidebar
        user={user}
        isPlatformAdmin={user.isPlatformAdmin}
        groups={groups}
        signOutAction={signOutAction}
      />
      <MobileHeader
        user={user}
        isPlatformAdmin={user.isPlatformAdmin}
        groups={groups}
        signOutAction={signOutAction}
      />

      <main className="min-h-screen px-4 pb-24 pt-6 lg:ml-[var(--sidebar-width)] lg:p-8 lg:pb-8">
        {children}
      </main>

      <MobileNav groups={groups} />
      <Toaster />
    </>
  );
}
