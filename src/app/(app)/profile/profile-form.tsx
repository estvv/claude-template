"use client";

import { useActionState, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { updateProfile, type ActionState } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  user,
}: {
  user: { name: string; image: string | null };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateProfile,
    null,
  );
  const [preview, setPreview] = useState<string | null>(user.image);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative"
          aria-label="Changer la photo de profil"
        >
          <Avatar size="lg" className="h-16 w-16 rounded-full">
            <AvatarImage src={preview ?? undefined} alt="" />
            <AvatarFallback className="text-lg">
              {(user.name || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera size={18} className="text-white" />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Changer la photo
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom affiché</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user.name}
          maxLength={50}
          required
        />
      </div>

      {state?.error && (
        <p className="text-xs text-[var(--color-red)]">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "…" : "Enregistrer"}
      </Button>
    </form>
  );
}
