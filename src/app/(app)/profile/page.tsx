import { UserRound } from "lucide-react";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        icon={UserRound}
        title="Mon profil"
        description="Personnalise ton nom et ta photo de profil."
      />
      <Card className="gap-0 border-[var(--border-light)] p-5 shadow-none">
        <ProfileForm user={{ name: user.name ?? "", image: user.image ?? null }} />
      </Card>
    </div>
  );
}
