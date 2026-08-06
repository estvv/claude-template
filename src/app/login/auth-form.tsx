"use client";

import { useActionState } from "react";
import { login, register, type ActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function CredentialsForm({
  action,
  pending,
  state,
  submitLabel,
  pendingLabel,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  state: ActionState;
  submitLabel: string;
  pendingLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5 text-left">
        <Label htmlFor="username">Nom d&apos;utilisateur</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>

      <div className="space-y-1.5 text-left">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state?.error && (
        <p className="text-xs text-[var(--color-red)]">{state.error}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

export function AuthForm() {
  const [loginState, loginAction, loginPending] = useActionState<
    ActionState,
    FormData
  >(login, null);
  const [registerState, registerAction, registerPending] = useActionState<
    ActionState,
    FormData
  >(register, null);

  return (
    <Tabs defaultValue="login" className="mt-8">
      <TabsList className="w-full">
        <TabsTrigger value="login">Se connecter</TabsTrigger>
        <TabsTrigger value="register">Créer un compte</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="mt-4">
        <CredentialsForm
          action={loginAction}
          pending={loginPending}
          state={loginState}
          submitLabel="Se connecter"
          pendingLabel="Connexion…"
        />
      </TabsContent>

      <TabsContent value="register" className="mt-4">
        <CredentialsForm
          action={registerAction}
          pending={registerPending}
          state={registerState}
          submitLabel="Créer un compte"
          pendingLabel="Création…"
        />
      </TabsContent>
    </Tabs>
  );
}
