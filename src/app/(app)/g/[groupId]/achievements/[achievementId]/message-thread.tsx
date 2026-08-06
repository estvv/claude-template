"use client";

import { useActionState, useTransition } from "react";
import Image from "next/image";
import { MessageSquare, Trash2 } from "lucide-react";
import { deleteMessage, postMessage, type ActionState } from "../actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { relativeTime } from "@/lib/format";
import { ACCEPTED_UPLOAD_TYPES, mediaKind } from "@/lib/upload-types";

function Attachment({ url }: { url: string }) {
  const shared = "mt-2 rounded-lg border border-[var(--border-light)]";

  switch (mediaKind(url)) {
    case "audio":
      return <audio src={url} controls className={`${shared} w-full`} />;
    case "video":
      return (
        <video src={url} controls className={`${shared} max-h-60 bg-black`} />
      );
    default:
      return (
        <Image
          src={url}
          alt=""
          width={400}
          height={300}
          unoptimized
          className={`${shared} max-h-60 object-contain`}
        />
      );
  }
}

type Message = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: Date;
  userId: string;
  user: { id: string; name: string | null; image: string | null };
};

export function MessageThread({
  groupId,
  achievementId,
  currentUserId,
  groupOwnerId,
  isPlatformAdmin,
  messages,
}: {
  groupId: string;
  achievementId: string;
  currentUserId: string;
  groupOwnerId: string;
  isPlatformAdmin: boolean;
  messages: Message[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    postMessage.bind(null, groupId, achievementId),
    null,
  );
  const [, startTransition] = useTransition();

  return (
    <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare size={16} />
        <p className="text-lg font-semibold">Discussion</p>
      </div>

      {messages.length > 0 && (
        <ul className="mb-4 space-y-4">
          {messages.map((message) => {
            const canDelete =
              message.userId === currentUserId ||
              currentUserId === groupOwnerId ||
              isPlatformAdmin;

            return (
              <li key={message.id} className="group flex gap-2.5">
                <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                  <AvatarImage src={message.user.image ?? undefined} alt="" />
                  <AvatarFallback className="rounded-lg text-[10px]">
                    {(message.user.name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-medium">
                      {message.user.name ?? "Membre"}
                    </span>
                    <span className="ml-2 text-[var(--text-muted)]">
                      {relativeTime(message.createdAt)}
                    </span>
                  </p>
                  {message.body && (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">
                      {message.body}
                    </p>
                  )}
                  {message.imageUrl && (
                    <Attachment url={message.imageUrl} />
                  )}
                </div>

                {canDelete && (
                  <button
                    type="button"
                    aria-label="Supprimer le message"
                    className="shrink-0 self-start p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--color-red)] group-hover:opacity-100"
                    onClick={() =>
                      startTransition(() => {
                        void deleteMessage(groupId, message.id);
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form action={action} className="space-y-2 border-t border-[var(--border-light)] pt-4">
        <Textarea
          name="body"
          rows={2}
          placeholder="Écrire un message…"
          className="resize-none"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            name="image"
            type="file"
            accept={ACCEPTED_UPLOAD_TYPES}
            className="sm:flex-1"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "…" : "Envoyer"}
          </Button>
        </div>
        {state?.error && (
          <p className="text-xs text-[var(--color-red)]">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
