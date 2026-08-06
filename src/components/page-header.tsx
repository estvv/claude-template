import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

/** Icon-badge-styled link back to the page this one was drilled into from. */
export function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Retour"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-sm transition-colors hover:bg-[var(--sidebar-hover)] lg:h-12 lg:w-12"
    >
      <ArrowLeft size={20} />
    </Link>
  );
}

/**
 * "Icon badge + title + description" — the management-page header pattern from
 * docs/DESIGN.md, used on every section that isn't a dashboard hero.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
  backHref,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** When set, shows a back arrow to the page this one was drilled into from. */
  backHref?: string;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {backHref && <BackLink href={backHref} />}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-sm lg:h-12 lg:w-12">
          <Icon size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Dashboard hero: light weight with the key word in bold. */
export function PageHero({
  prefix,
  highlight,
  suffix,
  description,
  action,
}: {
  prefix?: string;
  highlight: string;
  suffix?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-light lg:text-4xl">
          {prefix} <span className="font-bold">{highlight}</span>
          {suffix}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
