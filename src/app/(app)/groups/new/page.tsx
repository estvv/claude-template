import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { CreateGroupForm } from "./create-group-form";

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={Plus}
        title="Créer un groupe"
        description="Tu en seras le propriétaire, et tu pourras inviter tes potes avec un code."
        backHref="/groups"
      />
      <Card className="border-[var(--border-light)] p-5 shadow-none">
        <CreateGroupForm />
      </Card>
    </div>
  );
}
