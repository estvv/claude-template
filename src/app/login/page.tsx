import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { AuthForm } from "./auth-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/groups");

  async function signInWithDiscord() {
    "use server";
    await signIn("discord", { redirectTo: "/groups" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-sm">
          <Trophy size={22} />
        </div>

        <h1 className="text-4xl font-light">
          Bienvenue sur <span className="font-bold">Unlocked</span>
        </h1>

        <AuthForm />

        <div className="mt-6 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <div className="h-px flex-1 bg-[var(--border-light)]" />
          ou
          <div className="h-px flex-1 bg-[var(--border-light)]" />
        </div>

        <form action={signInWithDiscord} className="mt-6">
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Se connecter avec Discord
          </Button>
        </form>
      </div>
    </div>
  );
}
