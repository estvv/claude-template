"use client";

import { useState, useTransition } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { regenerateInviteCode } from "@/app/(app)/groups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteSection({
  groupId,
  inviteCode,
}: {
  groupId: string;
  inviteCode: string;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // Built client-side: the server has no reliable public origin behind a proxy.
  const inviteUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/join/${inviteCode}`;

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Lien copié");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input readOnly value={inviteUrl} className="font-mono text-xs" />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          Copier
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await regenerateInviteCode(groupId);
              toast.success("Nouveau lien généré — l'ancien ne marche plus.");
            })
          }
        >
          <RefreshCw size={16} />
          Régénérer
        </Button>
      </div>
    </div>
  );
}
