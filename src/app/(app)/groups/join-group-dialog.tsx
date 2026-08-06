"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { JoinGroupForm } from "./join-group-form";

export function JoinGroupDialog({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          Rejoindre un groupe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejoindre un groupe</DialogTitle>
          <DialogDescription>
            Demande le code d&apos;invitation à un membre du groupe.
          </DialogDescription>
        </DialogHeader>
        <JoinGroupForm />
      </DialogContent>
    </Dialog>
  );
}
